@echo off
setlocal enableextensions enabledelayedexpansion

echo =========================================
echo       IAS Project - Setup Script
echo =========================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js (https://nodejs.org/) and try again.
    echo.
    pause
    exit /b 1
)

echo [1/3] Checking Node.js and NPM versions...
node -v
call npm -v
echo.

:: Check for .env file
if not exist .env (
    if exist .env.example (
        echo [2/3] Creating default .env file from .env.example...
        copy .env.example .env >nul
    ) else (
        echo [2/3] No .env or .env.example file found. Skipping environment file creation.
    )
) else (
    echo [2/3] Existing .env file found.
)
echo.

:: Install dependencies
echo [3/3] Installing npm dependencies...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies. Please check the logs above.
    echo.
    pause
    exit /b 1
)

echo.
echo =========================================
echo   Setup completed successfully!
echo   You can now launch the app with run.bat
echo =========================================
echo.
pause
