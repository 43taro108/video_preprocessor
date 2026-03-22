@echo off
echo ============================================
echo   Video Preprocessor - Initial Setup
echo ============================================
echo.

REM ── Check Python ──
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python が見つかりません。
    echo         https://www.python.org/downloads/ からインストールしてください。
    echo         インストール時に「Add Python to PATH」にチェックを入れてください。
    pause
    exit /b 1
)
echo [OK] Python found:
python --version

REM ── Check Node.js ──
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js が見つかりません。
    echo         https://nodejs.org/ からインストールしてください。
    pause
    exit /b 1
)
echo [OK] Node.js found:
node --version
echo.

REM ── Install backend dependencies ──
echo ── Backend のセットアップ ──
cd /d %~dp0backend
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Backend のインストールに失敗しました。
    pause
    exit /b 1
)
echo [OK] Backend の準備完了
echo.

REM ── Install frontend dependencies ──
echo ── Frontend のセットアップ ──
cd /d %~dp0frontend
call npm install
if errorlevel 1 (
    echo [ERROR] Frontend のインストールに失敗しました。
    pause
    exit /b 1
)
echo [OK] Frontend の準備完了
echo.

echo ============================================
echo   セットアップ完了！
echo   run.bat をダブルクリックしてアプリを起動してください。
echo ============================================
pause
