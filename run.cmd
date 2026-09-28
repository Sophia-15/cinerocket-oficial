@echo off
where py >nul 2>&1
if errorlevel 1 goto python
py -3 "%~dp0run.py" %*
exit /b %errorlevel%
:python
python "%~dp0run.py" %*
exit /b %errorlevel%
