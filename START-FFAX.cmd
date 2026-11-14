@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo FFAX needs Node.js 20+ to run.
 echo Read OWNER_QUICKSTART_KO.md for the official installation instructions.
 pause
 exit /b 1
)
echo FFAX owner-only localhost review.
echo Open http://127.0.0.1:4173 in your browser.
echo Close this console window or press Ctrl+C to stop.
node src\server.mjs
if errorlevel 1 (
 echo FFAX failed to start. Verify that port 4173 is not in use.
 pause
 exit /b 1
)
endlocal
