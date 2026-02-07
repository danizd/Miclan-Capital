// ===========================
// CONFIGURACIÓN GLOBAL
// ===========================
const CONFIG = {
    CSV_FILE: 'datos.csv',
    ROWS_PER_PAGE: 50,
    TOP_CATEGORIES: 10,
    CHART_COLORS: {
        income: '#10b981',
        expense: '#ef4444',
        savings: '#6366f1',
        balance: '#3b82f6',
        categories: [
            '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b',
            '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1'
        ]
    }
};

// ===========================
// ESTADO GLOBAL
// ===========================
let state = {
    rawData: [],
    filteredData: [],
    vacationsData: [],
    currentPage: 1,
    filters: {
        dateFrom: null,
        dateTo: null,
        accounts: [],
        categories: [],
        movementType: 'all'
    },
    charts: {}
};

// ===========================
// UTILIDADES
// ===========================
const utils = {
    // Parsear importe europeo a número
    parseAmount: (str) => {
        if (!str || str === '') return 0;
        return parseFloat(str.replace(/\./g, '').replace(',', '.'));
    },

    // Formatear número a euros
    formatEuro: (num) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(num);
    },

    // Formatear fecha
    formatDate: (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[0]}/${parts[1]}/${parts[2]}`;
        }
        return dateStr;
    },

    // Parsear fecha DD/MM/YYYY a objeto Date
    parseDate: (dateStr) => {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return null;
    },

    // Obtener año y mes de fecha
    getYearMonth: (dateStr) => {
        const date = utils.parseDate(dateStr);
        if (!date) return null;
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },

    // Obtener año
    getYear: (dateStr) => {
        const date = utils.parseDate(dateStr);
        return date ? date.getFullYear() : null;
    },

    // Debounce para búsqueda
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ===========================
// CARGA DE DATOS
// ===========================
async function loadData(fileContent = null) {
    try {
        let mainCsv;

        if (fileContent) {
            mainCsv = fileContent;
        } else {
            // Estrategia de carga dinámica (Orden de prioridad)
            const filesToTry = ['datos.csv', 'Cuentas_casa+elena2015-2025.csv', 'datos_ejemplo.csv', 'Vacaciones.csv'];

            for (const fileName of filesToTry) {
                try {
                    // Cache busting para asegurar que lee el archivo más reciente tras cambios en Docker/Volúmenes
                    const response = await fetch(`${fileName}?t=${Date.now()}`, { cache: 'no-store' });

                    if (response.ok) {
                        mainCsv = await response.text();
                        console.log(`Cargado exitosamente: ${fileName}`);

                        const subtitle = document.querySelector('.header-subtitle');
                        if (subtitle) {
                            if (fileName === 'datos_ejemplo.csv') {
                                subtitle.textContent = 'Mostrando datos de ejemplo (archivo real no encontrado)';
                            } else {
                                subtitle.textContent = `Archivo cargado: ${fileName}`;
                            }
                        }
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!mainCsv) throw new Error('No se pudo encontrar ningún archivo CSV');
        }

        // Carga robusta para Vacaciones con encoding UTF-8
        let vacationsCsv = "";
        try {
            const responseVac = await fetch('Vacaciones.csv');
            if (responseVac.ok) {
                const bufferVac = await responseVac.arrayBuffer();
                const decoder = new TextDecoder('utf-8');
                vacationsCsv = decoder.decode(bufferVac);
            }
        } catch (e) {
            console.warn('Vacations.csv not found');
        }

        // Prometificar Papa.parse para manejo más limpio
        const parseCSV = (csv) => new Promise((resolve) => {
            if (!csv) return resolve([]);
            Papa.parse(csv, {
                header: true,
                delimiter: ';',
                skipEmptyLines: true,
                complete: (results) => resolve(results.data)
            });
        });

        const [mainData, vacationsData] = await Promise.all([
            parseCSV(mainCsv),
            parseCSV(vacationsCsv)
        ]);

        processData(mainData);
        if (vacationsData.length > 0) {
            processVacationsData(vacationsData);
        }

        hideLoading();
        initializeApp();

    } catch (error) {
        console.error('Error loading CSVs:', error);
        alert('Error al cargar los datos. Por favor, selecciona un archivo CSV válido usando el botón "Cargar CSV".');
        hideLoading();
        document.getElementById('app').style.display = 'block'; // Mostrar app aunque esté vacío para permitir cargar
    }
}

// ===========================
// PROCESAMIENTO DE DATOS
// ===========================
// Procesar datos de vacaciones
// Procesar datos de vacaciones (Robusto)
function processVacationsData(data) {
    if (!data || data.length === 0) return;

    // Detectar nombres reales de columnas
    const keys = Object.keys(data[0]);
    const yearKey = keys.find(k => k.trim().match(/^(A|a)(ñ|n|)o$/i)) || keys[0];
    const destKey = keys.find(k => k.toLowerCase().includes('dest')) || keys[1];
    const costKey = keys.find(k => k.toLowerCase().includes('cost')) || keys[2];

    console.log('Columnas Vacaciones:', { yearKey, destKey, costKey });

    state.vacationsData = data.map(row => {
        const y = parseInt(row[yearKey]);
        const c = utils.parseAmount(row[costKey]);
        return {
            year: y,
            destination: row[destKey] || 'Desconocido',
            cost: c
        };
    }).filter(r => !isNaN(r.year) && r.cost >= 0);

    console.log('Vacaciones procesadas:', state.vacationsData);
}

function processData(data) {
    state.rawData = data.map(row => {
        const amount = utils.parseAmount(row['Importe']);
        const saldo = utils.parseAmount(row['Saldo']);

        return {
            fechaContable: row['Fecha contable'],
            fechaValor: row['Fecha valor'],
            concepto: row['Concepto'] || '',
            conceptoAmpliado: row['Concepto ampliado'] || '',
            importe: amount,
            importeAbs: Math.abs(amount),
            moneda: row['Moneda'] || 'EUR',
            saldo: saldo,
            categoria: row['Categoria'] || 'Sin categoría',
            subcategoria: row['Subcategoria'] || '',
            cuenta: row['cuenta'] || 'Sin cuenta',
            tipo: amount >= 0 ? 'income' : 'expense',
            año: utils.getYear(row['Fecha contable']),
            mes: utils.getYearMonth(row['Fecha contable'])
        };
    }).filter(row => row.fechaContable && row.importe !== 0 && row.año < 2026);

    // Ordenar por fecha descendente
    state.rawData.sort((a, b) => {
        const dateA = utils.parseDate(a.fechaContable);
        const dateB = utils.parseDate(b.fechaContable);
        return dateB - dateA;
    });

    state.filteredData = [...state.rawData];

    // Inicializar filtros con datos disponibles
    initializeFilters();
}

// ===========================
// INICIALIZACIÓN DE FILTROS
// ===========================
function initializeFilters() {
    // Obtener cuentas únicas
    const accounts = [...new Set(state.rawData.map(d => d.cuenta))].sort();
    const accountFilters = document.getElementById('account-filters');

    accounts.forEach(account => {
        const label = document.createElement('label');
        label.className = 'radio-label';
        label.innerHTML = `
            <input type="checkbox" value="${account}" checked>
            <span>${account}</span>
        `;
        accountFilters.appendChild(label);
    });

    // Obtener categorías únicas
    const categories = [...new Set(state.rawData.map(d => d.categoria))].sort();
    const categoryFilter = document.getElementById('category-filter');

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        option.selected = true;
        categoryFilter.appendChild(option);
    });

    // Establecer rango de fechas
    const dates = state.rawData.map(d => utils.parseDate(d.fechaContable)).filter(d => d);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');

    dateFrom.value = minDate.toISOString().split('T')[0];
    dateTo.value = maxDate.toISOString().split('T')[0];

    state.filters.dateFrom = minDate;
    state.filters.dateTo = maxDate;
    state.filters.accounts = accounts;
    state.filters.categories = categories;
}

// ===========================
// APLICAR FILTROS
// ===========================
function applyFilters() {
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const selectedAccounts = Array.from(document.querySelectorAll('#account-filters input:checked')).map(cb => cb.value);
    const selectedCategories = Array.from(document.getElementById('category-filter').selectedOptions).map(opt => opt.value);
    const movementType = document.querySelector('input[name="movement-type"]:checked').value;

    state.filters.dateFrom = dateFrom ? new Date(dateFrom) : null;
    state.filters.dateTo = dateTo ? new Date(dateTo) : null;
    state.filters.accounts = selectedAccounts;
    state.filters.categories = selectedCategories;
    state.filters.movementType = movementType;

    state.filteredData = state.rawData.filter(row => {
        const rowDate = utils.parseDate(row.fechaContable);

        // Filtro de fecha
        if (state.filters.dateFrom && rowDate < state.filters.dateFrom) return false;
        if (state.filters.dateTo && rowDate > state.filters.dateTo) return false;

        // Filtro de cuenta
        if (!state.filters.accounts.includes(row.cuenta)) return false;

        // Filtro de categoría
        if (!state.filters.categories.includes(row.categoria)) return false;

        // Filtro de tipo de movimiento
        if (movementType === 'income' && row.tipo !== 'income') return false;
        if (movementType === 'expense' && row.tipo !== 'expense') return false;

        return true;
    });

    state.currentPage = 1;
    updateDashboard();
}

// ===========================
// ACTUALIZAR DASHBOARD
// ===========================
function updateDashboard() {
    updateKPIs();
    updateCharts();
    updateInsights();
    updateTable();
}

// ===========================
// ACTUALIZAR KPIs
// ===========================
function updateKPIs() {
    const income = state.filteredData.filter(d => d.tipo === 'income').reduce((sum, d) => sum + d.importe, 0);
    const expenses = state.filteredData.filter(d => d.tipo === 'expense').reduce((sum, d) => sum + Math.abs(d.importe), 0);
    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income * 100).toFixed(1) : 0;

    // Calcular saldo actual (suma del último saldo de cada cuenta)
    const lastBalanceByAccount = {};
    let latestDate = null;

    state.filteredData.forEach(row => {
        // Como los datos están ordenados por fecha desc, la primera vez que
        // encontramos una cuenta, es su movimiento más reciente
        if (lastBalanceByAccount[row.cuenta] === undefined) {
            lastBalanceByAccount[row.cuenta] = row.saldo;

            // Guardar la fecha más reciente encontrada
            const rowDate = utils.parseDate(row.fechaContable);
            if (!latestDate || rowDate > latestDate) {
                latestDate = rowDate;
            }
        }
    });

    const balance = Object.values(lastBalanceByAccount).reduce((sum, val) => sum + val, 0);
    const balanceDate = latestDate ? utils.formatDate(latestDate.toLocaleDateString('es-ES')) : '';

    document.getElementById('kpi-income').textContent = utils.formatEuro(income);
    document.getElementById('kpi-expense').textContent = utils.formatEuro(expenses);
    document.getElementById('kpi-savings').textContent = utils.formatEuro(savings);

    // Guardar el valor real del saldo y mostrar ofuscado si está oculto
    const balanceElement = document.getElementById('kpi-balance');
    balanceElement.setAttribute('data-real-value', utils.formatEuro(balance));
    if (balanceElement.getAttribute('data-hidden') === 'true') {
        balanceElement.textContent = '€•••••';
    } else {
        balanceElement.textContent = utils.formatEuro(balance);
    }

    document.getElementById('kpi-income-period').textContent = `${state.filteredData.filter(d => d.tipo === 'income').length} movimientos`;
    document.getElementById('kpi-expense-period').textContent = `${state.filteredData.filter(d => d.tipo === 'expense').length} movimientos`;
    document.getElementById('kpi-savings-rate').textContent = `Tasa de ahorro: ${savingsRate}%`;
    document.getElementById('kpi-balance-date').textContent = `Actualizado: ${balanceDate}`;
}

// ===========================
// ACTUALIZAR GRÁFICOS
// ===========================
function updateCharts() {
    updateExpensesByCategoryChart();
    updateIncomeVsExpenseChart();
    updateTemporalEvolutionChart();
    updateMonthlySavingsChart();
    updateBalanceByAccountChart();
    updateBalanceEvolutionChart();
    updateSpecificCharts(); // Nuevos gráficos específicos
    updateSalariesChart();
    updateVacationsSection();
}

// Gráfico: Gastos por Categoría (Pie)
function updateExpensesByCategoryChart() {
    const ctx = document.getElementById('expenses-by-category-chart');

    // Agrupar gastos por categoría
    const expensesByCategory = {};
    state.filteredData.filter(d => d.tipo === 'expense').forEach(row => {
        expensesByCategory[row.categoria] = (expensesByCategory[row.categoria] || 0) + row.importeAbs;
    });

    // Ordenar y tomar top 10
    const sorted = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
    const top10 = sorted.slice(0, CONFIG.TOP_CATEGORIES);
    const others = sorted.slice(CONFIG.TOP_CATEGORIES).reduce((sum, [, val]) => sum + val, 0);

    const labels = top10.map(([cat]) => cat);
    const data = top10.map(([, val]) => val);

    if (others > 0) {
        labels.push('Otros');
        data.push(others);
    }

    if (state.charts.expensesByCategory) {
        state.charts.expensesByCategory.destroy();
    }

    state.charts.expensesByCategory = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CONFIG.CHART_COLORS.categories,
                borderWidth: 2,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#cbd5e1',
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = utils.formatEuro(context.parsed);
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Gráfico: Gastos Detallados por Categoría (Barra Horizontal)
function updateIncomeVsExpenseChart() {
    const ctx = document.getElementById('income-vs-expense-chart');

    // Agrupar solo gastos por categoría
    const categoryData = {};
    state.filteredData.forEach(row => {
        if (row.tipo === 'expense') {
            categoryData[row.categoria] = (categoryData[row.categoria] || 0) + row.importeAbs;
        }
    });

    // Ordenar por gasto descendente
    const sorted = Object.entries(categoryData)
        .map(([cat, val]) => ({ cat, val }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 10);

    const labels = sorted.map(d => d.cat);
    const expenseData = sorted.map(d => d.val);

    if (state.charts.incomeVsExpense) {
        state.charts.incomeVsExpense.destroy();
    }

    state.charts.incomeVsExpense = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gastos',
                    data: expenseData,
                    backgroundColor: CONFIG.CHART_COLORS.expense,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${utils.formatEuro(context.parsed.x)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: '#334155' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                }
            }
        }
    });
}

// Gráfico: Evolución Temporal
function updateTemporalEvolutionChart() {
    const ctx = document.getElementById('temporal-evolution-chart');
    const view = document.getElementById('temporal-view').value;

    // Agrupar por mes o año
    const grouped = {};
    state.filteredData.forEach(row => {
        const key = view === 'monthly' ? row.mes : row.año;
        if (!key) return;

        if (!grouped[key]) {
            grouped[key] = { income: 0, expense: 0 };
        }

        if (row.tipo === 'income') {
            grouped[key].income += row.importe;
        } else {
            grouped[key].expense += row.importeAbs;
        }
    });

    const sorted = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sorted.map(([key]) => key);
    const incomeData = sorted.map(([, data]) => data.income);
    const expenseData = sorted.map(([, data]) => data.expense);
    const savingsData = sorted.map(([, data]) => data.income - data.expense);

    if (state.charts.temporalEvolution) {
        state.charts.temporalEvolution.destroy();
    }

    state.charts.temporalEvolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: incomeData,
                    borderColor: CONFIG.CHART_COLORS.income,
                    backgroundColor: CONFIG.CHART_COLORS.income + '20',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Gastos',
                    data: expenseData,
                    borderColor: CONFIG.CHART_COLORS.expense,
                    backgroundColor: CONFIG.CHART_COLORS.expense + '20',
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Ahorro',
                    data: savingsData,
                    borderColor: CONFIG.CHART_COLORS.savings,
                    backgroundColor: CONFIG.CHART_COLORS.savings + '20',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#cbd5e1' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${utils.formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8', maxRotation: 45 },
                    grid: { color: '#334155' }
                },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => utils.formatEuro(value)
                    },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Gráfico: Ahorro Mensual
function updateMonthlySavingsChart() {
    const ctx = document.getElementById('monthly-savings-chart');

    // Agrupar por mes
    const grouped = {};
    state.filteredData.forEach(row => {
        if (!row.mes) return;
        if (!grouped[row.mes]) {
            grouped[row.mes] = { income: 0, expense: 0 };
        }
        if (row.tipo === 'income') {
            grouped[row.mes].income += row.importe;
        } else {
            grouped[row.mes].expense += row.importeAbs;
        }
    });

    const sorted = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sorted.map(([key]) => key);
    const savingsData = sorted.map(([, data]) => data.income - data.expense);
    const colors = savingsData.map(val => val >= 0 ? CONFIG.CHART_COLORS.income : CONFIG.CHART_COLORS.expense);

    if (state.charts.monthlySavings) {
        state.charts.monthlySavings.destroy();
    }

    state.charts.monthlySavings = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ahorro',
                data: savingsData,
                backgroundColor: colors,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Ahorro: ${utils.formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8', maxRotation: 45 },
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => utils.formatEuro(value)
                    },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Gráfico: Saldo por Cuenta
function updateBalanceByAccountChart() {
    const ctx = document.getElementById('balance-by-account-chart');

    // Obtener último saldo de cada cuenta
    const accountBalances = {};
    state.filteredData.forEach(row => {
        if (!accountBalances[row.cuenta] || utils.parseDate(row.fechaContable) > utils.parseDate(accountBalances[row.cuenta].fecha)) {
            accountBalances[row.cuenta] = {
                saldo: row.saldo,
                fecha: row.fechaContable
            };
        }
    });

    const labels = Object.keys(accountBalances);
    const data = Object.values(accountBalances).map(d => d.saldo);

    if (state.charts.balanceByAccount) {
        state.charts.balanceByAccount.destroy();
    }

    state.charts.balanceByAccount = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Saldo',
                data: data,
                backgroundColor: CONFIG.CHART_COLORS.balance,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Saldo: ${utils.formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => utils.formatEuro(value)
                    },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Gráfico: Evolución del Saldo por Cuenta
function updateBalanceEvolutionChart() {
    const ctx = document.getElementById('balance-evolution-chart');

    // Agrupar por cuenta y mes
    const accounts = [...new Set(state.filteredData.map(d => d.cuenta))];
    const datasets = accounts.map((account, index) => {
        const accountData = state.filteredData.filter(d => d.cuenta === account);

        // Agrupar por mes y obtener último saldo
        const monthlyBalances = {};
        accountData.forEach(row => {
            if (!row.mes) return;
            if (!monthlyBalances[row.mes] || utils.parseDate(row.fechaContable) > utils.parseDate(monthlyBalances[row.mes].fecha)) {
                monthlyBalances[row.mes] = {
                    saldo: row.saldo,
                    fecha: row.fechaContable
                };
            }
        });

        const sorted = Object.entries(monthlyBalances).sort((a, b) => a[0].localeCompare(b[0]));

        return {
            label: account,
            data: sorted.map(([month, data]) => ({ x: month, y: data.saldo })),
            borderColor: CONFIG.CHART_COLORS.categories[index % CONFIG.CHART_COLORS.categories.length],
            backgroundColor: CONFIG.CHART_COLORS.categories[index % CONFIG.CHART_COLORS.categories.length] + '20',
            fill: false,
            tension: 0.4,
            borderWidth: 2
        };
    });

    if (state.charts.balanceEvolution) {
        state.charts.balanceEvolution.destroy();
    }

    state.charts.balanceEvolution = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#cbd5e1' }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${utils.formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { color: '#94a3b8', maxRotation: 45 },
                    grid: { color: '#334155' }
                },
                y: {
                    ticks: {
                        color: '#94a3b8',
                        callback: (value) => utils.formatEuro(value)
                    },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

function updateSpecificCharts() {
    updateSupermarketChart();
    updateHouseholdChart();
    updateSpecificKPIs();
}

// Actualizar KPIs de medias mensuales
function updateSpecificKPIs() {
    // Función auxiliar para calcular media mensual
    const calculateMonthlyMean = (keywords) => {
        const monthlyTotals = {};

        state.filteredData.forEach(row => {
            if (row.tipo !== 'expense' || !row.mes) return;
            const text = (row.concepto + ' ' + row.categoria + ' ' + row.subcategoria).toLowerCase();

            // Verificar si coincide con alguna keyword
            const match = keywords.some(k => text.includes(k));

            if (match) {
                monthlyTotals[row.mes] = (monthlyTotals[row.mes] || 0) + row.importeAbs;
            }
        });

        const months = Object.keys(monthlyTotals).length;
        if (months === 0) return 0;

        const total = Object.values(monthlyTotals).reduce((a, b) => a + b, 0);
        return total / months;
    };

    // Calcular medias
    const avgSuper = calculateMonthlyMean(['supermercado', 'mercadona', 'carrefour', 'lidl', 'dia ', 'alcampo', 'eroski', 'consum']);
    const avgFuel = calculateMonthlyMean(['gasoil', 'gasolina', 'combustible', 'repsol', 'cepsa', 'bp ', 'galp', 'petrol']);
    const avgCommunity = calculateMonthlyMean(['comunidad']);

    // Actualizar DOM
    document.getElementById('avg-supermarket').textContent = `${utils.formatEuro(avgSuper)}/mes`;
    document.getElementById('avg-fuel').textContent = `${utils.formatEuro(avgFuel)}/mes`;
    document.getElementById('avg-community').textContent = `${utils.formatEuro(avgCommunity)}/mes`;
}

// Gráfico: Supermercado (Anual)
function updateSupermarketChart() {
    const ctx = document.getElementById('supermarket-chart');

    const yearlyData = {};
    const keywords = ['supermercado', 'mercadona', 'carrefour', 'lidl', 'dia ', 'alcampo', 'eroski', 'consum'];

    state.filteredData.forEach(row => {
        if (row.tipo !== 'expense') return;
        const text = (row.categoria + ' ' + row.concepto).toLowerCase();

        if (keywords.some(k => text.includes(k))) {
            const year = row.año;
            yearlyData[year] = (yearlyData[year] || 0) + row.importeAbs;
        }
    });

    const sorted = Object.entries(yearlyData).sort((a, b) => a[0].localeCompare(b[0]));
    const labels = sorted.map(([y]) => y);
    const data = sorted.map(([, v]) => v);

    if (state.charts.supermarket) {
        state.charts.supermarket.destroy();
    }

    state.charts.supermarket = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Gasto Supermercado',
                data: data,
                backgroundColor: '#10b981', // Green
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Total: ${utils.formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: {
                    ticks: { color: '#94a3b8', callback: (val) => utils.formatEuro(val) },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Gráfico: Hogar (Mensual - Comunidad e Hipoteca)
function updateHouseholdChart() {
    const ctx = document.getElementById('household-chart');
    const targetCategories = ['comunidad', 'hipoteca'];

    const monthlyData = {};

    state.filteredData.forEach(row => {
        if (!row.mes) return;
        const cat = row.categoria.toLowerCase();

        const matchedCat = targetCategories.find(c => cat.includes(c));

        if (row.tipo === 'expense' && matchedCat) {
            if (!monthlyData[row.mes]) {
                monthlyData[row.mes] = { 'comunidad': 0, 'hipoteca': 0 };
            }

            let key = matchedCat.includes('comunidad') ? 'comunidad' : 'hipoteca';
            monthlyData[row.mes][key] += row.importeAbs;
        }
    });

    const sortedMonths = Object.keys(monthlyData).sort();

    const datasets = [
        {
            label: 'Hipoteca',
            data: sortedMonths.map(m => monthlyData[m].hipoteca),
            backgroundColor: '#ef4444', // Red
            stack: 'Stack 0'
        },
        {
            label: 'Comunidad',
            data: sortedMonths.map(m => monthlyData[m].comunidad),
            backgroundColor: '#3b82f6', // Blue
            stack: 'Stack 0',
            borderRadius: { topLeft: 6, topRight: 6 }
        }
    ];

    if (state.charts.household) {
        state.charts.household.destroy();
    }

    state.charts.household = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedMonths,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#cbd5e1' } },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${utils.formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8', maxRotation: 45 },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    ticks: { color: '#94a3b8', callback: (val) => utils.formatEuro(val) },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Gráfico: Salarios (Dani vs Elena)
function updateSalariesChart() {
    const ctx = document.getElementById('salaries-chart');
    if (!ctx) return;

    const yearlyData = {};
    const keywords = ['nomina', 'nómina', 'salario', 'sueldo', 'ingr'];

    state.filteredData.forEach(row => {
        // Solo ingresos
        if (row.tipo !== 'income' || !row.año) return;

        const text = (row.categoria + ' ' + row.concepto).toLowerCase();
        if (!text.includes('nomina') && !text.includes('nómina') && !text.includes('salario') && !text.includes('sueldo')) return;

        const year = row.año;
        if (!yearlyData[year]) yearlyData[year] = { dani: 0, elena: 0 };

        const account = row.cuenta.toLowerCase();
        if (account.includes('casa') || account.includes('dani')) {
            yearlyData[year].dani += row.importe;
        } else if (account.includes('elena')) {
            yearlyData[year].elena += row.importe;
        }
    });

    const years = Object.keys(yearlyData).sort();

    // Dataset Dani
    const dataDani = years.map(y => yearlyData[y].dani);
    // Dataset Elena
    const dataElena = years.map(y => yearlyData[y].elena);

    if (state.charts.salaries) {
        state.charts.salaries.destroy();
    }

    state.charts.salaries = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Dani (Casa + Dani)',
                    data: dataDani,
                    backgroundColor: '#3b82f6', // Blue
                    stack: 'Stack 0'
                },
                {
                    label: 'Elena',
                    data: dataElena,
                    backgroundColor: '#ec4899', // Pink
                    stack: 'Stack 0',
                    borderRadius: { topLeft: 6, topRight: 6 }
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { labels: { color: '#cbd5e1' } },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${utils.formatEuro(context.parsed.y)}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                y: {
                    stacked: true,
                    ticks: { color: '#94a3b8', callback: (val) => utils.formatEuro(val) },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// Gráfico: Vacaciones (Gasto Total Anual)
function updateVacationsSection() {
    const ctx = document.getElementById('vacations-breakdown-chart');
    if (!ctx) return;

    // Obtener años únicos ordenados
    const years = [...new Set(state.vacationsData.map(d => d.year))].sort((a, b) => a - b);

    // Calcular totales por año y preparar detalles
    const totals = years.map(year => {
        return state.vacationsData
            .filter(d => d.year === year)
            .reduce((sum, d) => sum + d.cost, 0);
    });

    if (state.charts.vacationsBreakdown) {
        state.charts.vacationsBreakdown.destroy();
    }

    state.charts.vacationsBreakdown = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Gasto Total',
                data: totals,
                backgroundColor: '#06b6d4', // Cyan
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Total: ${utils.formatEuro(context.parsed.y)}`,
                        afterBody: (context) => {
                            const year = context[0].label;
                            const destinations = state.vacationsData.filter(d => d.year == year);
                            if (destinations.length === 0) return [];

                            destinations.sort((a, b) => b.cost - a.cost);

                            return ['----------------', ...destinations.map(d =>
                                `• ${d.destination}: ${utils.formatEuro(d.cost)}`
                            )];
                        }
                    },
                    padding: 12,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { display: false }
                },
                y: {
                    ticks: { color: '#94a3b8', callback: (val) => utils.formatEuro(val) },
                    grid: { color: '#334155' }
                }
            }
        }
    });
}

