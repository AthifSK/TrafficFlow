@echo off
title TrafficFlow Launcher
echo ============================================
echo  Launching TrafficFlow Application
echo ============================================
echo.
echo Starting Backend (FastAPI on port 8000)...
start "TrafficFlow Backend" /D "C:\Users\athif\OneDrive\Desktop\Unsupervised_Pro\trafficflow\backend" cmd /k "C:\Users\athif\OneDrive\Desktop\Unsupervised_Pro\trafficflow\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend (React on port 5173)...
start "TrafficFlow Frontend" /D "C:\Users\athif\OneDrive\Desktop\Unsupervised_Pro\trafficflow\frontend" cmd /k "set PATH=C:\Users\athif\AppData\Local\node_env\Scripts;%PATH% && node C:\Users\athif\AppData\Local\node_env\Scripts\node_modules\npm\bin\npm-cli.js run dev"

echo.
echo ============================================
echo  Both servers are starting!
echo  Open your browser after ~10 seconds:
echo.
echo  Web App  -^>  http://localhost:5173
echo  API Docs -^>  http://127.0.0.1:8000/docs
echo ============================================
timeout /t 10 /nobreak >nul
start "" "http://localhost:5173"
