const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const logger = require('./logger');
const { loadSettings } = require('./settings-manager');

/**
 * Executes the PowerShell script to fetch screen time data
 * @returns {Promise<Object>} Screen time data object
 */
function getScreenTimeData() {
    return new Promise((resolve, reject) => {
        logger.info('=== Starting PowerShell execution ===');

        // Determine the correct path to PowerShell script
        let scriptPath;

        // Check if running in packaged app
        if (app.isPackaged) {
            // In production, resources are in app.asar or resources folder
            scriptPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'screen-time-data.ps1');

            // Fallback: try app.asar path
            if (!fs.existsSync(scriptPath)) {
                scriptPath = path.join(process.resourcesPath, 'app', 'src', 'main', 'screen-time-data.ps1');
            }

            // Fallback: try direct resources path
            if (!fs.existsSync(scriptPath)) {
                scriptPath = path.join(process.resourcesPath, 'src', 'main', 'screen-time-data.ps1');
            }

            logger.info('Running in packaged mode', {
                resourcesPath: process.resourcesPath,
                scriptPath: scriptPath,
                exists: fs.existsSync(scriptPath)
            });
        } else {
            // Development mode
            scriptPath = path.join(__dirname, 'screen-time-data.ps1');
            logger.info('Running in development mode', {
                __dirname: __dirname,
                scriptPath: scriptPath,
                exists: fs.existsSync(scriptPath)
            });
        }

        // Verify script exists
        if (!fs.existsSync(scriptPath)) {
            const error = `PowerShell script not found at: ${scriptPath}`;
            logger.error(error, {
                checked: scriptPath,
                isPackaged: app.isPackaged,
                cwd: process.cwd(),
                __dirname: __dirname,
                resourcesPath: app.isPackaged ? process.resourcesPath : 'N/A'
            });

            return resolve({
                date: new Date().toLocaleDateString(),
                screenTime: { formatted: '0 min', totalMinutes: 0 },
                breakTime: { formatted: '0 min', totalMinutes: 0 },
                lastUpdated: new Date().toISOString(),
                success: false,
                error: `Script not found: ${scriptPath}`
            });
        }

        logger.info('Script found, executing PowerShell', { scriptPath });

        // Load settings for time range
        const settings = loadSettings();

        // Execute PowerShell script with time range parameters
        let command = `powershell.exe -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${scriptPath}"`;
        command += ` -StartTimeOfDay "${settings.startTime}"`;
        command += ` -EndTimeOfDay "${settings.endTime}"`;
        logger.debug('PowerShell command', { command, settings });

        const startTime = Date.now();

        exec(command, {
            maxBuffer: 1024 * 1024,
            timeout: 30000 // 30 second timeout
        }, (error, stdout, stderr) => {
            const duration = Date.now() - startTime;

            logger.info('PowerShell execution completed', {
                duration: `${duration}ms`,
                hasError: !!error,
                stdoutLength: stdout ? stdout.length : 0,
                stderrLength: stderr ? stderr.length : 0
            });

            if (error) {
                logger.error('PowerShell execution error', {
                    error: error.message,
                    code: error.code,
                    signal: error.signal,
                    stdout: stdout,
                    stderr: stderr
                });

                return resolve({
                    date: new Date().toLocaleDateString(),
                    screenTime: { formatted: '0 min', totalMinutes: 0 },
                    breakTime: { formatted: '0 min', totalMinutes: 0 },
                    lastUpdated: new Date().toISOString(),
                    success: false,
                    error: `PowerShell error: ${error.message}`
                });
            }

            if (stderr) {
                logger.warn('PowerShell stderr output', { stderr });
            }

            logger.debug('PowerShell stdout', { stdout: stdout.substring(0, 500) });

            try {
                // Parse JSON output from PowerShell
                const trimmedOutput = stdout.trim();

                if (!trimmedOutput) {
                    logger.error('PowerShell returned empty output');
                    return resolve({
                        date: new Date().toLocaleDateString(),
                        screenTime: { formatted: '0 min', totalMinutes: 0 },
                        breakTime: { formatted: '0 min', totalMinutes: 0 },
                        lastUpdated: new Date().toISOString(),
                        success: false,
                        error: 'PowerShell returned no data'
                    });
                }

                const data = JSON.parse(trimmedOutput);
                logger.info('Successfully parsed PowerShell output', { data });
                resolve(data);

            } catch (parseError) {
                logger.error('JSON parse error', {
                    error: parseError.message,
                    stdout: stdout,
                    trimmedOutput: stdout.trim().substring(0, 200)
                });

                resolve({
                    date: new Date().toLocaleDateString(),
                    screenTime: { formatted: '0 min', totalMinutes: 0 },
                    breakTime: { formatted: '0 min', totalMinutes: 0 },
                    lastUpdated: new Date().toISOString(),
                    success: false,
                    error: `Parse error: ${parseError.message}`
                });
            }
        });
    });
}

