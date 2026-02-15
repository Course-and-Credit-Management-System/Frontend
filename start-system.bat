@echo off
echo Starting Course and Credit Management System...
echo.

echo [1/2] Starting Backend Server...
cd /d "%~dp0Backend"
call .\venv\Scripts\Activate.bat
start "Backend Server" cmd /k "python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server...
cd /d "%~dp0Frontend"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo Servers are starting...
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3001
echo API Docs: http://127.0.0.1:8000/docs
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
