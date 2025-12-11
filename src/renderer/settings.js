// DOM Elements
const settingsWindow = document.querySelector('.settings-window');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const themeButtons = document.querySelectorAll('.theme-btn');

// Time inputs
const startHourSelect = document.getElementById('start-hour');
const startMinuteSelect = document.getElementById('start-minute');
const startPeriodSelect = document.getElementById('start-period');
const endHourSelect = document.getElementById('end-hour');
const endMinuteSelect = document.getElementById('end-minute');
const endPeriodSelect = document.getElementById('end-period');

let currentSettings = null;

/**
 * Initialize hour dropdowns (12, 1-11)
 */
function initializeHourDropdowns() {
    const hours = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];

    hours.forEach(hour => {
        const startOption = document.createElement('option');
        startOption.value = hour;
        startOption.textContent = hour;
        startHourSelect.appendChild(startOption);

        const endOption = document.createElement('option');
        endOption.value = hour;
        endOption.textContent = hour;
        endHourSelect.appendChild(endOption);
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
 * Load settings from main process
 */
async function loadSettings() {
    try {
        currentSettings = await window.electronAPI.getSettings();
        console.log('Settings loaded:', currentSettings);

        // Apply theme to window
        if (settingsWindow && currentSettings.theme) {
            settingsWindow.setAttribute('data-theme', currentSettings.theme);
        }

        // Update theme buttons
        themeButtons.forEach(btn => {
            if (btn.dataset.theme === currentSettings.theme) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Parse and set start time
        const startTime = parseTimeString(currentSettings.startTime);
        startHourSelect.value = startTime.hour;
        startMinuteSelect.value = startTime.minute;
        startPeriodSelect.value = startTime.period;

        // Parse and set end time
        const endTime = parseTimeString(currentSettings.endTime);
        endHourSelect.value = endTime.hour;
        endMinuteSelect.value = endTime.minute;
        endPeriodSelect.value = endTime.period;

    } catch (error) {
        console.error('Error loading settings:', error);
        // Use defaults if loading fails
        currentSettings = {
            startTime: '08:00 AM',
            endTime: '10:00 PM',
            theme: 'cyan'
        };
    }
}

/**
 * Save settings to main process
 */
async function saveSettings() {
    try {
        const settings = {
            startTime: formatTimeString(
                startHourSelect.value,
                startMinuteSelect.value,
                startPeriodSelect.value
            ),
            endTime: formatTimeString(
                endHourSelect.value,
                endMinuteSelect.value,
                endPeriodSelect.value
            ),
            theme: currentSettings.theme
        };

        console.log('Saving settings:', settings);

        const result = await window.electronAPI.saveSettings(settings);

        if (result.success) {
            // Show success feedback
            saveSettingsBtn.textContent = 'Saved!';
            saveSettingsBtn.classList.add('success');

            setTimeout(() => {
                saveSettingsBtn.textContent = 'Save Settings';
                saveSettingsBtn.classList.remove('success');
            }, 2000);
        } else {
            alert('Error saving settings: ' + result.error);
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings. Please try again.');
    }
}

/**
 * Setup theme button event listeners
 */
function setupThemeButtons() {
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;

            // Update theme on window
            if (settingsWindow && theme) {
                settingsWindow.setAttribute('data-theme', theme);
            }

            // Update active state
            themeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update current settings
            if (currentSettings) {
                currentSettings.theme = theme;
            }
        });
    });
}

/**
 * Initialize settings page
 */
function initializeSettingsPage() {
    initializeHourDropdowns();
    setupThemeButtons();
    loadSettings();
}

// Setup save button handler
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
}

// Initialize when window loads
window.addEventListener('DOMContentLoaded', initializeSettingsPage);
