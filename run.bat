@echo off
chcp 65001 >nul 2>&1
setlocal

set BACKEND_PORT=8002
set FRONTEND_PORT=5174

REM -- Check if setup has been run --
if not exist "%~dp0frontend\node_modules" (
    echo [ERROR] Setup not completed. Run setup.bat first.
    pause
    exit /b 1
)

REM -- Start Backend --
echo Starting backend on port %BACKEND_PORT%...
start "VideoPreprocessor-Backend" cmd /k "cd /d "%~dp0backend" && python run.py"

REM -- Start Frontend --
echo Starting frontend on port %FRONTEND_PORT%...
start "VideoPreprocessor-Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================
echo   App started!
echo   Open in browser: http://localhost:%FRONTEND_PORT%
echo.
echo   To quit: close the two black windows.
echo ============================================
echo.
pause
