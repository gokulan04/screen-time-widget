// DOM Elements
const breakdownTitle = document.getElementById('breakdown-title');
const totalScreenTimeEl = document.getElementById('total-screen-time');
const totalBreakTimeEl = document.getElementById('total-break-time');
const sessionsTbody = document.getElementById('sessions-tbody');
const breaksTbody = document.getElementById('breaks-tbody');
const noSessions = document.getElementById('no-sessions');
const noBreaks = document.getElementById('no-breaks');
const sessionsTable = document.getElementById('sessions-table');
const breaksTable = document.getElementById('breaks-table');
const breakdownWindow = document.querySelector('.breakdown-window');
const weekDaysContainer = document.getElementById('week-days');
const datePickerContainer = document.getElementById('date-picker-container');
const selectedDateText = document.getElementById('selected-date-text');
const datePicker = document.getElementById('date-picker');
const filterStartHour = document.getElementById('filter-start-hour');
const filterStartMinute = document.getElementById('filter-start-minute');
const filterStartPeriod = document.getElementById('filter-start-period');
const filterEndHour = document.getElementById('filter-end-hour');
const filterEndMinute = document.getElementById('filter-end-minute');
const filterEndPeriod = document.getElementById('filter-end-period');
const resetFilterBtn = document.getElementById('reset-filter-btn');

// State
let selectedDate = null; // Current selected date (YYYY-MM-DD)
let weekDates = []; // Array of 7 Date objects for current week
let currentStartTime = '08:00 AM'; // Current filter start time (12-hour format)
let currentEndTime = '10:00 PM'; // Current filter end time (12-hour format)

/**
 * Get the current week's dates (Sunday to Saturday)
 * @returns {Array<Date>} Array of 7 date objects
 */
function getCurrentWeekDates() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 (Sunday) to 6 (Saturday)
    const weekStart = new Date(today);

    // Set to Sunday of current week
    weekStart.setDate(today.getDate() - currentDay);
    weekStart.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        dates.push(date);
    }

    return dates;
}

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get short day name (Mon, Tue, etc.)
 * @param {Date} date
 * @returns {string}
 */
function getDayName(date) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[date.getDay()];
}

/**
 * Check if date is today
 * @param {Date} date
 * @returns {boolean}
 */
function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
}

/**
 * Check if date is in the future
 * @param {Date} date
 * @returns {boolean}
 */
function isFuture(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
}

/**
 * Initialize week view with day buttons
 */
function initializeWeekView() {
    if (!weekDaysContainer) return;

    weekDates = getCurrentWeekDates();
    weekDaysContainer.innerHTML = '';

    weekDates.forEach(date => {
        const button = document.createElement('button');
        button.className = 'day-btn';
        button.dataset.date = formatDateString(date);

        // Add special classes
        if (isToday(date)) {
            button.classList.add('today');
            selectedDate = formatDateString(date); // Default to today
        }

        if (isFuture(date)) {
            button.classList.add('future');
            button.disabled = true;
        }

        // Create day name element
        const dayName = document.createElement('span');
        dayName.className = 'day-name';
        dayName.textContent = getDayName(date);

        button.appendChild(dayName);

        // Add click handler
        if (!isFuture(date)) {
            button.addEventListener('click', () => handleDayClick(formatDateString(date)));
        }

        weekDaysContainer.appendChild(button);
    });

    // Set initial active state
    updateActiveDay(selectedDate);
}

/**
 * Update active day visual state
 * @param {string} dateString - YYYY-MM-DD format
 */
