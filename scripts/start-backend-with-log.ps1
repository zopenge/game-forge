$workspaceRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $workspaceRoot 'logs'
$logPath = Join-Path $logDirectory '.tmp-backend-start.log'

if (-not (Test-Path $logDirectory)) {
  New-Item -ItemType Directory -Path $logDirectory | Out-Null
}

if (Test-Path $logPath) {
  Remove-Item -LiteralPath $logPath -Force
}

$command = "Set-Location '$workspaceRoot'; & pnpm --filter @game-forge/backend start *> '$logPath'"

Start-Process -FilePath 'powershell.exe' `
  -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command `
  -WindowStyle Hidden

Write-Output "backend log: $logPath"
