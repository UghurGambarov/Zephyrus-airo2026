@echo off
REM =====================================================================
REM Zephyrus — "City Trap" layihəsini işə salan skript (Windows)
REM Bu fayl HƏM backend (FastAPI), HƏM də frontend (React/Vite) serverini
REM iki ayrı pəncərədə işə salır.
REM
REM İstifadə: bu faylın üstünə iki dəfə klikləyin VƏ YA terminalda yazın:
REM     run.bat
REM
REM Backend ünvanı:  http://127.0.0.1:8010
REM Frontend ünvanı: http://localhost:5173
REM =====================================================================

echo ========================================
echo   Zephyrus City Trap - ise salinir...
echo ========================================

REM --- Backend serverini yeni pencerede ise sal ---
REM .venv icindeki uvicorn ile main.py-ni 8010 portunda isledir.
start "Zephyrus Backend" cmd /k ".venv\Scripts\python.exe -m uvicorn main:app --reload --port 8010 --app-dir src\backend"

REM --- Frontend serverini yeni pencerede ise sal ---
start "Zephyrus Frontend" cmd /k "cd src\frontend && npm run dev"

echo.
echo Iki pencere acildi: Backend (8010) ve Frontend (5173).
echo Brauzerde aciq: http://localhost:5173
echo.
