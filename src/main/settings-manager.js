const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const logger = require('./logger');

// Default settings
const defaultSettings = {
    startTime: '08:00 AM',
    endTime: '10:00 PM',
    theme: 'cyan',
    goal: 8 // Daily screen time goal in hours
};

/**
 * Get the settings file path
 * @returns {string} Path to settings file
 */
function getSettingsPath() {
    return path.join(app.getPath('userData'), 'settings.json');
}

/**
 * Load settings from JSON file
 * @returns {Object} Settings object with defaults fallback
 */
function loadSettings() {
    try {
        const settingsPath = getSettingsPath();
        logger.info('Loading settings from:', settingsPath);

        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const loadedSettings = JSON.parse(data);
            logger.info('Settings loaded successfully:', loadedSettings);

            // Merge with defaults to ensure all keys exist
            return { ...defaultSettings, ...loadedSettings };
        } else {
            logger.info('Settings file not found, using defaults');
        }
    } catch (error) {
        logger.error('Error loading settings:', error);
    }

    return defaultSettings;
}

/**
 * Save settings to JSON file
 * @param {Object} settings - Settings object to save
 * @returns {Object} Result with success status
 */
function saveSettings(settings) {
    try {
        const settingsPath = getSettingsPath();
        logger.info('Saving settings to:', settingsPath);
        logger.info('Settings data:', settings);

        // Ensure directory exists
        const dir = path.dirname(settingsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write settings to file
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        logger.info('Settings saved successfully');

        return { success: true };
    } catch (error) {
        logger.error('Error saving settings:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    loadSettings,
    saveSettings,
    defaultSettings
};
