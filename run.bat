@echo off
setlocal

set BACKEND_PORT=8002
set FRONTEND_PORT=5174

REM ── Check if setup has been run ──
if not exist "%~dp0frontend\node_modules" (
    echo [ERROR] 初回セットアップが完了していません。
    echo         先に setup.bat を実行してください。
    pause
    exit /b 1
)

REM ── Start Backend ──
echo Starting backend on port %BACKEND_PORT%...
start "VideoPreprocessor-Backend" cmd /k "cd /d %~dp0backend && python run.py"

REM ── Start Frontend ──
echo Starting frontend on port %FRONTEND_PORT%...
start "VideoPreprocessor-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   アプリが起動しました！
echo   ブラウザで以下のURLを開いてください：
echo.
echo   http://localhost:%FRONTEND_PORT%
echo.
echo   終了するには、開いた2つの黒い画面を閉じてください。
echo ============================================
echo.
pause
