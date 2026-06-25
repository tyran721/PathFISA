$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath ".venv")) {
    python -m venv .venv
}

& ".venv\Scripts\python.exe" -m pip install --upgrade pip
& ".venv\Scripts\python.exe" -m pip install -r "apps\api\requirements.txt"
npm install
npm --prefix "apps\web" install

Write-Host ""
Write-Host "PathFISA setup completed." -ForegroundColor Green
Write-Host "Run: npm run dev"
