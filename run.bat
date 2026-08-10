@echo off
echo Starting Client (Vite) and Server (TSX watch)...
start "IAS Client (Vite)" cmd /k "npm run dev"
start "IAS Server (TSX watch)" cmd /k "npm run server:dev"
