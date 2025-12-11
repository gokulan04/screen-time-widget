param(
    [Parameter(Mandatory=$false)]
    [string]$DateString,
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

# Get date from parameter or default to today
if ($DateString) {
    try {
        $StartTime = [DateTime]::Parse($DateString).Date
    } catch {
        # If parsing fails, use today
        $StartTime = (Get-Date).Date
    }
} else {
    $StartTime = (Get-Date).Date
}

# End time is end of the selected day
$EndTime = $StartTime.AddDays(1).AddSeconds(-1)

# Get lock/unlock events for the selected day
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
# Apply time range filtering and trimming
foreach ($event in $events) {
    if ($event.Id -eq 4801) {
        # Unlock event
        $eventTimeOfDay = $event.TimeCreated.TimeOfDay

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
                StartTime = $unlockTime.ToString("hh:mm tt")
                EndTime   = $lockTime.ToString("hh:mm tt")
                Duration  = Format-Duration -duration $duration
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
            StartTime = $unlockTime.ToString("hh:mm tt")
            EndTime   = $now.ToString("hh:mm tt")
            Duration  = Format-Duration -duration $duration
        }
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
