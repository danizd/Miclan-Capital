# Clasifica Movimientos Bancarios

Este es un programa de línea de comandos desarrollado en Go que procesa archivos CSV de movimientos bancarios. Su función principal es leer múltiples archivos CSV, clasificar cada movimiento en una categoría específica y generar un único archivo Excel con los resultados.

## Características

- **Procesamiento por Lotes:** Procesa todos los archivos `.csv` que se encuentren en el mismo directorio que el ejecutable.
- **Categorización Automática:** Asigna una categoría a cada movimiento basándose en palabras clave definidas por el usuario.
- **Mapeo Flexible:** Las palabras clave y las categorías se gestionan externamente a través de un archivo Excel, permitiendo una fácil personalización sin modificar el código.
- **Salida Consolidada:** Genera un único archivo `.xlsx` con todos los datos de los CSV procesados y una nueva columna para la categoría asignada.
- **Concurrencia:** Utiliza goroutines para procesar múltiples archivos CSV de forma concurrente, mejorando la eficiencia.

## Requisitos

- Un archivo `relacion_clave_categoria.xlsx` debe estar presente en el mismo directorio que el ejecutable.
- Uno o más archivos de movimientos bancarios en formato `.csv`.

## Uso

1.  Coloca el ejecutable (`procesador_csv.exe` en Windows) en una carpeta.
2.  Asegúrate de que en la misma carpeta se encuentren:
    *   El archivo de mapeo `relacion_clave_categoria.xlsx`.
    *   Todos los archivos `.csv` que deseas procesar.
3.  Ejecuta el programa haciendo doble clic en el ejecutable o a través de la terminal.
4.  El programa te pedirá que presiones una tecla para comenzar el procesamiento.
5.  Una vez finalizado, se creará un archivo `csv_procesado_<timestamp>.xlsx` en la misma carpeta.

## Archivos de Entrada

### 1. CSV de Cuentas (`*_ejemplo.csv`)

Los archivos CSV deben tener el siguiente formato y estar delimitados por punto y coma (`;`):

**Cabeceras:**
`Fecha ctble;Fecha valor;Concepto;Importe;Moneda;Saldo;Moneda;Concepto ampliado`

El programa utiliza la columna `Concepto` para buscar las palabras clave y asignar la categoría.

### 2. Mapeo de Categorías (`relacion_clave_categoria.xlsx`)

Este archivo Excel es **obligatorio** y debe contener dos columnas:

-   **Columna A (`palabra_clave`):** La palabra clave que el programa buscará en el concepto de cada movimiento (la búsqueda no distingue mayúsculas de minúsculas).
-   **Columna B (`categoria`):** La categoría que se asignará si se encuentra la palabra clave.

**Ejemplo de estructura:**

| palabra_clave | categoria    |
|---------------|--------------|
| Veterinario   | mascotas     |
| GADIS         | supermercado |
| Seguro coche  | coche        |
| PIZZERIA      | restaurante  |

## Archivo de Salida

El programa genera un único archivo Excel con un nombre similar a `csv_procesado_1672531200.xlsx`. Este archivo contiene todas las filas de los CSV de entrada más una columna adicional llamada `Categoria`.

**Columnas de salida:**
`Fecha contable`, `Fecha valor`, `Concepto`, `Importe`, `Moneda`, `Saldo`, `Moneda`, `Concepto ampliado`, `Categoria`

## Desarrollo

Si deseas compilar el programa desde el código fuente, sigue estos pasos:

1.  Asegúrate de tener [Go](https://golang.org/) (versión 1.16 o superior) instalado.
2.  Clona el repositorio o descarga los archivos `main.go`, `go.mod` y `go.sum`.
3.  Abre una terminal en el directorio del proyecto.
4.  Ejecuta el siguiente comando para descargar las dependencias:
    ```sh
    go mod tidy
    ```
5.  Compila el programa para tu sistema operativo:
    ```sh
    go build -o procesador_csv.exe .
    ```
6.  Sigue las instrucciones de la sección de [Uso](#uso).
