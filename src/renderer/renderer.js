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

// Message System State
/** @type {string} */
let username = 'there'; // Default fallback
let lastMessageTime = 0; // Track when last message was shown
let welcomeShownToday = false; // Track if welcome message shown today (session-based, will be updated from localStorage)
const MESSAGE_INTERVAL = 600000; // 10 minutes in milliseconds
const WELCOME_STORAGE_KEY = 'lastWelcomeDate'; // LocalStorage key for welcome message date

// Loaded messages from JSON
/** @type {string[]} */
let WELCOME_MESSAGES = [];
/** @type {Object.<string, string[]>} */
let MESSAGES = {};

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
 * Check if welcome message was already shown today
 * @returns {boolean} True if welcome was shown today
 */
function wasWelcomeShownToday() {
    try {
        const lastWelcomeDate = localStorage.getItem(WELCOME_STORAGE_KEY);
        if (!lastWelcomeDate) return false;

        const today = new Date().toDateString(); // e.g., "Mon Dec 14 2025"
        return lastWelcomeDate === today;
    } catch (error) {
        console.error('Error checking welcome status:', error);
        return false;
    }
}

/**
 * Mark welcome message as shown today
 */
function markWelcomeShown() {
    try {
        const today = new Date().toDateString();
        localStorage.setItem(WELCOME_STORAGE_KEY, today);
    } catch (error) {
        console.error('Error saving welcome status:', error);
    }
}

/**
 * Get appropriate message category based on progress percentage
 * @param {number} progressPercent - Progress percentage (0-100+)
 * @returns {string | null} Message category key or null if below 20%
 */
function getMessageCategory(progressPercent) {
    if (progressPercent < 20) return null; // No message before 20%
    if (progressPercent < 50) return '20-49';
    if (progressPercent < 60) return '50-60';
    if (progressPercent < 70) return '60-70';
    if (progressPercent < 80) return '70-80';
    if (progressPercent < 90) return '80-90';
    if (progressPercent < 100) return '90-99';
    return '100+';
}

/**
 * Get random welcome message with username
 * @returns {string} Personalized welcome message
 */
function getWelcomeMessage() {
    const randomIndex = Math.floor(Math.random() * WELCOME_MESSAGES.length);
    const message = WELCOME_MESSAGES[randomIndex];
    // Replace {name} placeholder with actual username
    return message.replace('{name}', username);
}

/**
 * Get random message from category (no personalization)
 * @param {string} category - Message category
 * @returns {string} Progress message
 */
function getRandomMessage(category) {
    const messages = MESSAGES[category];
    if (!messages || messages.length === 0) return '';

    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}

/**
 * Check if enough time has passed to show a new message
 * For 20-49% range: show once (static message)
 * For 50%+: show every 10 minutes
 * @param {number} progressPercent - Current progress percentage
 * @returns {boolean} True if message should be shown
 */
function shouldShowMessage(progressPercent) {
    // If no message has been shown yet (app just started), show one
    if (lastMessageTime === 0) return true;

    // For 20-49%, show static message once (but always return true to keep it visible)
    if (progressPercent >= 20 && progressPercent < 50) {
        // Show once - don't rotate to new messages, but keep showing the same one
        return true;
    }

    // For 50%+, check if 10 minutes have passed
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;
    return timeSinceLastMessage >= MESSAGE_INTERVAL;
}

/**
 * Show message (persistent or temporary)
 * @param {string} message - Message to display
 * @param {boolean} autoHide - Whether to auto-hide after 3 seconds
 */
function showPersistentMessage(message, autoHide = false) {
    if (!goalFlashMessage) {
        console.error('goalFlashMessage element not found!');
        return;
    }

    // Update message text
    const messageSpan = goalFlashMessage.querySelector('span');
    if (messageSpan) {
        messageSpan.textContent = message;
    } else {
        console.error('Message span not found!');
    }

    // Resize window to expanded size with animation
    // @ts-ignore - electronAPI is added via preload
    window.electronAPI.resizeWindow(true);

    // Show message with fade-in animation
    goalFlashMessage.style.display = 'block';
    goalFlashMessage.classList.remove('flash-exit');
    goalFlashMessage.classList.add('flash-enter');

    // Check if message is too long and needs scrolling
    setTimeout(() => {
        if (messageSpan) {
            const containerWidth = goalFlashMessage.offsetWidth;
            const textWidth = messageSpan.scrollWidth;

            // If text is wider than container, add scrolling animation
            if (textWidth > containerWidth) {
                goalFlashMessage.classList.add('long-message');
            } else {
                goalFlashMessage.classList.remove('long-message');
            }
        }
    }, 50); // Small delay to ensure DOM is updated

    // Remove animation class after transition
    setTimeout(() => {
        goalFlashMessage.classList.remove('flash-enter');
    }, 300);

    // Auto-hide if specified (for welcome message)
    if (autoHide) {
        setTimeout(() => {
            hideMessage();
        }, 3000); // 3 seconds
    }
}

