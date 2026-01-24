package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/xuri/excelize/v2"
)

type AnalisisCSV struct {
	Error        bool
	MensajeError error
	Contenido    [][]string
}

func saludar() {
	fmt.Println(`
	
	PROCESADOR DE CSV
	=================

	Este programa busca categorizar los registros del CSV bancario.
	Antes de su ejecución:
	   - Comprobar que los archivos están en la misma carpeta que el ejecutable.
	   - Disponer en la misma carpeta del archivo relacion_clave_categoria.xlsx

	Pueden utilizarse tantas palabras clave como categorías se necesiten.

	Ejemplo:

	+---------------+--------------+
	| palabra_clave | categoria    |
	+---------------+--------------+
	| Carrefour     | supermercado |
	+---------------+--------------+
	| Alcampo       | supermercado |
	+---------------+--------------+
	| Media Mark    | ocio         |
	+---------------+--------------+
	| Decathlon     | ocio         |
	+---------------+--------------+
	
	Una vez que esté todo preparado pulsa cualquier tecla para iniciar...
	`)
	fmt.Scanln()
}

func cerrar(nuevoArchivo string) {
	fmt.Println(`
	
	*****************************************
	*****************************************
	         PROCESO FINALIZADO					
	*****************************************
	*****************************************

	`)
	fmt.Println("El archivo generado tras el procesamiento es:", nuevoArchivo, "\n\nPulsa cualquier tecla para salir...")
	fmt.Scanln()

}

func gestionarError(explicacion string, errorConcreto error) {
	mensajeError := fmt.Sprintln(explicacion, errorConcreto.Error())
	fmt.Println(mensajeError)
	fmt.Scanln()
}

func obtenerClavesCategoria(rutaEjecutable string) ([][]string, error) {
	var clavesCategoria [][]string
	rutaLibro := path.Join(rutaEjecutable, "relacion_clave_categoria.xlsx")
	libro, libroError := excelize.OpenFile(rutaLibro)
	if libroError != nil {
		gestionarError("error: no se ha encontrado el archivo relacion_clave_categoria.xlsx", libroError)
		return clavesCategoria, libroError
	}
	defer libro.Close()
	hojas := libro.GetSheetList()
	filas, filasError := libro.GetRows(hojas[0])
	if filasError != nil {
		gestionarError("error: error en las filas de la hoja de cálculo", filasError)
		return clavesCategoria, filasError
	}
	for indice, fila := range filas {
		if indice == 0 {
			continue
		}
		var contenidoFila []string
		if len(fila) < 2 {
			continue
		}
		contenidoFila = append(contenidoFila, fila[0])
		contenidoFila = append(contenidoFila, strings.ToLower(fila[1]))
		clavesCategoria = append(clavesCategoria, contenidoFila)
	}
	return clavesCategoria, nil
}

func obtenerArchivosCSV(rutaEjecutable string) ([]string, error) {
	var archivosCSV []string
	archivosDirectorio, archivosDirectorioError := ioutil.ReadDir(rutaEjecutable)
	if archivosDirectorioError != nil {
		gestionarError("error: no se han podido leer los archivos del directorio del ejecutable", archivosDirectorioError)
		return archivosCSV, archivosDirectorioError
	}
	for _, v := range archivosDirectorio {
		nombreArchivo := v.Name()
		rutaArchivo := path.Join(rutaEjecutable, nombreArchivo)
		if strings.HasSuffix(nombreArchivo, ".csv") {
			archivosCSV = append(archivosCSV, rutaArchivo)
		}
	}
	return archivosCSV, nil
}

func obtenerCategoria(conceptoResguardo string, clavesCategoria [][]string) string {
	var categoria string
	concepto := strings.ToLower(conceptoResguardo)
	for _, v := range clavesCategoria {
		claveCategoria := strings.ToLower(v[0])
		if strings.Contains(concepto, claveCategoria) {
			categoria = v[1]
			break
		}
	}
	return categoria
}

