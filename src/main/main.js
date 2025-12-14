const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { getScreenTimeData, getScreenTimeBreakdown } = require('./powershell-bridge');
const { loadSettings, saveSettings } = require('./settings-manager');
const logger = require('./logger');

let mainWindow = null;
let breakdownWindow = null;
let helpWindow = null;
let settingsWindow = null;
let tray = null;

function createWindow() {
    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Calculate position for bottom-right corner with 20px margin
    const windowWidth = 200;
    const windowHeight = 160;
    const x = width - windowWidth - 20;
    const y = height - windowHeight - 20;

    // Create the browser window
    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: x,
        y: y,
        frame: false,
        resizable: true,
        alwaysOnTop: true,
        transparent: true,
        skipTaskbar: false,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Load the index.html
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    // Open DevTools in development (optional)
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

function createBreakdownWindow() {
    // Don't create a new window if one already exists
    if (breakdownWindow) {
        breakdownWindow.focus();
        return;
    }

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Create breakdown window
    breakdownWindow = new BrowserWindow({
        width: 700,
        height: 700,
        x: Math.floor((width - 700) / 2),
        y: Math.floor((height - 700) / 2),
        frame: true,
        resizable: true,
        alwaysOnTop: false,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Load the breakdown.html
    breakdownWindow.loadFile(path.join(__dirname, '../renderer/breakdown.html'));

    // Open DevTools in development (optional)
    // breakdownWindow.webContents.openDevTools();

    breakdownWindow.on('closed', () => {
        breakdownWindow = null;
    });
}

function createHelpWindow() {
    // Don't create a new window if one already exists
    if (helpWindow) {
        helpWindow.focus();
        return;
    }

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Create help window
    helpWindow = new BrowserWindow({
        width: 600,
        height: 600,
        x: Math.floor((width - 600) / 2),
        y: Math.floor((height - 600) / 2),
        frame: true,
        resizable: true,
        alwaysOnTop: false,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Load the help.html
    helpWindow.loadFile(path.join(__dirname, '../renderer/help.html'));

    // Open DevTools in development (optional)
    // helpWindow.webContents.openDevTools();

    helpWindow.on('closed', () => {
        helpWindow = null;
    });
}

function createSettingsWindow() {
    // Don't create a new window if one already exists
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    // Create settings window
    settingsWindow = new BrowserWindow({
        width: 500,
        height: 600,
        x: Math.floor((width - 500) / 2),
        y: Math.floor((height - 600) / 2),
        frame: true,
        resizable: false,
        alwaysOnTop: false,
        backgroundColor: '#000000',
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    // Load the settings.html
    settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

function createTray() {
    // Use tray icon
    try {
        let iconPath;

        // Check if running in packaged app
        if (app.isPackaged) {
            // For packaged app, use icon from unpacked assets
            const iconIco = path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icons', 'icon.ico');
            const iconPng = path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icons', 'icon.png');

            logger.info('Packaged app - checking icon paths');
            logger.info('ICO path: ' + iconIco + ' exists: ' + fs.existsSync(iconIco));
            logger.info('PNG path: ' + iconPng + ' exists: ' + fs.existsSync(iconPng));

            if (fs.existsSync(iconIco)) {
                iconPath = iconIco;
            } else if (fs.existsSync(iconPng)) {
                iconPath = iconPng;
            } else {
                logger.error('No tray icon found in packaged app!');
                return; // Don't create tray if icon is missing
            }
        } else {
            // Development mode
            const iconIco = path.join(__dirname, '../../assets/icons/icon.ico');
            const iconPng = path.join(__dirname, '../../assets/icons/icon.png');

            if (fs.existsSync(iconIco)) {
                iconPath = iconIco;
            } else if (fs.existsSync(iconPng)) {
                iconPath = iconPng;
            } else {
                logger.error('No tray icon found in dev mode!');
                return;
            }
        }

        logger.info('Creating tray with icon: ' + iconPath);
        tray = new Tray(iconPath);

        if (!tray) {
            logger.error('Failed to create tray!');
            return;
        }

        logger.info('Tray created successfully');

        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                    }
                }
            },
            {
                label: 'Hide',
                click: () => {
                    if (mainWindow) {
                        mainWindow.hide();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Open Log File',
                click: () => {
                    const { shell } = require('electron');
                    const logPath = logger.getLogFilePath();
                    shell.openPath(logPath);
                }
            },
            {
                label: 'Quit',
                click: () => {
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('InZone - Screen Time Tracker');
        tray.setContextMenu(contextMenu);

        tray.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.show();
                }
            }
        });

        logger.info('Tray icon setup completed successfully');
    } catch (error) {
        logger.error('Failed to create tray icon!');
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        logger.error('Error details: ' + errorMessage);
        if (errorStack) {
            logger.error('Stack trace: ' + errorStack);
        }
        console.error('Tray icon error:', error);
    }
}

function isAdmin() {
    // Check if running as administrator on Windows
    try {
        const { execSync } = require('child_process');
        const result = execSync('net session', { encoding: 'utf8', stdio: 'pipe' });
        return true; // If command succeeds, we have admin rights
    } catch (error) {
        return false; // If command fails, we don't have admin rights
    }
}

function setupIPC() {
    // IPC Handlers
    ipcMain.handle('get-screen-time-data', async () => {
        logger.info('=== IPC: get-screen-time-data requested ===');
        try {
            const data = await getScreenTimeData();
            logger.info('IPC: Successfully retrieved screen time data', data);
            return data;
        } catch (error) {
            logger.error('IPC: Error getting screen time data', error);
            const errorResponse = {
                date: new Date().toLocaleDateString(),
                screenTime: {
                    formatted: '0 min',
                    totalMinutes: 0
                },
                breakTime: {
                    formatted: '0 min',
                    totalMinutes: 0
                },
                lastUpdated: new Date().toISOString(),
                success: false,
                error: error.message
            };
            logger.info('IPC: Returning error response', errorResponse);
            return errorResponse;
        }
    });

    ipcMain.handle('get-screen-time-breakdown', async (event, dateString = null, startTime = null, endTime = null) => {
        logger.info('=== IPC: get-screen-time-breakdown requested ===', { dateString, startTime, endTime });
        try {
            const data = await getScreenTimeBreakdown(dateString, startTime, endTime);
            logger.info('IPC: Successfully retrieved breakdown data', data);
            return data;
        } catch (error) {
            logger.error('IPC: Error getting breakdown data', error);
            const errorResponse = {
                date: dateString || new Date().toLocaleDateString(),
                totalScreenTime: '0 min',
                totalBreakTime: '0 min',
                activeSessions: [],
                breaks: [],
                success: false,
                error: error.message
            };
            logger.info('IPC: Returning error response', errorResponse);
            return errorResponse;
        }
    });

    ipcMain.handle('check-admin-status', () => {
        const isAdminUser = isAdmin();
        logger.info('Admin status checked', { isAdmin: isAdminUser });
        return isAdminUser;
    });

    ipcMain.on('minimize-to-tray', () => {
        if (mainWindow) {
            mainWindow.hide();
        }
    });

    ipcMain.on('close-window', () => {
        if (mainWindow) {
            mainWindow.hide();
        }
    });

    ipcMain.on('open-breakdown-window', () => {
        createBreakdownWindow();
    });

    ipcMain.on('open-help-window', () => {
        createHelpWindow();
    });

    ipcMain.on('open-settings-window', () => {
        createSettingsWindow();
    });

    ipcMain.handle('get-settings', async () => {
        logger.info('=== IPC: get-settings requested ===');
        try {
            const settings = loadSettings();
            logger.info('IPC: Successfully retrieved settings', settings);
            return settings;
        } catch (error) {
            logger.error('IPC: Error getting settings', error);
            return { startTime: '08:00 AM', endTime: '10:00 PM', theme: 'cyan' };
        }
    });

    ipcMain.handle('save-settings', async (event, settings) => {
        logger.info('=== IPC: save-settings requested ===', settings);
        try {
            const result = saveSettings(settings);
            logger.info('IPC: Settings saved successfully', result);

            // Broadcast theme change to all windows
            if (settings && settings.theme) {
                BrowserWindow.getAllWindows().forEach(window => {
                    window.webContents.send('theme-changed', settings.theme);
                });
                logger.info('IPC: Theme change broadcasted to all windows', settings.theme);
            }

            // Broadcast settings update to main window to refresh data (especially for goal changes)
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('settings-updated', settings);
                logger.info('IPC: Settings update broadcasted to main window');
            }

            return result;
        } catch (error) {
            logger.error('IPC: Error saving settings', error);
            return { success: false, error: error.message };
        }
    });
}

// App lifecycle
app.whenReady().then(() => {
    setupIPC();
    createWindow();
    createTray();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On Windows, keep app running in tray
    // Don't quit the app when all windows are closed
    // User must use tray menu to quit
});

app.on('before-quit', () => {
    if (tray) {
        tray.destroy();
    }
});
