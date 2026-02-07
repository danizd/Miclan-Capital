# Usar Node.js como base
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install --omit=dev

# Copiar todos los archivos del proyecto
COPY . .

# Crear directorio para archivos CSV si no existe
RUN mkdir -p Compras-online

# Exponer puertos (3000 para API, 8000 para archivos estáticos)
EXPOSE 8000

# Iniciar el servidor
CMD ["node", "server.js"]
