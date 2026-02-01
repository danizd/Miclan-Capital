// ===========================
// CONFIGURACIÓN Y UTILIDADES
// ===========================
const CONFIG = {
    CHART_COLORS: {
        categories: [
            '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
            '#3b82f6', '#06b6d4', '#14b8a6', '#84cc16', '#f97316',
            '#ef4444', '#a855f7', '#22d3ee', '#facc15', '#fb923c'
        ]
    }
};

const utils = {
    parseAmount(str) {
        if (!str) return 0;
        let cleaned = str.toString().replace(/[€\s]/g, '');
        // If it contains a comma, assume it's the decimal separator (Spanish format)
        // Remove all dots (thousands separators) and replace comma with dot
        if (cleaned.includes(',')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        }
        return parseFloat(cleaned) || 0;
    },

    formatEuro(num) {
        if (num === null || num === undefined || isNaN(num)) return '€0,00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(num);
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return `${parts[0]}/${parts[1]}/${parts[2]}`;
        }
        return dateStr;
    },

    parseDate(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
    },

    debounce(func, wait) {
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
// ESTADO DE LA APLICACIÓN
// ===========================
const comprasState = {
    allData: [],
    filteredData: [],
    currentPage: 1,
    rowsPerPage: 20,
    charts: {}
};

// ===========================
// CARGA DE DATOS
// ===========================
async function loadComprasOnlineData() {
    const years = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const allCompras = [];
    let loadedYears = [];
    let failedYears = [];

    console.log('🔄 Iniciando carga de datos de compras...');

    for (const year of years) {
        try {
            console.log(`📂 Cargando ${year}.csv...`);

            // Intentar diferentes rutas posibles
            const possiblePaths = [
                `Compras-online/${year}.csv`,
                `./Compras-online/${year}.csv`,
                `/Compras-online/${year}.csv`
            ];

            let response = null;
            let successPath = null;

            for (const path of possiblePaths) {
                try {
                    const testResponse = await fetch(path);
                    if (testResponse.ok) {
                        response = testResponse;
                        successPath = path;
                        break;
                    }
                } catch (e) {
                    // Continuar con la siguiente ruta
                }
            }

            if (!response || !response.ok) {
                console.warn(`⚠️ No se pudo cargar ${year}.csv en ninguna ruta`);
                failedYears.push(year);
                continue;
            }

            console.log(`✓ Encontrado en: ${successPath}`);

            const text = await response.text();

            if (!text || text.trim().length === 0) {
                console.warn(`⚠️ ${year}.csv está vacío`);
                failedYears.push(year);
                continue;
            }

            const result = Papa.parse(text, {
                header: false,
                skipEmptyLines: true
            });

            if (!result || !result.data || result.data.length === 0) {
                console.warn(`⚠️ No se pudieron parsear datos de ${year}.csv`);
                failedYears.push(year);
                continue;
            }

            const rows = result.data;
            let headerRowIndex = -1;
            const colMap = {
                producto: -1,
                fecha: -1,
                tienda: -1,
                estado: -1,
                precio: -1,
                precioSinOferta: -1
            };

            // Find header row dynamically
            for (let i = 0; i < Math.min(rows.length, 10); i++) {
                try {
                    const rowNormalized = rows[i].map(cell => cell ? cell.toString().trim().toLowerCase() : '');

                    // Check if this row looks like a header (must contain at least 'producto' and 'fecha')
                    if (rowNormalized.includes('producto') && (rowNormalized.includes('fecha') || rowNormalized.includes('precio'))) {
                        headerRowIndex = i;

                        // Map columns
                        rowNormalized.forEach((cell, index) => {
                            if (cell === 'producto') colMap.producto = index;
                            else if (cell === 'fecha') colMap.fecha = index;
                            else if (cell === 'tienda') colMap.tienda = index;
                            else if (cell === 'estado') colMap.estado = index;
                            else if (cell === 'precio') colMap.precio = index;
                            else if (cell === 'precio sin oferta') colMap.precioSinOferta = index;
                        });
                        break;
                    }
                } catch (headerError) {
                    console.warn(`Error procesando fila ${i} de ${year}.csv:`, headerError);
                }
            }

            if (headerRowIndex === -1) {
                console.warn(`⚠️ No se encontró la fila de cabecera en ${year}.csv`);
                failedYears.push(year);
                continue;
            }

            console.log(`✓ Cabecera encontrada en fila ${headerRowIndex} de ${year}.csv`);
            let itemsLoaded = 0;

            // Process rows after header
            for (let i = headerRowIndex + 1; i < rows.length; i++) {
                try {
                    const row = rows[i];

                    // Skip if row doesn't have enough columns or key data
                    if (!row || row.length < 2) continue;

                    const producto = colMap.producto !== -1 ? row[colMap.producto]?.trim() : null;
                    const precioStr = colMap.precio !== -1 ? row[colMap.precio]?.trim() : null;

                    // Skip rows that don't look like valid product entries (e.g. totals or empty lines)
                    // Note: older files might miss 'fecha', so we default it if missing but require producto and precio
                    if (!producto || !precioStr) continue;

                    // Default date to 01/01/YEAR if missing
                    let fecha = colMap.fecha !== -1 ? row[colMap.fecha]?.trim() : null;
                    if (!fecha || fecha === '') {
                        fecha = `01/01/${year}`;
                    }

                    const tienda = colMap.tienda !== -1 ? (row[colMap.tienda]?.trim() || 'Sin tienda') : 'Sin tienda';
                    const estado = colMap.estado !== -1 ? (row[colMap.estado]?.trim() || 'Recibido') : 'Recibido';
                    const precioSinOfertaStr = colMap.precioSinOferta !== -1 ? row[colMap.precioSinOferta]?.trim() : '';

                    allCompras.push({
                        id: `${year}-${allCompras.length}`,
                        producto,
                        fecha,
                        tienda,
                        estado,
                        precio: utils.parseAmount(precioStr),
                        precioSinOferta: precioSinOfertaStr ? utils.parseAmount(precioSinOfertaStr) : 0,
                        year,
                        source: 'csv'
                    });
                    itemsLoaded++;
                } catch (rowError) {
                    console.warn(`Error procesando fila ${i} de ${year}.csv:`, rowError);
                }
            }

            console.log(`✅ ${year}.csv cargado: ${itemsLoaded} productos`);
            loadedYears.push(year);

        } catch (error) {
            console.error(`❌ Error cargando ${year}.csv:`, error);
            failedYears.push(year);
        }
    }

    // Load 2026 data from localStorage
    try {
        const data2026 = JSON.parse(localStorage.getItem('compras2026') || '[]');
        if (data2026.length > 0) {
            allCompras.push(...data2026);
            console.log(`✅ Datos 2026 cargados desde localStorage: ${data2026.length} productos`);
        }
    } catch (error) {
        console.error('❌ Error cargando datos 2026 desde localStorage:', error);
    }

    console.log(`📊 Resumen de carga:`);
    console.log(`   - Años cargados: ${loadedYears.join(', ')}`);
    if (failedYears.length > 0) {
        console.log(`   - Años fallidos: ${failedYears.join(', ')}`);
    }
    console.log(`   - Total productos: ${allCompras.length}`);

    comprasState.allData = allCompras;
    comprasState.filteredData = allCompras;

    hideLoading();
    updateComprasSection();
}

// ===========================
// PROCESAMIENTO DE DATOS
// ===========================
function processComprasData() {
    const data = comprasState.filteredData;

    const totalGastado = data.reduce((sum, c) => sum + c.precio, 0);
    const numeroCompras = data.length;
    const ahorroOfertas = data.reduce((sum, c) => {
        return sum + (c.precioSinOferta > 0 ? c.precioSinOferta - c.precio : 0);
    }, 0);
    const pedidosPendientes = data.filter(c => c.estado === 'Pendiente').length;
    const pedidosPendientesValor = data
        .filter(c => c.estado === 'Pendiente')
        .reduce((sum, c) => sum + c.precio, 0);

    return {
        totalGastado,
        numeroCompras,
        ahorroOfertas,
        pedidosPendientes,
        pedidosPendientesValor
    };
}

// ===========================
// ACTUALIZAR SECCIÓN
// ===========================
function updateComprasSection() {
    updateComprasKPIs();
    updateComprasCharts();
    updateComprasTable();
    populateComprasFilters();
}

// ===========================
// ACTUALIZAR KPIs
// ===========================
function updateComprasKPIs() {
    const stats = processComprasData();

    document.getElementById('compras-total').textContent = utils.formatEuro(stats.totalGastado);
    document.getElementById('compras-count').textContent = stats.numeroCompras;
    document.getElementById('compras-savings').textContent = utils.formatEuro(stats.ahorroOfertas);
    document.getElementById('compras-pending').textContent = stats.pedidosPendientes;

    // Additional info
    const savingsPercent = stats.totalGastado > 0
        ? ((stats.ahorroOfertas / (stats.totalGastado + stats.ahorroOfertas)) * 100).toFixed(1)
        : 0;
    document.getElementById('compras-savings-percent').textContent = `${savingsPercent}% de descuento`;
    document.getElementById('compras-pending-value').textContent = utils.formatEuro(stats.pedidosPendientesValor);
}

// ===========================
// ACTUALIZAR GRÁFICOS
// ===========================
function updateComprasCharts() {
    updateComprasYearlyChart();
    updateComprasStoreChart();
    updateComprasMonthlyChart();
    updateComprasTopChart();
}

// Chart: Yearly evolution
function updateComprasYearlyChart() {
    const ctx = document.getElementById('compras-yearly-chart');
    if (!ctx) return;

    const yearlyData = {};
    comprasState.filteredData.forEach(c => {
        yearlyData[c.year] = (yearlyData[c.year] || 0) + c.precio;
    });

    const sorted = Object.entries(yearlyData).sort((a, b) => a[0] - b[0]);
    const labels = sorted.map(([y]) => y);
    const data = sorted.map(([, v]) => v);

    if (comprasState.charts.yearly) {
        comprasState.charts.yearly.destroy();
    }

    comprasState.charts.yearly = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Gasto Total',
                data,
                backgroundColor: '#6366f1',
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

// Chart: Store distribution
function updateComprasStoreChart() {
    const ctx = document.getElementById('compras-store-chart');
    if (!ctx) return;

    const storeData = {};
    comprasState.filteredData.forEach(c => {
        const store = c.tienda || 'Sin tienda';
        storeData[store] = (storeData[store] || 0) + c.precio;
    });

    const sorted = Object.entries(storeData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const labels = sorted.map(([s]) => s);
    const data = sorted.map(([, v]) => v);

    if (comprasState.charts.store) {
        comprasState.charts.store.destroy();
    }

    comprasState.charts.store = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
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
                    labels: { color: '#cbd5e1', padding: 10 }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.label}: ${utils.formatEuro(context.parsed)}`
                    }
                }
            }
        }
    });
}

// Chart: Monthly 2025
function updateComprasMonthlyChart() {
    const ctx = document.getElementById('compras-monthly-chart');
    if (!ctx) return;

    const monthlyData = {};
    comprasState.filteredData
        .filter(c => c.year === 2025)
        .forEach(c => {
            const date = utils.parseDate(c.fecha);
            if (!date) return;
            const month = date.getMonth() + 1;
            const monthKey = `${month.toString().padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + c.precio;
        });

    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const data = months.map(m => monthlyData[m] || 0);

    if (comprasState.charts.monthly) {
        comprasState.charts.monthly.destroy();
    }

    comprasState.charts.monthly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => {
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return monthNames[parseInt(m) - 1];
            }),
            datasets: [{
                label: 'Gasto Mensual',
                data,
                borderColor: '#10b981',
                backgroundColor: '#10b98120',
                fill: true,
                tension: 0.4,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Gasto: ${utils.formatEuro(context.parsed.y)}`
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

// Chart: Top 10 products
function updateComprasTopChart() {
    const ctx = document.getElementById('compras-top-chart');
    if (!ctx) return;

    const sorted = [...comprasState.filteredData]
        .sort((a, b) => b.precio - a.precio)
        .slice(0, 10);

    const labels = sorted.map(c => c.producto.substring(0, 30) + (c.producto.length > 30 ? '...' : ''));
    const data = sorted.map(c => c.precio);

    if (comprasState.charts.top) {
        comprasState.charts.top.destroy();
    }

    comprasState.charts.top = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Precio',
                data,
                backgroundColor: '#f59e0b',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Precio: ${utils.formatEuro(context.parsed.x)}`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8', callback: (val) => utils.formatEuro(val) },
                    grid: { color: '#334155' }
                },
                y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
            }
        }
    });
}

