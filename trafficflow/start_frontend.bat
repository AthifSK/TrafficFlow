@echo off
title TrafficFlow - Frontend (React)
echo ============================================
echo  TrafficFlow Frontend Starting on port 5173
echo ============================================
cd /d "C:\Users\athif\OneDrive\Desktop\Unsupervised_Pro\trafficflow\frontend"
set PATH=C:\Users\athif\AppData\Local\node_env\Scripts;%PATH%
node "C:\Users\athif\AppData\Local\node_env\Scripts\node_modules\npm\bin\npm-cli.js" run dev
pause
