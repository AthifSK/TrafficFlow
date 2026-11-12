@echo off
title TrafficFlow - Backend (FastAPI)
echo ============================================
echo  TrafficFlow Backend Starting on port 8000
echo ============================================
cd /d "C:\Users\athif\OneDrive\Desktop\Unsupervised_Pro\trafficflow\backend"
"C:\Users\athif\OneDrive\Desktop\Unsupervised_Pro\trafficflow\backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