// ===========================
// FILTROS
// ===========================
function populateComprasFilters() {
    // Stores
    const stores = [...new Set(comprasState.allData.map(c => c.tienda).filter(Boolean))].sort();
    const storeSelect = document.getElementById('compras-filter-store');
    storeSelect.innerHTML = '<option value="">Todas las tiendas</option>' +
        stores.map(s => `<option value="${s}">${s}</option>`).join('');

    // Years
    const years = [...new Set(comprasState.allData.map(c => c.year))].sort((a, b) => b - a);
    const yearSelect = document.getElementById('compras-filter-year');
    yearSelect.innerHTML = '<option value="">Todos los años</option>' +
        years.map(y => `<option value="${y}">${y}</option>`).join('');
}

function applyComprasFilters() {
    const searchTerm = document.getElementById('compras-search').value.toLowerCase();
    const filterStore = document.getElementById('compras-filter-store').value;
    const filterStatus = document.getElementById('compras-filter-status').value;
    const filterYear = document.getElementById('compras-filter-year').value;

    comprasState.filteredData = comprasState.allData.filter(c => {
        const matchSearch = !searchTerm || c.producto.toLowerCase().includes(searchTerm);
        const matchStore = !filterStore || c.tienda === filterStore;
        const matchStatus = !filterStatus || c.estado === filterStatus;
        const matchYear = !filterYear || c.year == filterYear;

        return matchSearch && matchStore && matchStatus && matchYear;
    });

    comprasState.currentPage = 1;
    updateComprasSection();
}

