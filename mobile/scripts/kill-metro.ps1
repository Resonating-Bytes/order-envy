# Stop Metro/Expo dev servers on common ports (8081-8085).
# Safe to run before starting Order Envy or BoundForTheRoad.
# Usage: powershell -ExecutionPolicy Bypass -File mobile/scripts/kill-metro.ps1

$ports = 8081, 8082, 8083, 8084, 8085
$killed = @{}

foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
        $pid = $conn.OwningProcess
        if ($killed.ContainsKey($pid)) { continue }

        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pid" -ErrorAction SilentlyContinue
        $cmd = $proc?.CommandLine ?? ''
        if ($cmd -notmatch 'expo|metro|react-native|@expo/cli') {
            Write-Host "Port $port -> PID $pid (skipped, not Metro/Expo)"
            Write-Host "  $cmd"
            continue
        }

        Write-Host "Killing PID $pid on port $port"
        Write-Host "  $cmd"
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        $killed[$pid] = $true
    }
}

if ($killed.Count -eq 0) {
    Write-Host "No Metro/Expo listeners found on ports $($ports -join ', ')."
} else {
    Write-Host "Done. Killed $($killed.Count) process(es)."
}