/**
 * Executes the PowerShell script to fetch detailed screen time breakdown
 * @param {string} dateString - Optional date string in YYYY-MM-DD format
 * @returns {Promise<Object>} Detailed breakdown data with sessions and breaks
 */
function getScreenTimeBreakdown(dateString = null, startTime = null, endTime = null) {
    return new Promise((resolve, reject) => {
        logger.info('=== Starting PowerShell breakdown execution ===', { dateString, startTime, endTime });

        // Determine the correct path to PowerShell script
        let scriptPath;

        // Check if running in packaged app
        if (app.isPackaged) {
            // In production, resources are in app.asar or resources folder
            scriptPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'screen-time-breakdown.ps1');

            // Fallback: try app.asar path
            if (!fs.existsSync(scriptPath)) {
                scriptPath = path.join(process.resourcesPath, 'app', 'src', 'main', 'screen-time-breakdown.ps1');
            }

            // Fallback: try direct resources path
            if (!fs.existsSync(scriptPath)) {
                scriptPath = path.join(process.resourcesPath, 'src', 'main', 'screen-time-breakdown.ps1');
            }

            logger.info('Running in packaged mode (breakdown)', {
                resourcesPath: process.resourcesPath,
                scriptPath: scriptPath,
                exists: fs.existsSync(scriptPath)
            });
        } else {
            // Development mode
            scriptPath = path.join(__dirname, 'screen-time-breakdown.ps1');
            logger.info('Running in development mode (breakdown)', {
                __dirname: __dirname,
                scriptPath: scriptPath,
                exists: fs.existsSync(scriptPath)
            });
        }

        // Verify script exists
        if (!fs.existsSync(scriptPath)) {
            const error = `PowerShell breakdown script not found at: ${scriptPath}`;
            logger.error(error);

            return resolve({
                date: new Date().toLocaleDateString(),
                totalScreenTime: '0 min',
                totalBreakTime: '0 min',
                activeSessions: [],
                breaks: [],
                success: false,
                error: `Script not found: ${scriptPath}`
            });
        }

        logger.info('Breakdown script found, executing PowerShell', { scriptPath });

        // Load settings for time range (use as defaults if not provided)
        const settings = loadSettings();
        const finalStartTime = startTime || settings.startTime;
        const finalEndTime = endTime || settings.endTime;

        // Execute PowerShell script with optional date parameter and time range
        let command = `powershell.exe -ExecutionPolicy Bypass -NoProfile -NonInteractive -File "${scriptPath}"`;
        if (dateString) {
            command += ` -DateString "${dateString}"`;
        }
        command += ` -StartTimeOfDay "${finalStartTime}"`;
        command += ` -EndTimeOfDay "${finalEndTime}"`;
        logger.debug('PowerShell breakdown command', { command, dateString, finalStartTime, finalEndTime });

        const execStartTime = Date.now();

        exec(command, {
            maxBuffer: 1024 * 1024,
            timeout: 30000 // 30 second timeout
        }, (error, stdout, stderr) => {
            const duration = Date.now() - execStartTime;

            logger.info('PowerShell breakdown execution completed', {
                duration: `${duration}ms`,
                hasError: !!error,
                stdoutLength: stdout ? stdout.length : 0,
                stderrLength: stderr ? stderr.length : 0
            });

            if (error) {
                logger.error('PowerShell breakdown execution error', {
                    error: error.message,
                    stdout: stdout,
                    stderr: stderr
                });

                return resolve({
                    date: new Date().toLocaleDateString(),
                    totalScreenTime: '0 min',
                    totalBreakTime: '0 min',
                    activeSessions: [],
                    breaks: [],
                    success: false,
                    error: `PowerShell error: ${error.message}`
                });
            }

            if (stderr) {
                logger.warn('PowerShell breakdown stderr output', { stderr });
            }

            logger.debug('PowerShell breakdown stdout', { stdout: stdout.substring(0, 500) });

            try {
                // Parse JSON output from PowerShell
                const trimmedOutput = stdout.trim();

                if (!trimmedOutput) {
                    logger.error('PowerShell breakdown returned empty output');
                    return resolve({
                        date: new Date().toLocaleDateString(),
                        totalScreenTime: '0 min',
                        totalBreakTime: '0 min',
                        activeSessions: [],
                        breaks: [],
                        success: false,
                        error: 'PowerShell returned no data'
                    });
                }

                const data = JSON.parse(trimmedOutput);
                logger.info('Successfully parsed PowerShell breakdown output', { data });
                resolve(data);

            } catch (parseError) {
                logger.error('JSON parse error (breakdown)', {
                    error: parseError.message,
                    stdout: stdout,
                    trimmedOutput: stdout.trim().substring(0, 200)
                });

                resolve({
                    date: new Date().toLocaleDateString(),
                    totalScreenTime: '0 min',
                    totalBreakTime: '0 min',
                    activeSessions: [],
                    breaks: [],
                    success: false,
                    error: `Parse error: ${parseError.message}`
                });
            }
        });
    });
}

module.exports = {
    getScreenTimeData,
    getScreenTimeBreakdown
};
