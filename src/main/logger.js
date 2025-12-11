const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Get log file path - in user's app data folder
const getLogPath = () => {
    try {
        const userDataPath = app.getPath('userData');
        return path.join(userDataPath, 'screen-time-widget.log');
    } catch (error) {
        // Fallback if app is not ready
        return path.join(process.cwd(), 'screen-time-widget.log');
    }
};

/**
 * Write log message to file
 */
function log(level, message, data = null) {
    try {
        const timestamp = new Date().toISOString();
        const logPath = getLogPath();

        let logMessage = `[${timestamp}] [${level}] ${message}`;

        if (data) {
            if (typeof data === 'object') {
                logMessage += `\n${JSON.stringify(data, null, 2)}`;
            } else {
                logMessage += `\n${data}`;
            }
        }

        logMessage += '\n' + '-'.repeat(80) + '\n';

        // Append to log file
        fs.appendFileSync(logPath, logMessage);

        // Also log to console
        console.log(logMessage);
    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
}

/**
 * Log info message
 */
function info(message, data = null) {
    log('INFO', message, data);
}

/**
 * Log error message
 */
function error(message, data = null) {
    log('ERROR', message, data);
}

/**
 * Log warning message
 */
function warn(message, data = null) {
    log('WARN', message, data);
}

/**
 * Log debug message
 */
function debug(message, data = null) {
    log('DEBUG', message, data);
}

/**
 * Get the log file path for display
 */
function getLogFilePath() {
    return getLogPath();
}

/**
 * Clear the log file
 */
function clearLog() {
    try {
        const logPath = getLogPath();
        if (fs.existsSync(logPath)) {
            fs.unlinkSync(logPath);
        }
        info('Log file cleared');
    } catch (err) {
        error('Failed to clear log file', err);
    }
}

module.exports = {
    info,
    error,
    warn,
    debug,
    getLogFilePath,
    clearLog
};