// ===========================
// ACTUALIZAR INSIGHTS
// ===========================
function updateInsights() {
    updateTopExpenses();
    updateRecurringExpenses();
    updateAlerts();
}

function updateTopExpenses() {
    const container = document.getElementById('top-expenses-list');
    const topExpenses = state.filteredData
        .filter(d => d.tipo === 'expense')
        .sort((a, b) => b.importeAbs - a.importeAbs)
        .slice(0, 10);

    container.innerHTML = topExpenses.map(expense => `
        <div class="insight-item">
            <div class="insight-item-header">
                <span class="insight-item-title">${expense.concepto || expense.categoria}</span>
                <span class="insight-item-value negative">${utils.formatEuro(expense.importe)}</span>
            </div>
            <div class="insight-item-meta">
                ${expense.fechaContable} • ${expense.categoria} • ${expense.cuenta}
            </div>
        </div>
    `).join('');
}

function updateRecurringExpenses() {
    const container = document.getElementById('recurring-expenses-list');

    // Identificar gastos recurrentes (misma categoría, similar importe)
    const categoryMonthly = {};
    state.filteredData.filter(d => d.tipo === 'expense').forEach(row => {
        if (!row.mes) return;
        const key = `${row.categoria}`;
        if (!categoryMonthly[key]) {
            categoryMonthly[key] = [];
        }
        categoryMonthly[key].push(row.importeAbs);
    });

    const recurring = Object.entries(categoryMonthly)
        .filter(([, amounts]) => amounts.length >= 3)
        .map(([category, amounts]) => {
            const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            return { category, frequency: amounts.length, average: avg };
        })
        .sort((a, b) => b.average - a.average)
        .slice(0, 10);

    container.innerHTML = recurring.map(item => `
        <div class="insight-item">
            <div class="insight-item-header">
                <span class="insight-item-title">${item.category}</span>
                <span class="insight-item-value negative">${utils.formatEuro(item.average)}/mes</span>
            </div>
            <div class="insight-item-meta">
                Frecuencia: ${item.frequency} veces
            </div>
        </div>
    `).join('');
}