// ===========================
// TABLA
// ===========================
function updateComprasTable() {
    const tbody = document.getElementById('compras-tbody');

    const totalPages = Math.ceil(comprasState.filteredData.length / comprasState.rowsPerPage);
    const start = (comprasState.currentPage - 1) * comprasState.rowsPerPage;
    const end = start + comprasState.rowsPerPage;

    const sorted = [...comprasState.filteredData].sort((a, b) => {
        return utils.parseDate(b.fecha) - utils.parseDate(a.fecha);
    });

    const pageData = sorted.slice(start, end);

    tbody.innerHTML = pageData.map(c => {
        const ahorro = c.precioSinOferta > 0 ? c.precioSinOferta - c.precio : 0;
        const statusClass = c.estado === 'Recibido' ? 'recibido' :
            c.estado === 'Pendiente' ? 'pendiente' : 'no-llego';

        const isEditable = c.source === 'local' || c.year === 2026;

        return `
            <tr>
                <td>${c.producto}</td>
                <td>${utils.formatDate(c.fecha)}</td>
                <td>${c.tienda || '-'}</td>
                <td><span class="status-badge ${statusClass}">${c.estado}</span></td>
                <td>${utils.formatEuro(c.precio)}</td>
                <td>${c.precioSinOferta > 0 ? utils.formatEuro(c.precioSinOferta) : '-'}</td>
                <td>${ahorro > 0 ? utils.formatEuro(ahorro) : '-'}</td>
                <td>
                    ${isEditable ? `
                        <button class="toggle-status-btn ${c.estado === 'Recibido' ? 'received' : ''}" 
                                onclick="toggleCompraStatus('${c.id}')">
                            ${c.estado === 'Recibido' ? '✓ Recibido' : '⏳ Marcar recibido'}
                        </button>
                        <button class="delete-btn" onclick="deleteCompra('${c.id}')">🗑️</button>
                    ` : '-'}
                </td>
            </tr>
        `;
    }).join('');

    // Update pagination info
    document.getElementById('compras-page-info').textContent = `Página ${comprasState.currentPage} de ${totalPages || 1}`;
    document.getElementById('compras-showing-info').textContent =
        `Mostrando ${start + 1}-${Math.min(end, comprasState.filteredData.length)} de ${comprasState.filteredData.length} compras`;

    // Enable/disable buttons
    document.getElementById('compras-prev-page').disabled = comprasState.currentPage === 1;
    document.getElementById('compras-next-page').disabled = comprasState.currentPage >= totalPages;
}

