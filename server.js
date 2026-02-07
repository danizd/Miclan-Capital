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

// API para guardar compras en el CSV del año correspondiente
app.post('/api/compras/save', async (req, res) => {
    try {
        const { year, compras } = req.body;
        
        if (!year || !compras) {
            return res.status(400).json({ error: 'Faltan parámetros: year y compras son requeridos' });
        }

        const filePath = path.join(__dirname, 'Compras-online', `${year}.csv`);
        
        // Crear el contenido CSV
        const csvRows = [
            ['', '', '', '', '', '', '', ''],
            ['', '', `Compras Online ${year}`, '', '', '', '', ''],
            ['', '', 'Producto', 'Fecha', 'Tienda', 'Estado', 'Precio', 'Precio sin oferta']
        ];

        compras.forEach(c => {
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
            const lines = content.split('\n');
            
            // Parsear compras existentes (saltando las 3 primeras filas de cabecera)
            for (let i = 3; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const cols = lines[i].split(',');
                if (cols.length >= 8) {
                    compras.push({
                        producto: cols[2],
                        fecha: cols[3],
                        tienda: cols[4],
                        estado: cols[5],
                        precio: parseFloat(cols[6].replace(/[€\s"]/g, '').replace(',', '.')),
                        precioSinOferta: cols[7] ? parseFloat(cols[7].replace(/[€\s"]/g, '').replace(',', '.')) : 0
                    });
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
        const csvRows = [
            ['', '', '', '', '', '', '', ''],
            ['', '', `Compras Online ${compra.year}`, '', '', '', '', ''],
            ['', '', 'Producto', 'Fecha', 'Tienda', 'Estado', 'Precio', 'Precio sin oferta']
        ];

        compras.forEach(c => {
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