function updateActiveDay(dateString) {
    if (!weekDaysContainer) return;

    const buttons = weekDaysContainer.querySelectorAll('.day-btn');
    buttons.forEach(btn => {
        if (btn.dataset.date === dateString) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Handle day button click
 * @param {string} dateString - YYYY-MM-DD format
 */
async function handleDayClick(dateString) {
    selectedDate = dateString;
    updateActiveDay(dateString);
    updateSelectedDateText(dateString);
    await loadBreakdownData(dateString);

    // Sync calendar input
    if (datePicker) {
        datePicker.value = dateString;
    }
}

/**
 * Initialize calendar date picker
 */
function initializeDatePicker() {
    if (!datePicker) return;

    // Set max date to today (prevent future selection)
    const today = new Date();
    datePicker.max = formatDateString(today);

    // Set current selected date
    if (selectedDate) {
        datePicker.value = selectedDate;
        updateSelectedDateText(selectedDate);
    }

    // Add change event listener
    datePicker.addEventListener('change', handleCalendarChange);

    // Add click handler to date picker container to open date picker
    if (datePickerContainer) {
        datePickerContainer.addEventListener('click', () => {
            if (datePicker) {
                datePicker.showPicker();
            }
        });
    }
}

/**
 * Update the selected date text display
 * @param {string} dateString - YYYY-MM-DD format
 */
function updateSelectedDateText(dateString) {
    if (!selectedDateText) return;

    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) {
        selectedDateText.textContent = 'Today';
    } else {
        selectedDateText.textContent = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
}

/**
 * Handle calendar date selection
 * @param {Event} event - Change event from date input
 */
async function handleCalendarChange(event) {
    const selectedDateString = event.target.value; // YYYY-MM-DD

    if (!selectedDateString) return;

    // Update the week view to show the week containing this date
    updateWeekViewToDate(new Date(selectedDateString));

    // Update selected date and load data
    selectedDate = selectedDateString;
    updateActiveDay(selectedDate);
    updateSelectedDateText(selectedDate);
    await loadBreakdownData(selectedDate);
}

/**
 * Update week view to show the week containing a specific date
 * @param {Date} targetDate - The date to show
 */
function updateWeekViewToDate(targetDate) {
    // Calculate the Sunday of the week containing targetDate
    const dayOfWeek = targetDate.getDay();
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    // Regenerate week dates array
    weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDates.push(date);
    }

    // Rebuild week view with new dates
    initializeWeekView();
}

/**
 * Show skeleton loading state
 */
function showLoadingState() {
    // Show skeleton rows in sessions table
    if (sessionsTbody) {
        sessionsTbody.innerHTML = `
            <tr class="skeleton-row">
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
            </tr>
            <tr class="skeleton-row">
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
            </tr>
            <tr class="skeleton-row">
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
            </tr>
        `;
        if (sessionsTable) sessionsTable.style.display = 'table';
        if (noSessions) noSessions.style.display = 'none';
    }

    // Show skeleton rows in breaks table
    if (breaksTbody) {
        breaksTbody.innerHTML = `
            <tr class="skeleton-row">
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
            </tr>
            <tr class="skeleton-row">
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
                <td><div class="skeleton-text"></div></td>
            </tr>
        `;
        if (breaksTable) breaksTable.style.display = 'table';
        if (noBreaks) noBreaks.style.display = 'none';
    }
}

/**
 * Initialize hour dropdowns (12, 1-11)
 */
function initializeHourDropdowns() {
    const hours = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

    hours.forEach(hour => {
        const startOption = document.createElement('option');
        startOption.value = hour;
        startOption.textContent = hour;
        if (filterStartHour) filterStartHour.appendChild(startOption);

        const endOption = document.createElement('option');
        endOption.value = hour;
        endOption.textContent = hour;
        if (filterEndHour) filterEndHour.appendChild(endOption);
    });
}

/**
 * Parse time string (e.g., "08:00 AM") into components
 * @param {string} timeStr - Time string to parse
 * @returns {Object} Parsed time components
 */
function parseTimeString(timeStr) {
    const parts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (parts) {
        // Convert hour to number and back to string to remove leading zeros
        const hourNum = parseInt(parts[1], 10);
        return {
            hour: String(hourNum),
            minute: parts[2],
            period: parts[3].toUpperCase()
        };
    }
    // Default fallback
    return { hour: '8', minute: '00', period: 'AM' };
}

/**
 * Format time components into string
 * @param {string} hour - Hour (1-12)
 * @param {string} minute - Minute (00 or 30)
 * @param {string} period - AM or PM
 * @returns {string} Formatted time string
 */
function formatTimeString(hour, minute, period) {
    const paddedHour = String(hour).padStart(2, '0');
    return `${paddedHour}:${minute} ${period}`;
}

/**
 * Convert 24-hour time (HH:mm) to 12-hour format (hh:mm AM/PM)
 * @param {string} time24 - Time in HH:mm format
 * @returns {string} Time in 12-hour format
 */
function convertTo12HourFormat(time24) {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
}

/**
 * Initialize time range filters from settings
 */
async function initializeTimeFilters() {
    try {
        // @ts-ignore - electronAPI is added via preload
        const settings = await window.electronAPI.getSettings();

        if (settings && settings.startTime && settings.endTime) {
            // Parse and set start time
            const startTime = parseTimeString(settings.startTime);
            if (filterStartHour) filterStartHour.value = startTime.hour;
            if (filterStartMinute) filterStartMinute.value = startTime.minute;
            if (filterStartPeriod) filterStartPeriod.value = startTime.period;

            // Parse and set end time
            const endTime = parseTimeString(settings.endTime);
            if (filterEndHour) filterEndHour.value = endTime.hour;
            if (filterEndMinute) filterEndMinute.value = endTime.minute;
            if (filterEndPeriod) filterEndPeriod.value = endTime.period;

            // Store current filter times in 12-hour format
            currentStartTime = settings.startTime;
            currentEndTime = settings.endTime;
        }
    } catch (error) {
        console.error('Error loading time filter settings:', error);
    }
}

/**
 * Convert 12-hour time (hh:mm AM/PM) to 24-hour format (HH:mm)
 * @param {string} time12 - Time in 12-hour format
 * @returns {string} Time in HH:mm format
 */
function convertTo24HourFormat(time12) {
    const match = time12.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '08:00';

    let [, hours, minutes, period] = match;
    hours = parseInt(hours);

    if (period.toUpperCase() === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

/**
 * Handle apply filter button click
 */
async function handleApplyFilter() {
    if (!filterStartHour || !filterStartMinute || !filterStartPeriod ||
        !filterEndHour || !filterEndMinute || !filterEndPeriod) return;

    // Format time from select dropdowns
    currentStartTime = formatTimeString(
        filterStartHour.value,
        filterStartMinute.value,
        filterStartPeriod.value
    );
    currentEndTime = formatTimeString(
        filterEndHour.value,
        filterEndMinute.value,
        filterEndPeriod.value
    );

    // Reload data with new time range
    await loadBreakdownData(selectedDate, currentStartTime, currentEndTime);
}

/**
 * Handle reset filter button click
 */
async function handleResetFilter() {
    // Reset to settings defaults
    await initializeTimeFilters();

    // Reload data with default time range
    await loadBreakdownData(selectedDate, currentStartTime, currentEndTime);
}

/**
 * Load and display breakdown data for a specific date
 * @param {string} dateString - Optional YYYY-MM-DD format, defaults to today
 */
async function loadBreakdownData(dateString = null, startTime = null, endTime = null) {
    try {
        // Show loading state
        showLoadingState();

        // Use current filter times if not provided (already in 12-hour format)
        const filterStartTime = startTime || currentStartTime;
        const filterEndTime = endTime || currentEndTime;

        console.log('Loading breakdown data:', {
            dateString,
            filterStartTime,
            filterEndTime
        });

        // @ts-ignore - electronAPI is added via preload
        const data = await window.electronAPI.getScreenTimeBreakdown(
            dateString,
            filterStartTime,
            filterEndTime
        );

        console.log('Received breakdown data:', data);

        // Update summary
        if (totalScreenTimeEl) {
            totalScreenTimeEl.textContent = data.totalScreenTime || '0 min';
        }
        if (totalBreakTimeEl) {
            totalBreakTimeEl.textContent = data.totalBreakTime || '0 min';
        }

        // Populate active sessions table
        if (sessionsTbody) {
            sessionsTbody.innerHTML = '';
            if (data.activeSessions && data.activeSessions.length > 0) {
                data.activeSessions.forEach(session => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${session.StartTime}</td>
                        <td>${session.EndTime}</td>
                        <td>${session.Duration}</td>
                    `;
                    sessionsTbody.appendChild(row);
                });
                if (sessionsTable) sessionsTable.style.display = 'table';
                if (noSessions) noSessions.style.display = 'none';
            } else {
                if (sessionsTable) sessionsTable.style.display = 'none';
                if (noSessions) noSessions.style.display = 'block';
            }
        }

        // Populate breaks table
        if (breaksTbody) {
            breaksTbody.innerHTML = '';
            if (data.breaks && data.breaks.length > 0) {
                data.breaks.forEach(breakItem => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${breakItem.StartTime}</td>
                        <td>${breakItem.EndTime}</td>
                        <td>${breakItem.Duration}</td>
                    `;
                    breaksTbody.appendChild(row);
                });
                if (breaksTable) breaksTable.style.display = 'table';
                if (noBreaks) noBreaks.style.display = 'none';
            } else {
                if (breaksTable) breaksTable.style.display = 'none';
                if (noBreaks) noBreaks.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading breakdown data:', error);
    }
}

// Initialize when window loads
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Apply theme immediately to prevent flash
        const settings = await window.electronAPI.getSettings();
        const savedTheme = (settings && settings.theme) || 'cyan';
        if (breakdownWindow) {
            breakdownWindow.setAttribute('data-theme', savedTheme);
        }

        initializeHourDropdowns();
        initializeWeekView();
        initializeDatePicker();
        await initializeTimeFilters();

        console.log('Breakdown initialization:', {
            selectedDate,
            currentStartTime,
            currentEndTime
        });

        await loadBreakdownData(selectedDate); // Load today's data by default

        // Add event listeners for automatic filter application on time change
        if (filterStartHour) {
            filterStartHour.addEventListener('change', handleApplyFilter);
        }
        if (filterStartMinute) {
            filterStartMinute.addEventListener('change', handleApplyFilter);
        }
        if (filterStartPeriod) {
            filterStartPeriod.addEventListener('change', handleApplyFilter);
        }
        if (filterEndHour) {
            filterEndHour.addEventListener('change', handleApplyFilter);
        }
        if (filterEndMinute) {
            filterEndMinute.addEventListener('change', handleApplyFilter);
        }
        if (filterEndPeriod) {
            filterEndPeriod.addEventListener('change', handleApplyFilter);
        }

        // Add event listener for reset button
        if (resetFilterBtn) {
            resetFilterBtn.addEventListener('click', handleResetFilter);
        }
    } catch (error) {
        console.error('Error during breakdown initialization:', error);
    }

    // Listen for theme changes from settings window
    // @ts-ignore - electronAPI is added via preload
    window.electronAPI.onThemeChanged((theme) => {
        if (breakdownWindow) {
            breakdownWindow.setAttribute('data-theme', theme);
        }
    });
});
