@echo off
REM Kanban Task Management Tool Launcher

echo Starting Kanban Task Management Tool...
echo.

REM Check and create virtual environment
if not exist ".venv" (
    echo Creating virtual environment with Python 3.11...
    py -3.11 -m venv .venv
    echo Virtual environment created.
)

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install required packages
if not exist "requirements.txt.npminstalled" (
    echo Installing packages from requirements.txt...
    pip install -r requirements.txt
    type nul > requirements.txt.npminstalled
)

REM Start server
echo Starting Flask server...
echo The application will open at http://127.0.0.1:5000
echo Press Ctrl+C to stop the server
echo.

REM Open browser automatically
start http://127.0.0.1:5000

python app.py

REM Pause on error
if errorlevel 1 (
    echo.
    echo An error occurred. Press any key to exit...
    pause >nul
)