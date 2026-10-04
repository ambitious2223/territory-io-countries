@echo off
setlocal
cd /d "%~dp0"
title Territory With Flags
echo Starting Territory With Flags...
echo   Bridge  : http://localhost:3020
echo   Game    : http://localhost:1935
echo.
if defined TIKORA_GAME_LAUNCH_URL (
  set "GAME_URL=%TIKORA_GAME_LAUNCH_URL%"
) else (
  set "GAME_URL=http://localhost:1935"
)
echo Opening %GAME_URL%
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 5; Start-Process '%GAME_URL%'"
call npm run dev
endlocal
