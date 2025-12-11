function Format-Duration {
    param (
        [TimeSpan]$duration
    )

    $hours = [math]::Floor($duration.TotalHours)
    $minutes = $duration.Minutes

    if ($hours -eq 0) {
        return "$minutes min"
    } elseif ($minutes -eq 0) {
        return "$hours hr"
    } else {
        return "$hours hr $minutes min"
    }
}

# Get today's date range
$StartTime = (Get-Date).Date
$EndTime = Get-Date

# Get today's lock/unlock events
$events = Get-WinEvent -FilterHashtable @{
    LogName = 'Security'
    Id = 4800, 4801
    StartTime = $StartTime
    EndTime = $EndTime
} | Sort-Object TimeCreated

# Initialize session tracking
$activeSessions = @()
$breaks = @()
$unlockTime = $null
$lastLockTime = $null

# Pair unlock → lock events, or unlock → now (if no lock yet)
foreach ($event in $events) {
    if ($event.Id -eq 4801) {
        # Break calculation
        if ($lastLockTime) {
            $breakDuration = $event.TimeCreated - $lastLockTime
            $breaks += [PSCustomObject]@{
                StartTime = $lastLockTime
                EndTime   = $event.TimeCreated
                Duration  = Format-Duration -duration $breakDuration
            }
            $lastLockTime = $null
        }
        $unlockTime = $event.TimeCreated
    }
    elseif ($event.Id -eq 4800 -and $unlockTime) {
        $lockTime = $event.TimeCreated
        $duration = $lockTime - $unlockTime
        $activeSessions += [PSCustomObject]@{
            StartTime = $unlockTime
            EndTime   = $lockTime
            Duration  = Format-Duration -duration $duration
        }
        $lastLockTime = $lockTime
        $unlockTime = $null
    }
}

# If the last unlock event has no matching lock, assume session is ongoing
if ($unlockTime) {
    $now = Get-Date
    $duration = $now - $unlockTime
    $activeSessions += [PSCustomObject]@{
        StartTime = $unlockTime
        EndTime   = $now
        Duration  = Format-Duration -duration $duration
    }
}

# Sum total durations
$totalSessionTicks = ($activeSessions | ForEach-Object {
    ($_.EndTime - $_.StartTime).Ticks
}) | Measure-Object -Sum

$totalBreakTicks = ($breaks | ForEach-Object {
    ($_.EndTime - $_.StartTime).Ticks
}) | Measure-Object -Sum

$totalSessionDuration = [TimeSpan]::FromTicks($totalSessionTicks.Sum)
$totalBreakDuration = [TimeSpan]::FromTicks($totalBreakTicks.Sum)

# Output
Write-Host "`nToday Screen Time (" $StartTime.ToShortDateString() "): $(Format-Duration $totalSessionDuration)" -ForegroundColor Green
Write-Host "Total Break Time: $(Format-Duration $totalBreakDuration)" -ForegroundColor Yellow

# Show details
Write-Host "`nActive Sessions:" -ForegroundColor Cyan
$activeSessions | Format-Table StartTime, EndTime, Duration -AutoSize

Write-Host "`nBreak Durations:" -ForegroundColor Cyan
$breaks | Format-Table StartTime, EndTime, Duration -AutoSize
