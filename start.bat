@echo off
title State.io Live

set "PROJECT_DIR=%~dp0"
if not exist "%PROJECT_DIR%server.js" (
    set "PROJECT_DIR=%~dp0state-io-live"
)
if not exist "%PROJECT_DIR%server.js" (
    echo ERROR: Cannot find server.js
    echo Make sure start.bat is in the state-io-live folder
    pause
    exit /b 1
)

cd /d "%PROJECT_DIR%"
echo Starting from: %CD%
echo.

if exist ".port" del ".port"

start /b node server.js

:wait
if exist ".port" goto ready
timeout /t 1 /nobreak >nul
goto wait

:ready
set /p PORT=<.port
del ".port"

echo Server running on port %PORT%
echo Opening browser...
echo.

start chrome "http://localhost:%PORT%"

echo.
echo ============================================
echo   Game + Debug panel is open!
echo   Close this window to stop the server.
echo ============================================
echo.
pause
