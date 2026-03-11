$ErrorActionPreference = "Stop"

$targetPorts = @(3000, 5173)

$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $targetPorts }

if (-not $connections) {
  Write-Host "[INFO] No RoleOS local web services are listening on ports 3000/5173."
  exit 0
}

$processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $processIds) {
  try {
    $proc = Get-Process -Id $processId -ErrorAction Stop
    Stop-Process -Id $processId -Force -ErrorAction Stop
    Write-Host "[OK] Stopped PID $processId ($($proc.ProcessName))."
  } catch {
    Write-Host "[WARN] Failed to stop PID ${processId}: $($_.Exception.Message)"
  }
}

Write-Host "[OK] Stop command completed."