// ===========================
// ACCIONES
// ===========================
function toggleCompraStatus(id) {
    const compra = comprasState.allData.find(c => c.id === id);
    if (!compra) return;

    compra.estado = compra.estado === 'Recibido' ? 'Pendiente' : 'Recibido';

    // Save to localStorage if it's 2026 data
    if (compra.year === 2026) {
        const data2026 = comprasState.allData.filter(c => c.year === 2026);
        localStorage.setItem('compras2026', JSON.stringify(data2026));
    }

    updateComprasSection();
}

function deleteCompra(id) {
    if (!confirm('¿Estás seguro de eliminar esta compra?')) return;

    const index = comprasState.allData.findIndex(c => c.id === id);
    if (index === -1) return;

    const compra = comprasState.allData[index];
    comprasState.allData.splice(index, 1);

    // Update localStorage if it's 2026 data
    if (compra.year === 2026) {
        const data2026 = comprasState.allData.filter(c => c.year === 2026);
        localStorage.setItem('compras2026', JSON.stringify(data2026));
    }

    applyComprasFilters();
}

function addNewCompra(event) {
    event.preventDefault();

    const producto = document.getElementById('compra-producto').value.trim();
    const fecha = document.getElementById('compra-fecha').value;
    const tienda = document.getElementById('compra-tienda').value.trim();
    const precio = parseFloat(document.getElementById('compra-precio').value);
    const precioSinOferta = parseFloat(document.getElementById('compra-precio-sin-oferta').value) || 0;

    if (!producto || !fecha || !tienda || !precio) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }

    // Convert date to DD/MM/YYYY format
    const dateObj = new Date(fecha);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;

    const newCompra = {
        id: `2026-${Date.now()}`,
        producto,
        fecha: formattedDate,
        tienda,
        estado: 'Pendiente',
        precio,
        precioSinOferta,
        year: 2026,
        source: 'local'
    };

    comprasState.allData.push(newCompra);

    // Save to localStorage
    const data2026 = comprasState.allData.filter(c => c.year === 2026);
    localStorage.setItem('compras2026', JSON.stringify(data2026));

    // Reset form
    document.getElementById('compras-form').reset();

    // Update view
    applyComprasFilters();

    alert('✅ Compra añadida correctamente');
}

