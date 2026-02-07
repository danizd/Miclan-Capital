# Instrucciones para ejecutar el servidor

## Instalación de dependencias

Primero, debes instalar Node.js si no lo tienes. Luego, abre una terminal en este directorio y ejecuta:

```bash
npm install
```

## Iniciar el servidor

Para iniciar el servidor, ejecuta:

```bash
npm start
```

El servidor se ejecutará en http://localhost:3000

## Modo desarrollo (con reinicio automático)

Para desarrollo con reinicio automático cuando cambies archivos:

```bash
npm run dev
```

## Uso

Una vez el servidor esté corriendo:

1. Abre tu navegador en http://localhost:3000
2. Navega a compras.html
3. Ahora las compras se guardarán automáticamente en los archivos CSV correspondientes en la carpeta `Compras-online/`

## Notas importantes

- El servidor debe estar ejecutándose para que las compras se guarden en los archivos CSV
- Si el archivo CSV del año no existe, se creará automáticamente
- Los archivos se guardan en la carpeta `Compras-online/` con el formato `{año}.csv`
