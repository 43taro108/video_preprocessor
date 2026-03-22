@echo off
chcp 65001 >nul 2>&1
echo ============================================
echo   Video Preprocessor - Initial Setup
echo ============================================
echo.

REM -- Check Python --
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo         Download from https://www.python.org/downloads/
    echo         IMPORTANT: Check "Add Python to PATH" during install.
    pause
    exit /b 1
)
echo [OK] Python found:
python --version

REM -- Check Node.js --
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo         Download from https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found:
node --version
echo.

REM -- Install backend dependencies --
echo -- Installing backend dependencies --
cd /d "%~dp0backend"
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Backend install failed.
    pause
    exit /b 1
)
echo [OK] Backend ready
echo.

REM -- Install frontend dependencies --
echo -- Installing frontend dependencies --
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend install failed.
    pause
    exit /b 1
)
echo [OK] Frontend ready
echo.

echo ============================================
echo   Setup complete!
echo   Double-click run.bat to start the app.
echo ============================================
pause
