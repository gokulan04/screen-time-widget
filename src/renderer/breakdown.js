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
const calendarBtn = document.getElementById('calendar-btn');
const datePicker = document.getElementById('date-picker');

// State
let selectedDate = null; // Current selected date (YYYY-MM-DD)
let weekDates = []; // Array of 7 Date objects for current week

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

        // Create day name and number elements
        const dayName = document.createElement('span');
        dayName.className = 'day-name';
        dayName.textContent = getDayName(date);

        const dayNumber = document.createElement('span');
        dayNumber.className = 'day-number';
        dayNumber.textContent = date.getDate();

        button.appendChild(dayName);
        button.appendChild(dayNumber);

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
    }

    // Add change event listener
    datePicker.addEventListener('change', handleCalendarChange);
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
 * Load and display breakdown data for a specific date
 * @param {string} dateString - Optional YYYY-MM-DD format, defaults to today
 */
async function loadBreakdownData(dateString = null) {
    try {
        // @ts-ignore - electronAPI is added via preload
        const data = await window.electronAPI.getScreenTimeBreakdown(dateString);

        // Apply theme from settings
        const settings = await window.electronAPI.getSettings();
        const savedTheme = (settings && settings.theme) || 'cyan';
        if (breakdownWindow) {
            breakdownWindow.setAttribute('data-theme', savedTheme);
        }

        // Update title with date
        if (breakdownTitle) {
            const displayDate = data.date || (dateString ? new Date(dateString).toLocaleDateString() : 'Today');
            breakdownTitle.textContent = `Screen Time Breakdown - ${displayDate}`;
        }

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
window.addEventListener('DOMContentLoaded', () => {
    initializeWeekView();
    initializeDatePicker();
    loadBreakdownData(selectedDate); // Load today's data by default
});
