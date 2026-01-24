# 📊 Guía de Uso del Dashboard Financiero

## 🎯 Inicio Rápido

### 1. Abrir el Dashboard

#### Opción Recomendada: Docker 🐳
```bash
docker-compose up -d
```

#### Opción Estándar: Servidor Local
```bash
# Opción 1: Python
python -m http.server 8000

# Opción 2: Node.js
npx http-server -p 8000
```

Luego abre en tu navegador: **http://localhost:8000**

---

## 🔍 Uso de Filtros

### Filtro por Fechas

**Ejemplo 1: Ver solo el año 2024**
1. En la barra lateral, establece:
   - **Fecha desde**: 01/01/2024
   - **Fecha hasta**: 31/12/2024
2. El dashboard se actualiza automáticamente

**Ejemplo 2: Ver el último trimestre**
1. Establece:
   - **Fecha desde**: 01/10/2025
   - **Fecha hasta**: 31/12/2025

### Filtro por Cuentas

**Ver solo una cuenta específica:**
1. Desmarca todas las cuentas
2. Marca solo la cuenta que quieres ver (ej: `Cuenta_Principal`)
3. Los gráficos mostrarán solo esa cuenta

**Comparar dos cuentas:**
1. Desmarca todas
2. Marca solo las dos cuentas a comparar

### Filtro por Tipo de Movimiento

**Ver solo gastos:**
- Selecciona el radio button "Gastos"
- Útil para analizar en qué categorías gastas más

**Ver solo ingresos:**
- Selecciona "Ingresos"
- Identifica tus fuentes de ingresos

### Filtro por Categorías

**Analizar categorías específicas:**
1. En el selector múltiple de categorías
2. Mantén presionado `Ctrl` (Windows) o `Cmd` (Mac)
3. Selecciona las categorías que quieres analizar

**Ejemplo: Analizar solo gastos de vivienda**
- Selecciona: hipoteca, comunidad, facturas

---

## 📈 Interpretación de KPIs

### Total Ingresos
- **Qué muestra**: Suma de todos los movimientos positivos
- **Uso**: Conocer tus ingresos totales en el periodo
- **Ejemplo**: 15.000,00 € (587 movimientos)

### Total Gastos
- **Qué muestra**: Suma de todos los movimientos negativos (en valor absoluto)
- **Uso**: Conocer tus gastos totales
- **Ejemplo**: 12.000,00 € (8182 movimientos)

### Ahorro Total
- **Qué muestra**: Diferencia entre ingresos y gastos
- **Fórmula**: `Ingresos - Gastos`
- **Interpretación**:
  - ✅ Positivo: Estás ahorrando
  - ❌ Negativo: Estás gastando más de lo que ingresas

### Tasa de Ahorro
- **Qué muestra**: Porcentaje de ingresos que ahorras
- **Fórmula**: `(Ahorro / Ingresos) × 100`
- **Interpretación**:
  - 🟢 >20%: Excelente
  - 🟡 10-20%: Bueno
  - 🟠 5-10%: Mejorable
  - 🔴 <5%: Crítico

---

## 📊 Interpretación de Gráficos

### 1. Distribución de Gastos por Categoría (Pie Chart)

**Qué muestra**: Top 10 categorías donde más gastas

**Cómo usarlo**:
- Identifica tu mayor gasto (segmento más grande)
- Hover sobre cada segmento para ver:
  - Importe exacto
  - Porcentaje del total
- Busca oportunidades de ahorro en categorías grandes

**Ejemplo de análisis**:
```
Si "supermercado" es 30% de tus gastos:
→ Podrías reducir 10% comprando en mayoristas
→ Ahorro potencial: 30% × 10% = 3% del total
```

### 2. Ingresos vs Gastos por Categoría (Bar Chart)

**Qué muestra**: Comparación lado a lado de ingresos y gastos

**Cómo usarlo**:
- Barras verdes = Ingresos
- Barras rojas = Gastos
- Identifica categorías con mayor desequilibrio

