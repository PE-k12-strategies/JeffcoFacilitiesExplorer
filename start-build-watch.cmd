@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js not found. Install from https://nodejs.org then run this again.
  pause
  exit /b 1
)

echo Building Live Server bundle...
call npm.cmd run build
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)
echo.
echo Done. Open index.html with Live Server / Go Live.
echo Watching for source edits...
call npm.cmd run build:watch
