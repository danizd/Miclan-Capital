@echo off
title Dashboard Financiero Personal + API
echo ====================================================
echo      INICIANDO DASHBOARD FINANCIERO PERSONAL
echo ====================================================
echo.
echo [1/3] Verificando instalacion de dependencias...
if not exist "node_modules" (
    echo Instalando dependencias de Node.js...
    call npm install
)
echo.
echo [2/3] Iniciando servidor Node.js (API) en puerto 3000...
start /B node server.js
timeout /t 2 /nobreak >nul

echo [3/3] Iniciando servidor web en puerto 8000...
echo.
echo  ^> Servidor API: http://localhost:3000
echo  ^> Dashboard Web: http://localhost:8000
echo.
echo  ^> Para DETENER los servidores, cierra esta ventana.
echo.

:: Abrir el navegador en localhost:8000
start http://localhost:8000

:: Iniciar el servidor web de Python
python -m http.server 8000
