@echo off
setlocal
cd /d "%~dp0"
title Territory With Flags
echo Starting Territory With Flags...
echo   Bridge  : http://localhost:3020
echo   Game    : http://localhost:1935
echo.
echo Put http://localhost:1935 in your OBS browser source.
echo.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process 'http://localhost:1935'"
call npm run dev
endlocal
