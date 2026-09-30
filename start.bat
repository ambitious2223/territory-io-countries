@echo off
cd /d "%~dp0"
echo Starting Territory With Swords on port 1935...
echo.
start "" "http://localhost:1935"
npx vite --port 1935
