@echo off
setlocal enableextensions enabledelayedexpansion

echo ===================================================
echo       IAS Study Notes Generator - Setup Script
echo ===================================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js 22+ (https://nodejs.org/) and try again.
    echo.
    pause
    exit /b 1
)

echo [1/4] Checking Node.js and NPM versions...
for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VERSION=%%v
echo       Node.js version: %NODE_VERSION%
echo       NPM version:     %NPM_VERSION%
echo.

:: 2. Environment Configuration
echo [2/4] Setting up environment configuration (.env)...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo       Created .env from .env.example
    ) else (
        echo [WARN] .env.example not found. Creating minimal .env...
        echo PORT=3001 > .env
        echo NODE_ENV=development >> .env
        echo AUTH_MODE=local >> .env
    )
) else (
    echo       Existing .env file detected.
)

:: Ensure a valid 32-byte base64 ENCRYPTION_KEY exists in .env
findstr /C:"ENCRYPTION_KEY" .env >nul 2>nul
if %errorlevel% neq 0 (
    echo       Generating secure 32-byte AES-256-GCM encryption key...
    for /f "delims=" %%k in ('node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"') do (
        echo.>> .env
        echo ENCRYPTION_KEY=%%k>> .env
    )
    echo       Appended generated ENCRYPTION_KEY to .env
)
echo.

:: 3. Install Dependencies
echo [3/4] Installing project dependencies...
if exist package-lock.json (
    call npm ci
) else (
    call npm install
)
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Dependency installation failed. Retrying with 'npm install'...
    call npm install
    if %errorlevel% neq 0 (
        echo [FATAL] npm install failed. Please inspect errors above.
        pause
        exit /b 1
    )
)
echo       Dependencies installed successfully.
echo.

:: 4. Verify Local Folders & Tools
echo [4/4] Verifying local environment...
if not exist data (
    mkdir data >nul
)

:: Check for Docker
where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo       [Docker] Docker CLI detected. You can use 'docker compose up -d' for containerized stack.
) else (
    echo       [Docker] Docker not detected in PATH. Native local development is ready.
)

echo.
echo ===================================================
echo   Setup completed successfully!
echo.
echo   Next Steps:
echo   1. Verify your database connection in .env:
echo      DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ias
echo   2. Run 'run.bat' to launch Vite frontend + Express server.
echo ===================================================
echo.
pause
