@echo off
setlocal
cd /d "%~dp0"

echo.
echo Starting AI Trip Planner...
echo.
echo Local URL: http://localhost:4000
echo Health:    http://localhost:4000/api/health
echo.
echo Keep this window open while using the app.
echo Press Ctrl+C to stop the server.
echo.

npm install
if errorlevel 1 (
  echo.
  echo npm install failed. Check the error above.
  pause
  exit /b 1
)

npm start

pause
