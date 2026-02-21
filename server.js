const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos desde la raíz del proyecto
app.use(express.static('.'));

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const text = value.toString();
    if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function buildComprasCsv(year, compras) {
    const csvRows = [
        ['', '', '', '', '', '', '', ''],
        ['', '', `Compras Online ${year}`, '', '', '', '', ''],
        ['', '', 'Producto', 'Fecha', 'Tienda', 'Estado', 'Precio', 'Precio sin oferta']
    ];

    compras.forEach(c => {
        csvRows.push([
            '',
            '',
            c.producto || '',
            c.fecha || '',
            c.tienda || '',
            c.estado || 'Recibido',
            `${Number(c.precio || 0).toFixed(2)} €`,
            Number(c.precioSinOferta || 0) > 0 ? `${Number(c.precioSinOferta).toFixed(2)} €` : ''
        ]);
    });

    return csvRows.map(row => row.map(csvEscape).join(',')).join('\r\n');
}

function parseEstado(value) {
    const normalized = (value || '').toString().trim().toLowerCase();
    if (normalized === 'pendiente') return 'Pendiente';
    if (normalized === 'recibido') return 'Recibido';
    if (normalized === 'no llego' || normalized === 'no llegó') return 'No llegó';
    return null;
}

function parseCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];

        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (ch === ',' && !inQuotes) {
            cells.push(current.trim());
            current = '';
            continue;
        }

        current += ch;
    }

    cells.push(current.trim());
    return cells;
}

function parseCompraFromCsvLine(line) {
    const cols = parseCsvLine(line);
    if (!cols.length) return null;

    let cells = [...cols];
    let removedLeading = 0;
    while (removedLeading < 2 && cells.length > 0 && cells[0] === '') {
        cells.shift();
        removedLeading++;
    }

    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    const dateIndex = cells.findIndex(cell => dateRegex.test(cell));
    if (dateIndex <= 0) return null;

    const estadoIndex = cells.findIndex((cell, index) => index > dateIndex && parseEstado(cell));
    if (estadoIndex === -1) return null;

    const precioIndex = cells.findIndex((cell, index) => index > estadoIndex && /\d/.test(cell));
    if (precioIndex === -1) return null;

    const precioSinOfertaStr = cells.slice(precioIndex + 1).find(cell => cell && /\d/.test(cell)) || '';

    return {
        producto: cells.slice(0, dateIndex).join(',').trim(),
        fecha: cells[dateIndex],
        tienda: cells.slice(dateIndex + 1, estadoIndex).join(',').trim() || 'Sin tienda',
        estado: parseEstado(cells[estadoIndex]) || 'Recibido',
        precio: parseFloat(cells[precioIndex].replace(/[€\s"]/g, '').replace(',', '.')) || 0,
        precioSinOferta: precioSinOfertaStr
            ? parseFloat(precioSinOfertaStr.replace(/[€\s"]/g, '').replace(',', '.')) || 0
            : 0
    };
}

// API para guardar compras en el CSV del año correspondiente
app.post('/api/compras/save', async (req, res) => {
    try {
        const { year, compras } = req.body;
        
        if (!year || !compras) {
            return res.status(400).json({ error: 'Faltan parámetros: year y compras son requeridos' });
        }

        const filePath = path.join(__dirname, 'Compras-online', `${year}.csv`);
        const csv = buildComprasCsv(year, compras);
        
        // Crear directorio si no existe
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // Escribir archivo
        await fs.writeFile(filePath, csv, 'utf8');
        
        res.json({ success: true, message: `Archivo ${year}.csv guardado correctamente` });
    } catch (error) {
        console.error('Error guardando archivo CSV:', error);
        res.status(500).json({ error: 'Error guardando archivo CSV', details: error.message });
    }
});

// API para agregar una compra
app.post('/api/compras/add', async (req, res) => {
    try {
        const { compra } = req.body;
        
        if (!compra || !compra.year) {
            return res.status(400).json({ error: 'Falta parámetro: compra con year es requerido' });
        }

        const filePath = path.join(__dirname, 'Compras-online', `${compra.year}.csv`);
        
        // Leer archivo existente o crear array vacío
        let compras = [];
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split(/\r?\n/);
            
            // Parsear compras existentes (saltando las 3 primeras filas de cabecera)
            for (let i = 3; i < lines.length; i++) {
                if (!lines[i].trim()) continue;

                const compraParsed = parseCompraFromCsvLine(lines[i]);
                if (compraParsed) {
                    compras.push(compraParsed);
                }
            }
        } catch (error) {
            // Archivo no existe, usar array vacío
        }

        // Agregar nueva compra
        compras.push({
            producto: compra.producto,
            fecha: compra.fecha,
            tienda: compra.tienda,
            estado: compra.estado,
            precio: compra.precio,
            precioSinOferta: compra.precioSinOferta || 0
        });

        // Guardar archivo
        const csv = buildComprasCsv(compra.year, compras);
        
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, csv, 'utf8');
        
        res.json({ success: true, message: `Compra agregada a ${compra.year}.csv` });
    } catch (error) {
        console.error('Error agregando compra:', error);
        res.status(500).json({ error: 'Error agregando compra', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
