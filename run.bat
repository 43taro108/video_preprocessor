@echo off
setlocal

REM ── Configuration ──
set BACKEND_PORT=8002
set FRONTEND_PORT=5174
set CONDA_ENV=phmr

REM ── Start Backend ──
echo Starting backend on port %BACKEND_PORT%...
start "VideoPreprocessor-Backend" cmd /k "call conda activate %CONDA_ENV% && cd /d %~dp0backend && python run.py"

REM ── Start Frontend ──
echo Starting frontend on port %FRONTEND_PORT%...
start "VideoPreprocessor-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:%BACKEND_PORT%
echo Frontend: http://localhost:%FRONTEND_PORT%
echo.
pause
