// DOM Elements
/** @type {HTMLElement | null} */
const screenTimeValue = document.getElementById('screen-time-value');
/** @type {HTMLElement | null} */
const breakTimeValue = document.getElementById('break-time-value');
/** @type {HTMLElement | null} */
const closeBtn = document.getElementById('close-btn');
/** @type {HTMLElement | null} */
const loadingSpinner = document.getElementById('loading-spinner');
/** @type {HTMLElement | null} */
const errorMessage = document.getElementById('error-message');
/** @type {HTMLElement | null} */
const errorText = document.getElementById('error-text');
/** @type {HTMLElement | null} */
const content = document.querySelector('.content');
/** @type {HTMLElement | null} */
const adminWarning = document.getElementById('admin-warning');
/** @type {HTMLElement | null} */
const helpBtn = document.getElementById('help-btn');
/** @type {HTMLElement | null} */
const widgetContainer = document.querySelector('.widget-container');
/** @type {HTMLElement | null} */
const settingsBtn = document.getElementById('settings-btn');
/** @type {HTMLElement | null} */
const expandBtn = document.getElementById('expand-btn');
/** @type {HTMLElement | null} */
const goalProgressFill = document.getElementById('goal-progress-fill');
/** @type {HTMLElement | null} */
const goalProgressBar = document.getElementById('goal-progress-bar');
/** @type {HTMLElement | null} */
const goalFlashMessage = document.getElementById('goal-flash-message');

// State
let isLoading = false;
let currentGoal = 8; // Default goal in hours

/**
 * Format duration for screen time display (e.g., "11:09" or "00:00")
 * @param {number} totalMinutes - Total minutes to format
 * @returns {string} Formatted duration string
 */
function formatScreenTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format duration for break time display (e.g., "01:15" or "00:00")
 * @param {number} totalMinutes - Total minutes to format
 * @returns {string} Formatted duration string
 */
function formatBreakTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Fetch and display screen time data
 */
async function fetchScreenTimeData() {
    if (isLoading) return;

    try {
        // Show loading state
        isLoading = true;
        if (loadingSpinner) loadingSpinner.classList.add('active');
        if (content) content.classList.add('loading');
        if (errorMessage) errorMessage.style.display = 'none';

        // Fetch data from main process
        // @ts-ignore - electronAPI is added via preload
        const data = await window.electronAPI.getScreenTime();

        // Hide loading state
        isLoading = false;
        if (loadingSpinner) loadingSpinner.classList.remove('active');
        if (content) content.classList.remove('loading');

        // Check if data fetch was successful
        if (!data.success) {
            // Check if it's just "no events found" (not an actual error)
            if (data.error && data.error.includes('No events were found')) {
                showNoDataMessage();
            } else {
                showError(data.error || 'Failed to fetch screen time data');
            }
            return;
        }

        // Update UI with data
        updateScreenTimeUI(data);

    } catch (error) {
        console.error('Error fetching screen time:', error);
        isLoading = false;
        if (loadingSpinner) loadingSpinner.classList.remove('active');
        if (content) content.classList.remove('loading');
        showError('Unable to read screen time data');
    }
}

/**
 * Update UI with screen time data
 * @param {any} data - Screen time data from main process
 */
function updateScreenTimeUI(data) {
    // Extract total minutes from screen time and break time
    const screenTimeMinutes = data.screenTime.totalMinutes || 0;
    const breakTimeMinutes = data.breakTime.totalMinutes || 0;

    // Update screen time display (e.g., "4h 23m")
    if (screenTimeValue) {
        screenTimeValue.textContent = formatScreenTime(screenTimeMinutes);
    }

    // Update break time display (e.g., "75m")
    if (breakTimeValue) {
        breakTimeValue.textContent = formatBreakTime(breakTimeMinutes);
    }

    // Update goal progress bar
    const goalMinutes = currentGoal * 60;
    const progressPercent = Math.min((screenTimeMinutes / goalMinutes) * 100, 100);

    if (goalProgressFill) {
        const newWidth = `${progressPercent}%`;
        const currentWidth = goalProgressFill.style.width;

        // Only add shimmer effect if width is actually changing
        if (currentWidth !== newWidth) {
            goalProgressFill.classList.add('transitioning');
            goalProgressFill.style.width = newWidth;

            // Remove transitioning class after animation completes
            setTimeout(() => {
                goalProgressFill.classList.remove('transitioning');
            }, 500); // Match transition duration
        }
    }

    // Show flash message when goal is reached (100%)
    if (progressPercent >= 100) {
        if (goalProgressBar) goalProgressBar.style.display = 'none';
        if (goalFlashMessage) goalFlashMessage.style.display = 'block';
    } else {
        if (goalProgressBar) goalProgressBar.style.display = 'block';
        if (goalFlashMessage) goalFlashMessage.style.display = 'none';
    }

    // Hide error message
    if (errorMessage) errorMessage.style.display = 'none';
}

