@echo off
setlocal
set CONDA_ENV=phmr

echo ── Installing backend dependencies ──
call conda activate %CONDA_ENV%
cd /d %~dp0backend
pip install -r requirements.txt

echo.
echo ── Installing frontend dependencies ──
cd /d %~dp0frontend
call npm install

echo.
echo Setup complete!
echo Run 'run.bat' to start the application.
pause
