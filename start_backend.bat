@echo off
setlocal
set CONDA_ENV=phmr
echo Starting backend...
call conda activate %CONDA_ENV%
cd /d %~dp0backend
python run.py
pause
