# 🍓 Despliegue en Raspberry Pi (Docker)

Esta guía detalla cómo poner en marcha el dashboard de **Miclan Capital** en una Raspberry Pi para que esté siempre accesible en tu red local.

## 1. Instalación de Docker y Docker Compose

Si aún no tienes Docker en tu Raspberry Pi (Raspberry Pi OS / Debian), ejecuta:

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker utilizando el script oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Añadir tu usuario al grupo docker (para no usar sudo siempre)
sudo usermod -aG docker $USER

# Instalar dependencias para Docker Compose
sudo apt install -y libffi-dev libssl-dev python3 python3-pip
sudo apt install -y docker-compose-plugin
```

*Nota: Reinicia la sesión (cierra y abre terminal) para que el cambio de grupo surta efecto.*

## 2. Preparación del Proyecto

Crea una carpeta para el proyecto y copia los archivos necesarios (puedes usar `git clone` si lo tienes en un repo):

```bash
mkdir -p ~/proyectos/miclan-capital
cd ~/proyectos/miclan-capital
```

Asegúrate de tener estos archivos en la carpeta:
- `index.html`
- `styles.css`
- `app.js`
- `datos_ejemplo.csv` (o tu archivo real)
- `Dockerfile`
- `docker-compose.yml`

## 3. Configuración de Datos en Vivo

El archivo `docker-compose.yml` está configurado para leer tu CSV local. Asegúrate de que el nombre del archivo en tu Raspberry coincida con el que aparece en el bloque `volumes` de tu `docker-compose.yml`.

Por defecto está así:
```yaml
volumes:
  - ./Cuentas_casa+elena2015-2025.csv:/usr/share/nginx/html/Cuentas_casa+elena2015-2025.csv
```

## 4. Despliegue

Desde la carpeta del proyecto, ejecuta:

```bash
docker compose up -d --build
```

Esto descargará la imagen ligera de Nginx (arquitectura ARM compatible con Pi), copiará tus archivos y arrancará el servidor en el puerto **8000**.

## 5. Acceso desde otros dispositivos

Para entrar desde tu móvil, tablet u otro PC:

1. **Obtén la IP de tu Raspberry Pi:**
   ```bash
   hostname -I
   ```
   *(Ejemplo: 192.168.1.15)*

2. **Abre el navegador en cualquier dispositivo de la red:**
   `http://192.168.1.15:8000`

## 6. Actualización de Datos

Cuando tengas nuevos movimientos, simplemente sobreescribe el archivo `.csv` en la carpeta de la Raspberry Pi. Como está montado como un **volumen**, los cambios se verán reflejados al refrescar el navegador (no hace falta reiniciar Docker).

---
**Tip:** Para que el dashboard se inicie solo tras un apagón, `restart: unless-stopped` ya está configurado en tu `docker-compose.yml`.
