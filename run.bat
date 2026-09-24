@echo off
setlocal enableextensions enabledelayedexpansion

echo ===================================================
echo       IAS Study Notes Generator - Launch Script
echo ===================================================
echo.

:: 1. Sanity Checks
if not exist node_modules (
    echo [ERROR] 'node_modules' directory not found.
    echo Please run 'setup.bat' first to install project dependencies.
    echo.
    pause
    exit /b 1
)

if not exist .env (
    echo [WARN] No '.env' file found. Running setup.bat to initialize environment...
    call setup.bat
    if %errorlevel% neq 0 exit /b 1
)

:: 2. Port Collision Warning
netstat -ano | findstr ":5173" >nul 2>nul
if %errorlevel% equ 0 (
    echo [WARN] Port 5173 appears to be in use. Vite may choose an alternate port.
)

netstat -ano | findstr ":3001" >nul 2>nul
if %errorlevel% equ 0 (
    echo [WARN] Port 3001 appears to be in use. Backend startup might conflict.
)

:: 3. Launch Development Servers
echo [1/2] Spawning Vite Frontend (Port 5173)...
start "IAS Frontend [Vite :5173]" cmd /k "title IAS Frontend [Vite] && npm run dev"

echo [2/2] Spawning Express Backend [TSX Watch :3001]...
start "IAS Backend [Express :3001]" cmd /k "title IAS Backend [Express] && npm run server:dev"

echo.
echo ===================================================
echo   Development services launched in separate windows!
echo.
echo   Client URL:   http://localhost:5173
echo   API Health:   http://localhost:3001/api/health
echo   Prometheus:   http://localhost:3001/metrics
echo.
echo   To stop the servers, close their terminal windows
echo   or press Ctrl+C in each terminal.
echo ===================================================
echo.