**Ejemplo**:
- Si "salario" tiene barra verde grande pero "ocio" tiene barra roja grande
- → Evalúa si el gasto en ocio es proporcional

### 3. Evolución Temporal (Line Chart)

**Qué muestra**: Tendencia de ingresos, gastos y ahorro a lo largo del tiempo

**Cómo usarlo**:
- Línea verde = Ingresos
- Línea roja = Gastos
- Área morada = Ahorro
- Busca patrones:
  - ¿Tus gastos están creciendo?
  - ¿Tus ingresos son estables?
  - ¿Hay meses con ahorro negativo?

**Cambiar vista**:
- Selector "Mensual": Ver mes a mes
- Selector "Anual": Ver tendencia por año

### 4. Ahorro Mensual (Bar Chart)

**Qué muestra**: Ahorro de cada mes

**Interpretación de colores**:
- 🟢 Verde: Ahorro positivo (ingresos > gastos)
- 🔴 Rojo: Ahorro negativo (gastos > ingresos)

**Cómo usarlo**:
- Identifica meses problemáticos (barras rojas)
- Analiza qué causó el déficit
- Busca patrones estacionales

### 5. Saldo por Cuenta (Bar Chart)

**Qué muestra**: Saldo actual de cada cuenta

**Cómo usarlo**:
- Identifica tu cuenta principal
- Detecta cuentas con saldo bajo
- Planifica transferencias entre cuentas

### 6. Evolución del Saldo (Line Chart)

**Qué muestra**: Cómo ha cambiado el saldo de cada cuenta

**Cómo usarlo**:
- Cada línea = una cuenta
- Tendencia ascendente = cuenta creciendo
- Tendencia descendente = cuenta decreciendo
- Identifica cuentas que necesitan atención

---

## 💡 Insights Automáticos

### Top 10 Gastos Más Grandes

**Qué muestra**: Los 10 gastos individuales más altos

**Cómo usarlo**:
- Revisa si son gastos justificados
- Identifica gastos extraordinarios
- Planifica para gastos grandes futuros

**Ejemplo**:
```
1. CIRUGIA MAXILOFACIAL: -6.750,00 €
   → Gasto médico extraordinario
   → Considerar seguro de salud
```

### Gastos Recurrentes

**Qué muestra**: Gastos que se repiten mensualmente

**Cómo usarlo**:
- Identifica suscripciones olvidadas
- Evalúa si necesitas todos los servicios
- Busca alternativas más baratas

**Ejemplo**:
```
Hipoteca: -450,00 €/mes (frecuencia: 120 veces)
→ Gasto fijo principal
→ Evaluar refinanciación si tasas bajan
```

### Alertas y Anomalías

**Qué muestra**: Gastos inusuales detectados automáticamente

**Criterio**: Gastos >2 desviaciones estándar de la media

**Cómo usarlo**:
- Revisa si son gastos legítimos
- Detecta posibles fraudes
- Identifica gastos impulsivos

---

## 📋 Uso de la Tabla

### Búsqueda

**Buscar por concepto**:
1. Escribe en el campo de búsqueda
2. Ejemplo: "Mercadona" → muestra solo compras en Mercadona

**Buscar por categoría**:
- Escribe el nombre de la categoría
- Ejemplo: "hipoteca"

### Ordenamiento

**Opciones disponibles**:
- **Fecha (más reciente)**: Ver últimos movimientos
- **Fecha (más antigua)**: Ver primeros movimientos
- **Importe (mayor)**: Ver gastos más grandes
- **Importe (menor)**: Ver gastos más pequeños
- **Categoría**: Agrupar por categoría

### Paginación

- **50 registros por página**
- Usa "Anterior" y "Siguiente" para navegar
- El contador muestra: "Mostrando 1-50 de 8770 registros"

### Exportar

**Exportar tabla filtrada**:
1. Aplica filtros deseados
2. Usa búsqueda si necesario
3. Click en "📥 Exportar CSV"
4. Se descarga solo lo visible

**Exportar todos los datos**:
1. Click en "📥 Exportar Datos" (header)
2. Se descargan todos los datos filtrados

---

