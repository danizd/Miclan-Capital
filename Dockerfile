# Usar imagen base ligera de Nginx
FROM nginx:alpine

# Copiar los archivos del proyecto al directorio público de Nginx
COPY index.html compras.html styles.css app.js compras.js /usr/share/nginx/html/
COPY datos_ejemplo.csv Vacaciones.csv /usr/share/nginx/html/
COPY capturas /usr/share/nginx/html/capturas
COPY Compras-online /usr/share/nginx/html/Compras-online

# Configuración de Nginx para proxy API
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
    } \
    location /api/ { \
        proxy_pass http://api:3000/api/; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Exponer el puerto 80
EXPOSE 80

# Comando por defecto
CMD ["nginx", "-g", "daemon off;"]
