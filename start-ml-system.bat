@echo off
echo ========================================
echo   CivicConnect ML System Startup
echo ========================================
echo.

echo [1/3] Starting Flask YOLO Model...
start "Flask YOLO Model" cmd /k "cd SIH && python app.py"
echo    Flask model starting on port 5001...
echo.

echo [2/3] Waiting for Flask model to initialize...
timeout /t 10 /nobreak
echo.

echo [3/3] Starting Main CivicConnect Server...
start "CivicConnect Server" cmd /k "cd Civic_Connect && nodemon server.js"
echo    Main server starting on port 5000...
echo.

echo ========================================
echo   Both services are starting up!
echo ========================================
echo.
echo Flask YOLO Model:  http://localhost:5001
echo Main Server:      http://localhost:5000
echo.
echo Check the terminal windows for startup logs.
echo Press any key to exit this launcher...
pause >nul
