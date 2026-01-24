@echo off
title Dashboard Financiero Personal
echo ====================================================
echo      INICIANDO DASHBOARD FINANCIERO PERSONAL
echo ====================================================
echo.
echo [1/2] Iniciando servidor local en el puerto 8000...
echo [2/2] Abriendo navegador predeterminado...
echo.
echo  > Para DETENER el servidor, cierra esta ventana.
echo.

:: Abrir el navegador en localhost:8000
start http://localhost:8000

:: Iniciar el servidor web de Python
python -m http.server 8000