## 🎯 Casos de Uso Prácticos

### Caso 1: Preparar Presupuesto Anual

**Objetivo**: Saber cuánto gastas al año en cada categoría

**Pasos**:
1. Filtra por año completo (ej: 2024)
2. Mira el gráfico "Distribución de Gastos"
3. Anota las categorías principales
4. Exporta la tabla para análisis detallado

### Caso 2: Reducir Gastos

**Objetivo**: Identificar dónde ahorrar

**Pasos**:
1. Filtra solo "Gastos"
2. Ordena tabla por "Importe (mayor)"
3. Revisa los 20 gastos más grandes
4. Identifica gastos reducibles
5. Mira "Gastos Recurrentes" para suscripciones

### Caso 3: Analizar Ahorro

**Objetivo**: Ver si estás mejorando tu ahorro

**Pasos**:
1. Mira el gráfico "Ahorro Mensual"
2. Identifica tendencia (¿sube o baja?)
3. Compara tasa de ahorro año a año
4. Establece meta (ej: 15% de ahorro)

### Caso 4: Revisar Cuenta Específica

**Objetivo**: Analizar movimientos de una cuenta

**Pasos**:
1. Desmarca todas las cuentas excepto una
2. Mira "Evolución del Saldo"
3. Identifica periodos de crecimiento/decrecimiento
4. Exporta datos de esa cuenta

### Caso 5: Declaración de Impuestos

**Objetivo**: Obtener resumen anual para Hacienda

**Pasos**:
1. Filtra por año fiscal
2. Filtra categorías deducibles (ej: hipoteca, donaciones)
3. Exporta CSV
4. Suma totales por categoría

---

## 🔧 Trucos y Consejos

### Atajos de Teclado

- `Ctrl + F`: Buscar en tabla (navegador)
- `F5`: Recargar dashboard
- `Ctrl + Click`: Selección múltiple en filtros

### Optimización de Rendimiento

**Si el dashboard va lento**:
1. Reduce el rango de fechas
2. Filtra menos cuentas
3. Cierra otras pestañas del navegador

### Análisis Avanzado

**Comparar dos periodos**:
1. Exporta datos del periodo 1
2. Resetea filtros
3. Exporta datos del periodo 2
4. Compara en Excel/Google Sheets

**Detectar tendencias**:
- Usa vista "Anual" en evolución temporal
- Busca patrones repetitivos
- Identifica estacionalidad (ej: más gastos en diciembre)

---

## ❓ Preguntas Frecuentes

### ¿Por qué mis KPIs son diferentes a mi banco?

- El dashboard usa la fecha contable, no la fecha valor
- Verifica que el CSV esté actualizado
- Asegúrate de no tener filtros activos

### ¿Cómo añado nuevos movimientos?

1. Exporta nuevos movimientos de tu banco
2. Añádelos al CSV (mismo formato)
3. Recarga el dashboard (F5)

### ¿Puedo cambiar las categorías?

Sí, edita el CSV:
- Columna "Categoria": Categoría principal
- Columna "Subcategoria": Subcategoría

### ¿El dashboard guarda mis cambios?

No, el dashboard es solo visualización. Para guardar:
- Exporta los datos filtrados
- Guarda el CSV modificado

---

## 🎨 Personalización Avanzada

### Cambiar Número de Categorías en Gráfico

Edita `app.js`:
```javascript
const CONFIG = {
    TOP_CATEGORIES: 15,  // Cambiar de 10 a 15
    // ...
};
```

### Cambiar Filas por Página

```javascript
const CONFIG = {
    ROWS_PER_PAGE: 100,  // Cambiar de 50 a 100
    // ...
};
```

### Cambiar Colores de Gráficos

```javascript
CHART_COLORS: {
    income: '#00ff00',    // Verde más brillante
    expense: '#ff0000',   // Rojo más intenso
    // ...
}
```

---

## 📞 Soporte

Si encuentras problemas:
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que el CSV esté en la carpeta correcta
4. Asegúrate de usar un servidor local

---

**¡Disfruta analizando tus finanzas! 💰📊**