function exportCompras2026() {
    const data2026 = comprasState.allData.filter(c => c.year === 2026);

    if (data2026.length === 0) {
        alert('No hay compras de 2026 para exportar');
        return;
    }

    // Create CSV content matching the original format
    const csvRows = [
        ['', '', '', '', '', '', '', ''],
        ['', '', 'Compras Online 2026', '', '', '', '', ''],
        ['', '', 'Producto', 'Fecha', 'Tienda', 'Estado', 'Precio', 'Precio sin oferta']
    ];

    data2026.forEach(c => {
        csvRows.push([
            '', '',
            c.producto,
            c.fecha,
            c.tienda,
            c.estado,
            `"${c.precio.toFixed(2)} €"`,
            c.precioSinOferta > 0 ? `"${c.precioSinOferta.toFixed(2)} €"` : ''
        ]);
    });

    const csv = csvRows.map(row => row.join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '2026.csv';
    link.click();
}

// ===========================
// EVENT LISTENERS
// ===========================
function setupEventListeners() {
    // Form submit
    const form = document.getElementById('compras-form');
    if (form) {
        form.addEventListener('submit', addNewCompra);
    }

    // Filters
    document.getElementById('compras-search')?.addEventListener('input', utils.debounce(applyComprasFilters, 300));
    document.getElementById('compras-filter-store')?.addEventListener('change', applyComprasFilters);
    document.getElementById('compras-filter-status')?.addEventListener('change', applyComprasFilters);
    document.getElementById('compras-filter-year')?.addEventListener('change', applyComprasFilters);

    // Pagination
    document.getElementById('compras-prev-page')?.addEventListener('click', () => {
        if (comprasState.currentPage > 1) {
            comprasState.currentPage--;
            updateComprasTable();
        }
    });

    document.getElementById('compras-next-page')?.addEventListener('click', () => {
        const totalPages = Math.ceil(comprasState.filteredData.length / comprasState.rowsPerPage);
        if (comprasState.currentPage < totalPages) {
            comprasState.currentPage++;
            updateComprasTable();
        }
    });

    // Export
    document.getElementById('export-compras-btn')?.addEventListener('click', exportCompras2026);

    // Refresh
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        location.reload();
    });
}

// ===========================
// INICIALIZACIÓN
// ===========================
function hideLoading() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
}

// ===========================
// INICIO
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadComprasOnlineData();
});
