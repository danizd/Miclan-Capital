# Usar imagen base ligera de Nginx
FROM nginx:alpine

# Copiar configuración personalizada de Nginx (opcional, pero buena práctica)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos del proyecto al directorio público de Nginx
COPY . /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Comando por defecto (no es necesario especificarlo en nginx, pero explícito)
CMD ["nginx", "-g", "daemon off;"]
