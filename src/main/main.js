const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');
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
    const windowHeight = 140;
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
            const fs = require('fs');
            // Try .ico format first (better for Windows)
            const iconIcoPaths = [
                path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icons', 'icon.ico'),
                path.join(process.resourcesPath, 'app', 'assets', 'icons', 'icon.ico'),
                path.join(process.resourcesPath, 'assets', 'icons', 'icon.ico')
            ];

            // Then try PNG format
            const iconPngPaths = [
                path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'icons', 'tray-icon.png'),
                path.join(process.resourcesPath, 'app', 'assets', 'icons', 'tray-icon.png'),
                path.join(process.resourcesPath, 'assets', 'icons', 'tray-icon.png')
            ];

            // Try .ico files first
            for (const tryPath of iconIcoPaths) {
                if (fs.existsSync(tryPath)) {
                    iconPath = tryPath;
                    break;
                }
            }

            // If no .ico found, try PNG
            if (!iconPath) {
                for (const tryPath of iconPngPaths) {
                    if (fs.existsSync(tryPath)) {
                        iconPath = tryPath;
                        break;
                    }
                }
            }

            // Final fallback to logo.png
            if (!iconPath) {
                iconPath = path.join(process.resourcesPath, 'logo.png');
            }
        } else {
            // Development mode - try .ico first, then PNG, then logo.png
            const fs = require('fs');
            const iconIco = path.join(__dirname, '../../assets/icons/icon.ico');
            const iconPng = path.join(__dirname, '../../assets/icons/tray-icon.png');
            const logoPath = path.join(__dirname, '../../logo.png');

            if (fs.existsSync(iconIco)) {
                iconPath = iconIco;
            } else if (fs.existsSync(iconPng)) {
                iconPath = iconPng;
            } else {
                iconPath = logoPath;
            }
        }

        logger.info('Using tray icon:', iconPath);
        tray = new Tray(iconPath);

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

        tray.setToolTip('Screen Time Widget');
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
    } catch (error) {
        console.log('Tray icon not created (icon file may not exist yet)');
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

    ipcMain.handle('get-screen-time-breakdown', async (event, dateString = null) => {
        logger.info('=== IPC: get-screen-time-breakdown requested ===', { dateString });
        try {
            const data = await getScreenTimeBreakdown(dateString);
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