function updateAlerts() {
    const container = document.getElementById('alerts-list');
    const alerts = [];

    // Calcular media y desviación estándar de gastos
    const expenses = state.filteredData.filter(d => d.tipo === 'expense').map(d => d.importeAbs);
    if (expenses.length > 0) {
        const mean = expenses.reduce((a, b) => a + b, 0) / expenses.length;
        const variance = expenses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / expenses.length;
        const stdDev = Math.sqrt(variance);
        const threshold = mean + (2 * stdDev);

        // Gastos inusuales
        const unusualExpenses = state.filteredData
            .filter(d => d.tipo === 'expense' && d.importeAbs > threshold)
            .slice(0, 5);

        unusualExpenses.forEach(expense => {
            alerts.push({
                type: 'warning',
                title: 'Gasto inusual detectado',
                description: `${expense.concepto || expense.categoria}: ${utils.formatEuro(expense.importe)}`,
                date: expense.fechaContable
            });
        });
    }

    // Verificar ahorro negativo en últimos meses
    const recentMonths = {};
    state.filteredData.forEach(row => {
        if (!row.mes) return;
        if (!recentMonths[row.mes]) {
            recentMonths[row.mes] = { income: 0, expense: 0 };
        }
        if (row.tipo === 'income') {
            recentMonths[row.mes].income += row.importe;
        } else {
            recentMonths[row.mes].expense += row.importeAbs;
        }
    });

    const sortedMonths = Object.entries(recentMonths).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3);
    sortedMonths.forEach(([month, data]) => {
        const savings = data.income - data.expense;
        if (savings < 0) {
            alerts.push({
                type: 'danger',
                title: 'Ahorro negativo',
                description: `En ${month} gastaste más de lo que ingresaste`,
                date: month
            });
        }
    });

    if (alerts.length === 0) {
        container.innerHTML = '<div class="insight-item"><div class="insight-item-title">✅ No hay alertas</div></div>';
    } else {
        container.innerHTML = alerts.map(alert => `
            <div class="insight-item">
                <div class="insight-item-header">
                    <span class="insight-item-title">${alert.title}</span>
                </div>
                <div class="insight-item-meta">
                    ${alert.description} • ${alert.date}
                </div>
            </div>
        `).join('');
    }
}

