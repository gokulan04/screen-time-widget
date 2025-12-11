# Debug script to check event log access and available events

Write-Host "=== Checking Security Event Log Access ===" -ForegroundColor Cyan

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Host "Running as Administrator: $isAdmin" -ForegroundColor $(if ($isAdmin) { "Green" } else { "Yellow" })

# Get today's date range
$StartTime = (Get-Date).Date
$EndTime = Get-Date
Write-Host "`nSearching from: $StartTime" -ForegroundColor Gray
Write-Host "Searching to: $EndTime" -ForegroundColor Gray

# Try to access Security log
Write-Host "`n=== Testing Security Log Access ===" -ForegroundColor Cyan
try {
    $testEvent = Get-WinEvent -LogName 'Security' -MaxEvents 1 -ErrorAction Stop
    Write-Host "✓ Can access Security log" -ForegroundColor Green
    Write-Host "  Most recent event: $($testEvent.TimeCreated)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Cannot access Security log: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Try running PowerShell as Administrator" -ForegroundColor Yellow
    exit
}

# Check for lock/unlock events (4800, 4801) in the last 7 days
Write-Host "`n=== Checking for Lock/Unlock Events (Last 7 Days) ===" -ForegroundColor Cyan
$sevenDaysAgo = (Get-Date).AddDays(-7)
try {
    $lockUnlockEvents = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        Id = 4800, 4801
        StartTime = $sevenDaysAgo
    } -ErrorAction Stop

    Write-Host "✓ Found $($lockUnlockEvents.Count) lock/unlock events in last 7 days" -ForegroundColor Green

    # Show last few events
    Write-Host "`nLast 5 events:" -ForegroundColor Gray
    $lockUnlockEvents | Select-Object -First 5 | ForEach-Object {
        $eventType = if ($_.Id -eq 4800) { "LOCK" } else { "UNLOCK" }
        Write-Host "  [$eventType] $($_.TimeCreated)" -ForegroundColor $(if ($_.Id -eq 4800) { "Red" } else { "Green" })
    }
} catch {
    Write-Host "✗ No lock/unlock events found: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check for today's events specifically
Write-Host "`n=== Checking Today's Events ===" -ForegroundColor Cyan
try {
    $todayEvents = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        Id = 4800, 4801
        StartTime = $StartTime
        EndTime = $EndTime
    } -ErrorAction Stop

    Write-Host "✓ Found $($todayEvents.Count) events today" -ForegroundColor Green
} catch {
    Write-Host "✗ No events today: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check for alternative event sources (System log)
Write-Host "`n=== Checking System Log for Power Events ===" -ForegroundColor Cyan
try {
    # Event 1 = Power on/resume, Event 42 = Sleep
    $powerEvents = Get-WinEvent -FilterHashtable @{
        LogName = 'System'
        ProviderName = 'Microsoft-Windows-Power-Troubleshooter'
        StartTime = $StartTime
    } -MaxEvents 10 -ErrorAction Stop

    Write-Host "✓ Found $($powerEvents.Count) power events today" -ForegroundColor Green
} catch {
    Write-Host "No power troubleshooter events: $($_.Exception.Message)" -ForegroundColor Gray
}

# Check for session lock events in System log
try {
    $sessionEvents = Get-WinEvent -FilterHashtable @{
        LogName = 'System'
        ProviderName = 'Microsoft-Windows-Winlogon'
        StartTime = $StartTime
    } -ErrorAction Stop

    Write-Host "✓ Found $($sessionEvents.Count) Winlogon events today" -ForegroundColor Green
    $sessionEvents | Select-Object -First 5 | ForEach-Object {
        Write-Host "  [Event $($_.Id)] $($_.TimeCreated) - $($_.Message.Split("`n")[0])" -ForegroundColor Gray
    }
} catch {
    Write-Host "No Winlogon events found: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "If no lock/unlock events were found, you may need to:" -ForegroundColor Yellow
Write-Host "1. Enable audit policy: run 'auditpol /set /subcategory:`"Other Logon/Logoff Events`" /success:enable'" -ForegroundColor Yellow
Write-Host "2. Lock and unlock your workstation (Win+L) to generate test events" -ForegroundColor Yellow
Write-Host "3. Consider using alternative event sources (System log)" -ForegroundColor Yellow
