/**
 * comunidad.js - Lógica para el Dashboard de Gastos de Comunidad
 * Carga y procesa datos dinámicamente desde gastos_comunidad.csv
 */

const CONFIG = {
    CSV_PATH: 'gastos_comunidad.csv',
    COLORS: [
        "#4F46E5", "#7C3AED", "#06B6D4", "#10B981", "#F59E0B",
        "#EF4444", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6",
        "#F97316", "#84CC16", "#6366F1", "#A855F7"
    ]
};

const state = {
    rawRecords: [],
    processedData: {
        byYear: {},
        byCategory: {},
        byCategoryYear: {}, // Nuevo
        monthlyEvolution: {},
        derramas: []
    },
    charts: {}
};

// ===========================
// INICIALIZACIÓN
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});

async function loadData() {
    try {
        const response = await fetch(CONFIG.CSV_PATH);
        if (!response.ok) throw new Error('No se pudo cargar el archivo CSV');

        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            delimiter: ';',
            skipEmptyLines: true,
            complete: (results) => {
                state.rawRecords = results.data;
                processData();
                renderAll();
            },
            error: (error) => {
                console.error('Error al parsear CSV:', error);
            }
        });
    } catch (error) {
        console.error('Error en loadData:', error);
    }
}

// ===========================
// PROCESAMIENTO DE DATOS
// ===========================
function processData() {
    const data = state.rawRecords;

    // Reiniciar estructuras
    state.processedData = {
        byYear: {},
        byCategory: {},
        byCategoryYear: {},
        monthlyEvolution: {},
        derramas: [],
        totals: {
            gastado: 0,
            promedio: 0,
            anios: 0,
            categorias: 0
        }
    };

    data.forEach(record => {
        const anio = record['Año'];
        const mesStr = record['Mes'];
        const mesNum = parseInt(record['Mes Num']);
        const importe = parseAmount(record['Importe']);
        const concepto = getCategory(record); // Cambio aquí para usar la nueva categorización
        const archivo = record['Archivo'] || '';

        if (!anio || isNaN(importe)) return;

        // 1. Totales generales
        state.processedData.totals.gastado += importe;

        // 2. Por Año
        if (!state.processedData.byYear[anio]) {
            state.processedData.byYear[anio] = { total: 0, months: new Set() };
        }
        state.processedData.byYear[anio].total += importe;
        state.processedData.byYear[anio].months.add(mesNum);

        state.processedData.byCategory[concepto] += importe;

        // 3.1 Por Categoría y Año (para gráfico apilado)
        if (!state.processedData.byCategoryYear[concepto]) {
            state.processedData.byCategoryYear[concepto] = {};
        }
        state.processedData.byCategoryYear[concepto][anio] = (state.processedData.byCategoryYear[concepto][anio] || 0) + importe;

        // 4. Evolución Mensual (agrupado por año)
        if (!state.processedData.monthlyEvolution[anio]) {
            state.processedData.monthlyEvolution[anio] = new Array(12).fill(0);
        }
        state.processedData.monthlyEvolution[anio][mesNum - 1] += importe;

        // 5. Derramas (detectar por nombre de archivo o concepto)
        if (archivo.toLowerCase().includes('derrama') || concepto.toLowerCase().includes('derrama')) {
            state.processedData.derramas.push({
                anio,
                mes: mesStr,
                importe
            });
        }
    });

    // Cálculos finales de KPIs
    const yearsArray = Object.keys(state.processedData.byYear);
    state.processedData.totals.anios = yearsArray.length;
    state.processedData.totals.categorias = Object.keys(state.processedData.byCategory).length;

    // Promedio mensual simplificado: Total / (Años * 12)
    state.processedData.totals.promedio = state.processedData.totals.gastado / (state.processedData.totals.anios * 12);
}

function parseAmount(str) {
    if (!str) return 0;
    return parseFloat(str.replace('.', '').replace(',', '.')) || 0;
}

function getCategory(record) {
    const concepto = (record['Concepto'] || '').toUpperCase();
    const archivo = (record['Archivo'] || '').toLowerCase();

    if (archivo.includes('derrama') || concepto.includes('DERRAMA')) {
        return 'Derramas extraordinarias';
    }

    if (concepto.includes('ACS') || (concepto.includes('AGUA') && concepto.includes('CALIENTE'))) {
        return 'Agua caliente (ACS)';
    }

    if (concepto.includes('CUOTACOMUNIDAD') || concepto.includes('CUOTA COMUNIDAD')) {
        return 'Cuota comunidad';
    }

    if (concepto.includes('CALEFACCION') || concepto.includes('GAS NATURAL') || concepto.includes('CALDERA') || concepto.includes('GAS')) {
        return 'Calefacción y Gas';
    }

    if (concepto.includes('ASCENSOR')) {
        return 'Ascensores';
    }

    if (concepto.includes('ELECTRICO') || concepto.includes('LUZ') || concepto.includes('ELECTRICIDAD')) {
        return 'Electricidad';
    }

    if (concepto.includes('LIMPIEZA')) {
        return 'Limpieza';
    }

    return 'Mantenimiento';
}

function formatEuro(num) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(num);
}

// ===========================
// RENDERIZADO
// ===========================
function renderAll() {
    updateKPIs();
    renderCharts();
    renderTables();
}

function updateKPIs() {
    const t = state.processedData.totals;
    document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = formatEuro(t.gastado);
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = formatEuro(t.promedio);
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = t.anios;
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = t.categorias;
}

function renderCharts() {
    Chart.defaults.color = '#9ca3af';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    renderEvolucionChart();
    renderCategoriaChart();
    renderAnualChart();
    renderCategoriaAnioChart();
    renderDerramasChart();
}

