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

# Try to get today's lock/unlock events
try {
    $events = Get-WinEvent -FilterHashtable @{
        LogName = 'Security'
        Id = 4800, 4801
        StartTime = $StartTime
        EndTime = $EndTime
    } -ErrorAction Stop | Sort-Object TimeCreated

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
                    Duration  = $breakDuration
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
                Duration  = $duration
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
            Duration  = $duration
        }
    }

    # Sum total durations
    $totalSessionTicks = ($activeSessions | ForEach-Object {
        $_.Duration.Ticks
    } | Measure-Object -Sum).Sum

    $totalBreakTicks = ($breaks | ForEach-Object {
        $_.Duration.Ticks
    } | Measure-Object -Sum).Sum

    if ($null -eq $totalSessionTicks) { $totalSessionTicks = 0 }
    if ($null -eq $totalBreakTicks) { $totalBreakTicks = 0 }

    $totalSessionDuration = [TimeSpan]::FromTicks($totalSessionTicks)
    $totalBreakDuration = [TimeSpan]::FromTicks($totalBreakTicks)

    # Output JSON
    $output = @{
        date = $StartTime.ToShortDateString()
        screenTime = @{
            formatted = Format-Duration -duration $totalSessionDuration
            totalMinutes = [math]::Floor($totalSessionDuration.TotalMinutes)
        }
        breakTime = @{
            formatted = Format-Duration -duration $totalBreakDuration
            totalMinutes = [math]::Floor($totalBreakDuration.TotalMinutes)
        }
        lastUpdated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        success = $true
    }

    $output | ConvertTo-Json -Compress
}
catch {
    # Error handling - return JSON with error info
    $errorOutput = @{
        date = (Get-Date).ToShortDateString()
        screenTime = @{
            formatted = "0 min"
            totalMinutes = 0
        }
        breakTime = @{
            formatted = "0 min"
            totalMinutes = 0
        }
        lastUpdated = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        success = $false
        error = $_.Exception.Message
    }

    $errorOutput | ConvertTo-Json -Compress
}
