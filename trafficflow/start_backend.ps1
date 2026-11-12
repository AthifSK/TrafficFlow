$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\backend"
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting TrafficFlow FastAPI Backend Server on port 8000" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
