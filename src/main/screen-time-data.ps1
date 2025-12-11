param(
    [Parameter(Mandatory=$false)]
    [string]$StartTimeOfDay = "08:00 AM",
    [Parameter(Mandatory=$false)]
    [string]$EndTimeOfDay = "10:00 PM"
)

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

# Parse time of day parameters
$startHourTime = [DateTime]::Parse($StartTimeOfDay)
$endHourTime = [DateTime]::Parse($EndTimeOfDay)

# Convert to TimeSpan for comparison
$startTimeSpan = $startHourTime.TimeOfDay
$endTimeSpan = $endHourTime.TimeOfDay

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
    # Apply time range filtering and trimming
    foreach ($event in $events) {
        if ($event.Id -eq 4801) {
            # Unlock event
            $eventTimeOfDay = $event.TimeCreated.TimeOfDay

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

            # Only start tracking if unlock is before end time
            if ($eventTimeOfDay -lt $endTimeSpan) {
                $unlockTime = $event.TimeCreated

                # If unlock is before start time, trim to start time
                if ($eventTimeOfDay -lt $startTimeSpan) {
                    $unlockTime = $unlockTime.Date.Add($startTimeSpan)
                }
            }
        }
        elseif ($event.Id -eq 4800 -and $unlockTime) {
            # Lock event
            $lockTime = $event.TimeCreated
            $lockTimeOfDay = $lockTime.TimeOfDay

            # If lock is after end time, trim to end time
            if ($lockTimeOfDay -gt $endTimeSpan) {
                $lockTime = $lockTime.Date.Add($endTimeSpan)
            }

            # Only count session if it's within or overlaps the tracking window
            if ($lockTime -gt $unlockTime) {
                $duration = $lockTime - $unlockTime
                $activeSessions += [PSCustomObject]@{
                    StartTime = $unlockTime
                    EndTime   = $lockTime
                    Duration  = $duration
                }
            }

            $lastLockTime = $event.TimeCreated
            $unlockTime = $null
        }
    }

    # If the last unlock event has no matching lock, assume session is ongoing
    if ($unlockTime) {
        $now = Get-Date
        $nowTimeOfDay = $now.TimeOfDay

        # If current time is after end time, trim to end time
        if ($nowTimeOfDay -gt $endTimeSpan) {
            $now = $now.Date.Add($endTimeSpan)
        }

        # Only add session if there's actual duration
        if ($now -gt $unlockTime) {
            $duration = $now - $unlockTime
            $activeSessions += [PSCustomObject]@{
                StartTime = $unlockTime
                EndTime   = $now
                Duration  = $duration
            }
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