/**
 * Show error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    if (errorText) errorText.textContent = message;
    if (errorMessage) errorMessage.style.display = 'block';

    // Show fallback data
    if (screenTimeValue) screenTimeValue.textContent = '00:00';
    if (breakTimeValue) breakTimeValue.textContent = '00:00';
}

/**
 * Show "no data" message (not an error, just no events yet today)
 */
function showNoDataMessage() {
    if (errorText) errorText.textContent = 'No activity tracked yet - Click ? for setup help';
    if (errorMessage) errorMessage.style.display = 'block';

    // Show 0 data
    if (screenTimeValue) screenTimeValue.textContent = '00:00';
    if (breakTimeValue) breakTimeValue.textContent = '00:00';
}

/**
 * Load theme and goal from settings
 */
async function loadTheme() {
    try {
        const settings = await window.electronAPI.getSettings();
        if (settings) {
            // Apply theme
            if (widgetContainer && settings.theme) {
                widgetContainer.setAttribute('data-theme', settings.theme);
            }
            // Load goal setting
            if (settings.goal) {
                currentGoal = settings.goal;
            }
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        // Fallback to default theme and goal
        if (widgetContainer) {
            widgetContainer.setAttribute('data-theme', 'cyan');
        }
        currentGoal = 8;
    }
}


/**
 * Handle close button click
 */
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        // @ts-ignore - electronAPI is added via preload
        window.electronAPI.closeWindow();
    });
}

/**
 * Handle help button click to open help window
 */
if (helpBtn) {
    helpBtn.addEventListener('click', () => {
        // @ts-ignore - electronAPI is added via preload
        window.electronAPI.openHelpWindow();
    });
}

/**
 * Check and display admin status
 */
async function checkAdminStatus() {
    try {
        // @ts-ignore - electronAPI is added via preload
        const isAdmin = await window.electronAPI.checkAdminStatus();

        if (isAdmin) {
            // Running as admin - hide warning
            if (adminWarning) adminWarning.style.display = 'none';
        } else {
            // NOT running as admin - show warning
            if (adminWarning) adminWarning.style.display = 'flex';
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}


/**
 * Handle screen time click to refresh data
 */
if (screenTimeValue) {
    screenTimeValue.addEventListener('click', () => {
        fetchScreenTimeData();
    });
}

/**
 * Handle expand button click to open breakdown window
 */
if (expandBtn) {
    expandBtn.addEventListener('click', () => {
        // @ts-ignore - electronAPI is added via preload
        window.electronAPI.openBreakdownWindow();
    });
}

/**
 * Handle settings button click to open settings window
 */
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        // @ts-ignore - electronAPI is added via preload
        window.electronAPI.openSettingsWindow();
    });
}

/**
 * Initialize the widget
 */
async function init() {
    // Load theme from settings
    await loadTheme();

    // Listen for theme changes from settings window
    // @ts-ignore - electronAPI is added via preload
    window.electronAPI.onThemeChanged((theme) => {
        if (widgetContainer) {
            widgetContainer.setAttribute('data-theme', theme);
        }
    });

    // Listen for settings updates (e.g., goal changes) and refresh data
    // @ts-ignore - electronAPI is added via preload
    window.electronAPI.onSettingsUpdated((settings) => {
        console.log('Settings updated, refreshing data...', settings);
        // Update goal if changed
        if (settings.goal) {
            currentGoal = settings.goal;
        }
        // Refresh screen time data to update progress bar
        fetchScreenTimeData();
    });

    // Check admin status
    checkAdminStatus();

    // Fetch screen time data
    fetchScreenTimeData();

    // Auto-refresh screen time every 5 minutes
    setInterval(fetchScreenTimeData, 300000);
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
