# ================================
# start-dashboard.ps1
# Spin up dashboard + public URL
# ================================

# ---- SETTINGS ----
# Port for Streamlit
$Port = 8509

# Path to ngrok.exe (matches where you actually have it)
$NgrokPath = "C:\SMEE\sports-edge-ats\.venv\Scripts\ngrok.exe"

# Your ngrok authtoken (from dashboard.ngrok.com)
# If you've already added it with `ngrok config add-authtoken ...`
# you can leave this empty.
$NgrokToken = ""


# ---- STEP 0: cd to script folder so paths behave ----
Set-Location -Path "C:\SMEE\sports-edge-ats"


# ---- STEP 1: Activate virtual environment ----
Write-Host ">> Activating virtual env..."
$venvActivate = ".\.venv\Scripts\Activate.ps1"
if (Test-Path $venvActivate) {
    . $venvActivate
} else {
    Write-Host "ERROR: Couldn't find venv at $venvActivate" -ForegroundColor Red
    exit 1
}


# ---- STEP 2: Ensure deps are installed ----
Write-Host ">> Ensuring dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt


# ---- STEP 3: Start Streamlit dashboard (background) ----
Write-Host ">> Launching Streamlit dashboard on http://localhost:$Port ..."

# Kill anything already using that port (old hung processes)
# We'll try a soft kill: look for streamlit using that port
$old = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
if ($old) {
    foreach ($pid in $old) {
        try {
            Write-Host ">> Closing old process on port $Port (PID $pid)..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        } catch {}
    }
}

# Start Streamlit
$streamlitCmd = "streamlit run src\dashboard_app.py --server.port $Port --server.headless true"
$streamlitProcess = Start-Process powershell -ArgumentList $streamlitCmd -PassThru
Write-Host ">> Streamlit PID: $($streamlitProcess.Id)"


# ---- STEP 4: Start ngrok tunnel ----
if (-not (Test-Path $NgrokPath)) {
    Write-Host "ERROR: ngrok.exe not found at $NgrokPath" -ForegroundColor Red
    Write-Host "Fix `$NgrokPath` in start-dashboard.ps1"
    exit 1
}

# Make sure ngrok knows your token (only needs to happen once on this machine)
if ($NgrokToken -ne "") {
    & $NgrokPath config add-authtoken $NgrokToken
}

Write-Host ">> Starting ngrok tunnel..."
# We run ngrok http pointing to the same port, ask it to print only the URL
# We'll launch ngrok in this same console so we see the URL.
& $NgrokPath http $Port
