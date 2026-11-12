$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location "$scriptDir\frontend"
$env:PATH = "C:\Users\athif\AppData\Local\node_env\Scripts;" + $env:PATH
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting TrafficFlow React Vite Frontend on port 5173" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
node "C:\Users\athif\AppData\Local\node_env\Scripts\node_modules\npm\bin\npm-cli.js" run dev