function renderEvolucionChart() {
    const years = Object.keys(state.processedData.monthlyEvolution).sort();
    const datasets = years.map((year, idx) => ({
        label: year,
        data: state.processedData.monthlyEvolution[year],
        borderColor: CONFIG.COLORS[idx % CONFIG.COLORS.length],
        backgroundColor: CONFIG.COLORS[idx % CONFIG.COLORS.length] + '20',
        tension: 0.3,
        fill: false
    }));

    if (state.charts.evolucion) state.charts.evolucion.destroy();

    state.charts.evolucion = new Chart(document.getElementById('chartEvolucion'), {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { usePointStyle: true } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v + '€' } } }
        }
    });
}

function renderCategoriaChart() {
    const categories = Object.keys(state.processedData.byCategory).sort((a, b) => state.processedData.byCategory[b] - state.processedData.byCategory[a]);
    const data = categories.map(c => state.processedData.byCategory[c]);

    if (state.charts.categoria) state.charts.categoria.destroy();

    state.charts.categoria = new Chart(document.getElementById('chartCategoria'), {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data,
                backgroundColor: CONFIG.COLORS,
                borderWidth: 2,
                borderColor: '#1f2937'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { usePointStyle: true, padding: 15 } } }
        }
    });
}

function renderAnualChart() {
    const years = Object.keys(state.processedData.byYear).sort();
    const data = years.map(y => state.processedData.byYear[y].total);

    if (state.charts.anual) state.charts.anual.destroy();

    state.charts.anual = new Chart(document.getElementById('chartAnual'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Total Anual',
                data,
                backgroundColor: CONFIG.COLORS,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v + '€' } } }
        }
    });
}

function renderDerramasChart() {
    const derramasByYear = {};
    state.processedData.derramas.forEach(d => {
        derramasByYear[d.anio] = (derramasByYear[d.anio] || 0) + d.importe;
    });

    const years = Object.keys(derramasByYear).sort();
    const data = years.map(y => derramasByYear[y]);

    if (state.charts.derramas) state.charts.derramas.destroy();

    state.charts.derramas = new Chart(document.getElementById('chartDerramas'), {
        type: 'bar',
        data: {
            labels: years,
            datasets: [{
                label: 'Derramas',
                data,
                backgroundColor: '#EF4444',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => v + '€' } } }
        }
    });
}

function renderCategoriaAnioChart() {
    const years = Object.keys(state.processedData.byYear).sort();
    // Orden específico solicitado
    const categories = [
        'Agua caliente (ACS)',
        'Cuota comunidad',
        'Calefacción y Gas',
        'Ascensores',
        'Electricidad',
        'Limpieza',
        'Mantenimiento',
        'Derramas extraordinarias'
    ];

    const datasets = categories.map((cat, idx) => ({
        label: cat,
        data: years.map(y => state.processedData.byCategoryYear[cat] ? state.processedData.byCategoryYear[cat][y] || 0 : 0),
        backgroundColor: CONFIG.COLORS[idx % CONFIG.COLORS.length],
        stack: 'Stack 0',
        borderRadius: 4
    }));

    if (state.charts.categoriaAnio) state.charts.categoriaAnio.destroy();

    state.charts.categoriaAnio = new Chart(document.getElementById('chartCategoriaAnio'), {
        type: 'bar',
        data: { labels: years, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 10, font: { size: 10 } } },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatEuro(ctx.raw)}` } }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, ticks: { callback: v => v + '€' } }
            }
        }
    });
}

function renderTables() {
    // Tabla Resumen por Año
    const years = Object.keys(state.processedData.byYear).sort((a, b) => b - a);
    const tbodyResumen = document.querySelector('.chart-card table:not([style*="margin-top"]) tbody');

    let htmlResumen = '';
    let lastTotal = 0;

    // Sort ascending for variation calculation
    const sortedYears = [...years].sort();
    const variations = {};
    let prevTotal = 0;
    sortedYears.forEach(y => {
        const total = state.processedData.byYear[y].total;
        if (prevTotal > 0) {
            variations[y] = ((total - prevTotal) / prevTotal * 100).toFixed(1);
        } else {
            variations[y] = '-';
        }
        prevTotal = total;
    });

    years.forEach(y => {
        const d = state.processedData.byYear[y];
        const varVal = variations[y];
        const varClass = varVal.startsWith('-') ? 'badge-down' : 'badge-up';
        const varText = varVal === '-' ? '-' : (varVal > 0 ? '+' : '') + varVal + '%';

        htmlResumen += `
            <tr>
                <td>${y}</td>
                <td><strong>${formatEuro(d.total)}</strong></td>
                <td>${formatEuro(d.total / 12)}</td>
                <td>${d.months.size}</td>
                <td><span class="badge ${varClass}">${varText}</span></td>
            </tr>
        `;
    });
    tbodyResumen.innerHTML = htmlResumen;

    // Tabla Derramas
    const tbodyDerramas = document.querySelector('.chart-card:last-of-type table tbody');
    let htmlDerramas = '';
    // Sort derramas by date desc
    const sortedDerramas = [...state.processedData.derramas].sort((a, b) => b.anio - a.anio || b.mes - a.mes);

    sortedDerramas.slice(0, 10).forEach(d => {
        htmlDerramas += `
            <tr>
                <td>${d.anio}</td>
                <td>${d.mes}</td>
                <td><strong>${formatEuro(d.importe)}</strong></td>
            </tr>
        `;
    });
    tbodyDerramas.innerHTML = htmlDerramas;
}