func procesarCSV(archivo string, clavesCategoria [][]string, canal chan AnalisisCSV) {
	defer wg.Done()
	var contenidoProcesado [][]string
	csvArchivo, csvArchivoError := os.Open(archivo)
	if csvArchivoError != nil {
		canal <- AnalisisCSV{
			Error:        true,
			MensajeError: csvArchivoError,
			Contenido:    contenidoProcesado,
		}
	}
	defer csvArchivo.Close()
	csvLector := csv.NewReader(csvArchivo)
	csvLector.Comma = ';'
	for {
		linea, lineaError := csvLector.Read()
		if lineaError == io.EOF {
			break
		}
		if lineaError != nil {
			continue
		}
		if len(linea) != 8 {
			continue
		}
		if linea[0] == "" {
			continue
		}
		if strings.HasPrefix(linea[0], "Fecha") {
			continue
		}
		categoriaClasificacion := obtenerCategoria(linea[2], clavesCategoria)
		linea = append(linea, categoriaClasificacion)
		contenidoProcesado = append(contenidoProcesado, linea)
	}
	canal <- AnalisisCSV{
		Error:        false,
		MensajeError: nil,
		Contenido:    contenidoProcesado,
	}
}

func escribirLibro(canal chan AnalisisCSV) (string, error) {
	tiempoActual := time.Now()
	tiempoActualUnix := tiempoActual.Unix()
	nuevoNombre := fmt.Sprint("csv_procesado_", tiempoActualUnix, ".xlsx")

	var libroCalculoFinal [][]string
	primeraLinea := []string{"Fecha contable", "Fecha valor", "Concepto", "Importe", "Moneda", "Saldo", "Moneda", "Concepto ampliado", "Categoria"}
	libroCalculoFinal = append(libroCalculoFinal, primeraLinea)
	for info := range canal {
		if info.Error {
			gestionarError("error:", info.MensajeError)
			continue
		}
		libroCalculoFinal = append(libroCalculoFinal, info.Contenido...)
	}

	nuevoLibro := excelize.NewFile()
	hojaPrincipal := nuevoLibro.NewSheet("Datos")
	for indice, valor := range libroCalculoFinal {
		celda := fmt.Sprint("A", indice+1)
		b := make([]interface{}, len(valor))
		for i := range valor {
			b[i] = valor[i]
		}
		err := nuevoLibro.SetSheetRow("Datos", celda, &b)
		if err != nil {
			fmt.Println(err)
		}
	}

	nuevoLibro.SetActiveSheet(hojaPrincipal)

	guardarLibro := nuevoLibro.SaveAs(nuevoNombre)
	if guardarLibro != nil {
		gestionarError("error: error guardando el libro de cálculo", guardarLibro)
		return nuevoNombre, guardarLibro
	}
	return nuevoNombre, nil
}

var wg sync.WaitGroup

func main() {
	saludar()
	ejecutable, errorEjecutable := os.Executable()
	if errorEjecutable != nil {
		gestionarError("error: no se ha podido obtener la ruta del ejecutable", errorEjecutable)
		return
	}
	rutaEjecutable := path.Dir(ejecutable)

	clavesCategoria, clavesCategoriaError := obtenerClavesCategoria(rutaEjecutable)
	if clavesCategoriaError != nil {
		return
	}

	archivosCSV, archivosCSVError := obtenerArchivosCSV(rutaEjecutable)
	if archivosCSVError != nil {
		return
	}

	canal := make(chan AnalisisCSV)
	for _, archivo := range archivosCSV {
		wg.Add(1)
		go procesarCSV(archivo, clavesCategoria, canal)
	}
	go func() {
		wg.Wait()
		close(canal)
	}()

	nuevoArchivo, nuevoArchivoError := escribirLibro(canal)
	if nuevoArchivoError != nil {
		return
	}

	cerrar(nuevoArchivo)
}
