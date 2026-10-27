# Girru — Backend Self-Restart
#
# Usage (from agent exec tool or terminal):
#   powershell -File "C:\MAMP\htdocs\agent\agent_player\packages\backend\restart-backend.ps1"
#
# How it works:
#   1. Spawns a DETACHED PowerShell process (survives when this script's parent Node.js dies)
#   2. Detached process waits 2s, kills whatever is on port 41522, then starts pnpm dev
#   3. Backend returns in ~5 seconds — the frontend will reconnect automatically

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

$restartCmd = (
    "Start-Sleep 2; " +
    "try { Get-NetTCPConnection -LocalPort 41522 -ErrorAction Stop | " +
    "ForEach-Object { Stop-Process -Id `$_.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}; " +
    "Start-Sleep 1; " +
    "Set-Location '$dir'; " +
    "pnpm dev"
)

Start-Process powershell -WindowStyle Minimized -ArgumentList @(
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    $restartCmd
)

Write-Output "Restart initiated. Backend will be back in ~5 seconds."
Write-Output "Frontend will reconnect automatically."
