@echo off
title Dashboard Financiero Personal
echo ====================================================
echo      INICIANDO DASHBOARD FINANCIERO PERSONAL
echo ====================================================
echo.
echo [1/2] Verificando instalacion de dependencias...
if not exist "node_modules" (
    echo Instalando dependencias de Node.js...
    call npm install
)
echo.
echo [2/2] Iniciando servidor Node.js en puerto 8000...
echo.
echo  ^> Servidor: http://localhost:8000
echo.
echo  ^> Para DETENER el servidor, presiona Ctrl+C
echo.

:: Abrir el navegador
start http://localhost:8000

:: Iniciar el servidor Node.js
node server.js
