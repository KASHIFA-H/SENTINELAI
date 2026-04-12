@echo off
echo Starting SentinelShield AI...
echo.

start "SentinelShield Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

start "SentinelShield Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo Both servers starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Open http://localhost:5173 in your browser
echo (If 5173 is busy it will use 5174 or 5175)
pause
