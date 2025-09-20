@echo off
echo 🚀 Starting SIH Flask YOLO Model...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python first.
    pause
    exit /b 1
)

REM Check if pip is installed
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip is not installed. Please install pip first.
    pause
    exit /b 1
)

REM Navigate to SIH directory
cd SIH

REM Check if requirements.txt exists
if not exist "requirements.txt" (
    echo ❌ requirements.txt not found in SIH directory
    pause
    exit /b 1
)

REM Install Python dependencies
echo 📦 Installing Python dependencies...
pip install -r requirements.txt

REM Check if best.pt model exists
if not exist "best.pt" (
    echo ⚠️ best.pt model file not found. Make sure your trained model is in the SIH directory.
    echo 💡 If you need to download it, update the MODEL_URL in app.py
)

REM Start Flask server
echo 🤖 Starting Flask YOLO model server on port 5000...
echo 🌐 Health check: http://localhost:5000/health
echo 🔄 Process endpoint: http://localhost:5000/process_all
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
pause
