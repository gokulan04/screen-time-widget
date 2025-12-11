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
try {
    $events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        Id = 4800, 4801
        StartTime = $StartTime
        EndTime = $EndTime
    } | Sort-Object TimeCreated
} catch {
    # No events found or error accessing event log
    $events = @()
}

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
                StartTime = $lastLockTime.ToString("hh:mm tt")
                EndTime   = $event.TimeCreated.ToString("hh:mm tt")
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
            StartTime = $unlockTime.ToString("hh:mm tt")
            EndTime   = $lockTime.ToString("hh:mm tt")
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
        StartTime = $unlockTime.ToString("hh:mm tt")
        EndTime   = $now.ToString("hh:mm tt")
        Duration  = Format-Duration -duration $duration
    }
}

# Sum total durations
$totalSessionTicks = ($activeSessions | ForEach-Object {
    $start = [DateTime]::ParseExact($_.StartTime, "hh:mm tt", $null)
    $end = [DateTime]::ParseExact($_.EndTime, "hh:mm tt", $null)
    # Handle sessions crossing midnight
    if ($end -lt $start) {
        $end = $end.AddDays(1)
    }
    ($end - $start).Ticks
}) | Measure-Object -Sum

$totalBreakTicks = ($breaks | ForEach-Object {
    $start = [DateTime]::ParseExact($_.StartTime, "hh:mm tt", $null)
    $end = [DateTime]::ParseExact($_.EndTime, "hh:mm tt", $null)
    # Handle breaks crossing midnight
    if ($end -lt $start) {
        $end = $end.AddDays(1)
    }
    ($end - $start).Ticks
}) | Measure-Object -Sum

$totalSessionDuration = if ($totalSessionTicks.Sum) {
    [TimeSpan]::FromTicks($totalSessionTicks.Sum)
} else {
    [TimeSpan]::Zero
}

$totalBreakDuration = if ($totalBreakTicks.Sum) {
    [TimeSpan]::FromTicks($totalBreakTicks.Sum)
} else {
    [TimeSpan]::Zero
}

# Output as JSON
$result = @{
    date = $StartTime.ToShortDateString()
    totalScreenTime = Format-Duration $totalSessionDuration
    totalBreakTime = Format-Duration $totalBreakDuration
    activeSessions = $activeSessions
    breaks = $breaks
}

$result | ConvertTo-Json -Depth 3
