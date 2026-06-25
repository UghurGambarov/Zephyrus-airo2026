# =====================================================================
# Zephyrus City Trap — local development launcher (Windows / PowerShell).
# Starts the backend (FastAPI, port 8010) and frontend (Vite, port 5173)
# in two separate windows.
#
# Usage (from the repository root):
#   ./scripts/run-dev.ps1
#
# Backend:  http://127.0.0.1:8010
# Frontend: http://localhost:5173
# =====================================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting Zephyrus City Trap (dev)..." -ForegroundColor Cyan

# Backend — prefer the project venv if present, else the system Python.
$venvPython = Join-Path $root ".venv\Scripts\python.exe"
$python = if (Test-Path $venvPython) { $venvPython } else { "python" }

Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root\backend'; & '$python' -m uvicorn app.main:app --reload --port 8010"
)

# Frontend.
Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "Set-Location '$root\frontend'; npm run dev"
)

Write-Host "Backend (8010) and Frontend (5173) launched." -ForegroundColor Green
Write-Host "Open: http://localhost:5173"
