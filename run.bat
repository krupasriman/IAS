@echo off
echo Starting Client (Vite) and Server (Nodemon + TSX)...
start "IAS Client (Vite)" cmd /k "npm run dev"
start "IAS Server (Nodemon)" cmd /k "npm run server:dev"