// ===========================
// ACTUALIZAR TABLA
// ===========================
function updateTable() {
    const tbody = document.getElementById('transactions-tbody');
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const sortBy = document.getElementById('sort-by').value;

    // Filtrar por búsqueda
    let data = state.filteredData.filter(row => {
        if (!searchTerm) return true;
        return row.concepto.toLowerCase().includes(searchTerm) ||
            row.categoria.toLowerCase().includes(searchTerm) ||
            row.subcategoria.toLowerCase().includes(searchTerm);
    });

    // Ordenar
    switch (sortBy) {
        case 'date-desc':
            data.sort((a, b) => utils.parseDate(b.fechaContable) - utils.parseDate(a.fechaContable));
            break;
        case 'date-asc':
            data.sort((a, b) => utils.parseDate(a.fechaContable) - utils.parseDate(b.fechaContable));
            break;
        case 'amount-desc':
            data.sort((a, b) => b.importeAbs - a.importeAbs);
            break;
        case 'amount-asc':
            data.sort((a, b) => a.importeAbs - b.importeAbs);
            break;
        case 'category':
            data.sort((a, b) => a.categoria.localeCompare(b.categoria));
            break;
    }

    // Paginación
    const totalPages = Math.ceil(data.length / CONFIG.ROWS_PER_PAGE);
    const start = (state.currentPage - 1) * CONFIG.ROWS_PER_PAGE;
    const end = start + CONFIG.ROWS_PER_PAGE;
    const pageData = data.slice(start, end);

    // Renderizar filas
    tbody.innerHTML = pageData.map(row => `
        <tr>
            <td>${utils.formatDate(row.fechaContable)}</td>
            <td>${row.concepto}</td>
            <td>${row.categoria}</td>
            <td>${row.subcategoria}</td>
            <td>${row.cuenta}</td>
            <td class="${row.tipo === 'income' ? 'amount-positive' : 'amount-negative'}">
                ${utils.formatEuro(row.importe)}
            </td>
            <td>${utils.formatEuro(row.saldo)}</td>
        </tr>
    `).join('');

    // Actualizar info de paginación
    document.getElementById('page-info').textContent = `Página ${state.currentPage} de ${totalPages || 1}`;
    document.getElementById('showing-info').textContent = `Mostrando ${start + 1}-${Math.min(end, data.length)} de ${data.length} registros`;

    // Habilitar/deshabilitar botones
    document.getElementById('prev-page').disabled = state.currentPage === 1;
    document.getElementById('next-page').disabled = state.currentPage >= totalPages;
}

