@echo off
setlocal
cd /d "%~dp0"
echo FFAX LIVE LOCAL MODEL ACCEPTANCE - owner PC only
if not exist "package.json" (
  echo ERROR: PACKAGE_MISSING. Extract the entire review ZIP first.
  pause
  exit /b 1
)
if not exist "scripts\react_real_probe.mjs" (
  echo ERROR: LIVE_CHECK_SCRIPT_MISSING.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: NODE_NOT_FOUND. Install Node.js 22 from nodejs.org.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: NPM_NOT_FOUND. Reinstall the official Node.js 22 distribution.
  pause
  exit /b 1
)
echo.
echo Prerequisite: Ollama installed and 'ollama pull qwen3:4b-instruct' completed.
echo This test uses 12 frozen non-sensitive briefs, localhost only, and does NOT apply changes.
echo Installing public npm development packages, if required...
call npm install --ignore-scripts --no-audit --no-fund --package-lock=false
if errorlevel 1 (
  echo ERROR: NPM_INSTALL_FAILED. No real-model acceptance was run.
  pause
  exit /b 1
)
echo.
echo Running actual local model and React 19 strict typecheck/render verification.
echo This can be slow on CPU. Do not close this window before the report is written.
node scripts\react_real_probe.mjs --local --approve-local --model=qwen3:4b-instruct > "FFAX-LIVE-MODEL-RESULT.json"
set "RESULT=%ERRORLEVEL%"
if not exist "FFAX-LIVE-MODEL-RESULT.json" (
  echo ERROR: RESULT_FILE_MISSING.
  pause
  exit /b 1
)
type "FFAX-LIVE-MODEL-RESULT.json"
echo.
if "%RESULT%"=="0" (
  echo LOCAL_LIVE_PROBE_PASS. UX owner acceptance is still required.
) else (
  echo LOCAL_LIVE_PROBE_FAIL_OR_INCOMPLETE. Review failures in FFAX-LIVE-MODEL-RESULT.json.
)
echo Send the non-sensitive FFAX-LIVE-MODEL-RESULT.json and SOURCE_SHA.txt for evidence review.
pause
exit /b %RESULT%