/**
 * Hide message with fade-out animation
 */
function hideMessage() {
    if (!goalFlashMessage) return;

    // Start window resize immediately for smooth transition
    // @ts-ignore - electronAPI is added via preload
    window.electronAPI.resizeWindow(false);

    goalFlashMessage.classList.remove('flash-enter', 'long-message');
    goalFlashMessage.classList.add('flash-exit');

    setTimeout(() => {
        goalFlashMessage.style.display = 'none';
        goalFlashMessage.classList.remove('flash-exit');
    }, 300);
}

/**
 * Handle message display logic based on progress
 * @param {number} progressPercent - Current progress percentage
 * @param {boolean} forceUpdate - Force message update regardless of timing
 */
function handleFlashMessage(progressPercent, forceUpdate = false) {
    // Check if welcome should be shown (only once per day)
    if (!welcomeShownToday && !wasWelcomeShownToday()) {
        const welcomeMsg = getWelcomeMessage();
        showPersistentMessage(welcomeMsg, true); // true = auto-hide after 3 seconds
        welcomeShownToday = true;
        markWelcomeShown(); // Persist to localStorage

        // After welcome message hides (4 seconds = 3s display + 1s gap), show progress message if needed
        setTimeout(() => {
            const category = getMessageCategory(progressPercent);
            if (category) {
                const message = getRandomMessage(category);
                showPersistentMessage(message, false);
                lastMessageTime = Date.now();
            }
        }, 4000); // 3s for welcome + 1s gap

        return;
    }

    const category = getMessageCategory(progressPercent);

    // No message needed if below 20%
    if (!category) {
        hideMessage();
        return;
    }

    // Check if we should show a new message (or force update)
    if (forceUpdate || shouldShowMessage(progressPercent)) {
        const message = getRandomMessage(category);
        showPersistentMessage(message, false); // false = persist until next message
        lastMessageTime = Date.now();
    }
}

/**
 * Fetch and display screen time data
 * @param {boolean} forceMessageUpdate - Force message update regardless of timing
 */
async function fetchScreenTimeData(forceMessageUpdate = false) {
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
        updateScreenTimeUI(data, forceMessageUpdate);

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
 * @param {boolean} forceMessageUpdate - Force message update regardless of timing
 */
function updateScreenTimeUI(data, forceMessageUpdate = false) {
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

    // Calculate progress percentage
    const goalMinutes = currentGoal * 60;
    const progressPercent = (screenTimeMinutes / goalMinutes) * 100;

    // REMOVED: Progress bar update logic - now using flash messages instead
    // Handle flash message system
    handleFlashMessage(progressPercent, forceMessageUpdate);

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
 * Load messages from JSON file
 * @returns {Promise<void>}
 */
async function loadMessages() {
    try {
        const response = await fetch('../../assets/messages.json');
        if (!response.ok) {
            throw new Error('Failed to load messages: ' + response.status);
        }
        const data = await response.json();

        WELCOME_MESSAGES = data.welcomeMessages || [];
        MESSAGES = data.progressMessages || {};

        console.log('Messages loaded successfully');
    } catch (error) {
        console.error('Error loading messages:', error);

        // Fallback to default messages if loading fails
        WELCOME_MESSAGES = ["Welcome back, {name}! 🌟"];
        MESSAGES = {
            '20-49': ["You're off to a great start! 🚀"],
            '50-60': ["Halfway there! 📊"],
            '60-70': ["Solid progress! 👍"],
            '70-80': ["Maybe time for a stretch? 🧘"],
            '80-90': ["Getting close to your limit! ⚡"],
            '90-99': ["Almost at your limit! 🛑"],
            '100+': ["Goal reached! Time to unplug! 🎯"]
        };
    }
}

/**
 * Initialize the widget
 */
async function init() {
    // Load messages first
    await loadMessages();

    // Check if welcome was already shown today
    welcomeShownToday = wasWelcomeShownToday();

    // Load theme from settings
    await loadTheme();

    // Fetch username for personalized messages
    try {
        // @ts-ignore - electronAPI is added via preload
        username = await window.electronAPI.getUsername();
    } catch (error) {
        console.error('Error loading username:', error);
        username = 'there'; // Fallback
    }

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
        // Update goal if changed
        if (settings.goal) {
            currentGoal = settings.goal;
        }
        // Refresh screen time data to update flash messages (force update)
        fetchScreenTimeData(true);
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