// ===========================
// PRIVACIDAD DEL SALDO
// ===========================
function toggleBalancePrivacy() {
    const balanceElement = document.getElementById('kpi-balance');
    const isHidden = balanceElement.getAttribute('data-hidden') === 'true';
    const realValue = balanceElement.getAttribute('data-real-value');

    if (isHidden) {
        // Mostrar el valor real
        balanceElement.textContent = realValue;
        balanceElement.setAttribute('data-hidden', 'false');
    } else {
        // Ocultar el valor
        balanceElement.textContent = '€•••••';
        balanceElement.setAttribute('data-hidden', 'true');
    }
}

// ===========================
// EVENT LISTENERS
// ===========================
function setupEventListeners() {
    // Filtros
    document.getElementById('date-from').addEventListener('change', applyFilters);
    document.getElementById('date-to').addEventListener('change', applyFilters);
    document.getElementById('category-filter').addEventListener('change', applyFilters);

    document.querySelectorAll('#account-filters input').forEach(cb => {
        cb.addEventListener('change', applyFilters);
    });

    document.querySelectorAll('input[name="movement-type"]').forEach(radio => {
        radio.addEventListener('change', applyFilters);
    });

    // Reset filtros
    document.getElementById('reset-filters').addEventListener('click', () => {
        initializeFilters();
        document.querySelectorAll('#account-filters input').forEach(cb => cb.checked = true);
        document.querySelectorAll('#category-filter option').forEach(opt => opt.selected = true);
        document.querySelector('input[name="movement-type"][value="all"]').checked = true;
        applyFilters();
    });

    // Toggle privacidad del saldo
    document.getElementById('kpi-balance-card').addEventListener('click', toggleBalancePrivacy);

    // Búsqueda en tabla
    document.getElementById('search-input').addEventListener('input', utils.debounce(() => {
        state.currentPage = 1;
        updateTable();
    }, 300));

    // Ordenamiento
    document.getElementById('sort-by').addEventListener('change', updateTable);

    // Paginación
    document.getElementById('prev-page').addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            updateTable();
        }
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredData.length / CONFIG.ROWS_PER_PAGE);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            updateTable();
        }
    });

    // Carga de archivo CSV local (Dinámico)
    const uploadBtn = document.getElementById('upload-btn');
    const csvUpload = document.getElementById('csv-upload');

    uploadBtn.addEventListener('click', () => csvUpload.click());

    csvUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            // Reiniciar estado y cargar nuevos datos
            state.rawData = [];
            state.filteredData = [];
            document.getElementById('account-filters').innerHTML = '';
            document.getElementById('category-filter').innerHTML = '';

            // Actualizar subtítulo
            const subtitle = document.querySelector('.header-subtitle');
            if (subtitle) subtitle.textContent = `Archivo cargado: ${file.name}`;

            loadData(content);
        };
        reader.readAsText(file);
    });

    // Vista temporal
    document.getElementById('temporal-view').addEventListener('change', () => {
        updateTemporalEvolutionChart();
    });

    // Exportar
    // document.getElementById('export-btn').addEventListener('click', exportAllData);
    document.getElementById('export-table-btn').addEventListener('click', exportTableData);

    // Refresh
    document.getElementById('refresh-btn').addEventListener('click', () => {
        location.reload();
    });
}

// ===========================
// EXPORTAR DATOS
// ===========================
function exportAllData() {
    const csv = Papa.unparse(state.filteredData.map(row => ({
        'Fecha': row.fechaContable,
        'Concepto': row.concepto,
        'Categoría': row.categoria,
        'Subcategoría': row.subcategoria,
        'Cuenta': row.cuenta,
        'Importe': row.importe,
        'Saldo': row.saldo
    })));

    downloadCSV(csv, 'datos_financieros.csv');
}

function exportTableData() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const data = state.filteredData.filter(row => {
        if (!searchTerm) return true;
        return row.concepto.toLowerCase().includes(searchTerm) ||
            row.categoria.toLowerCase().includes(searchTerm);
    });

    const csv = Papa.unparse(data.map(row => ({
        'Fecha': row.fechaContable,
        'Concepto': row.concepto,
        'Categoría': row.categoria,
        'Subcategoría': row.subcategoria,
        'Cuenta': row.cuenta,
        'Importe': row.importe,
        'Saldo': row.saldo
    })));

    downloadCSV(csv, 'tabla_filtrada.csv');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// ===========================
// INICIALIZACIÓN
// ===========================
function hideLoading() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

function initializeApp() {
    setupEventListeners();
    updateDashboard();
}

// ===========================
// INICIO
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

