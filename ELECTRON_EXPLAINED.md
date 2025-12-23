# InZone Screen Time App - Complete Working Anatomy

---

## Table of Contents
1. [What is Electron?](#what-is-electron)
2. [Project Architecture Overview](#project-architecture-overview)
3. [How HTML/JS Gets Wrapped for Desktop](#how-htmljs-gets-wrapped-for-desktop)
4. [The Three Processes of Electron](#the-three-processes-of-electron)
5. [Complete Code Flow from Startup to Running](#complete-code-flow-from-startup-to-running)
6. [How .exe Installation Works](#how-exe-installation-works)
7. [Deep Dive: Communication Between Processes](#deep-dive-communication-between-processes)
8. [Building and Packaging Process](#building-and-packaging-process)
9. [Common Questions Answered](#common-questions-answered)

---

## What is Electron?

**Think of Electron as a web browser bundled with your app.**

When you write a normal web application, users need to open Chrome or Firefox to use it. With Electron, you **ship your own mini-browser** that runs only your application.

### Key Components:
- **Chromium**: The rendering engine (same as Chrome) that displays your HTML/CSS/JS
- **Node.js**: Gives you access to the computer's filesystem, system APIs, and native features
- **V8**: JavaScript engine that executes your code

### Why is this powerful?
As a frontend dev, you already know HTML, CSS, and JavaScript. Electron lets you use those same skills to build **real desktop applications** that can:
- Access the file system (read/write files)
- Create system tray icons
- Send notifications
- Run background processes
- Auto-update themselves
- Everything a native app can do!

---

## Project Architecture Overview

Your InZone app has a simple folder structure:

```
screen-time-clean/
│
├── src/                          # All source code
│   ├── main/                     # Backend (Node.js side)
│   │   ├── main.js              # Entry point - starts everything
│   │   ├── auto-updater.js      # Handles app updates
│   │   ├── powershell-bridge.js # Executes PowerShell to get screen time
│   │   ├── settings-manager.js  # Saves/loads user settings
│   │   ├── logger.js            # Writes logs to file
│   │   └── *.ps1 files          # PowerShell scripts for Windows integration
│   │
│   ├── renderer/                 # Frontend (Browser side)
│   │   ├── index.html           # Main widget UI
│   │   ├── renderer.js          # Main widget logic
│   │   ├── styles.css           # Main widget styles
│   │   ├── breakdown.html       # Detailed stats UI
│   │   ├── breakdown.js         # Detailed stats logic
│   │   ├── settings.html        # Settings UI
│   │   └── settings.js          # Settings logic
│   │
│   └── preload/                  # Security bridge
│       └── preload.js           # Safe API for renderer to talk to main
│
├── assets/                       # Images, icons, JSON data
│   ├── icons/                   # App icons for Windows
│   ├── messages.json            # Flash messages content
│   └── *.png, *.bmp files       # Images used in app/installer
│
├── package.json                  # Project config & dependencies
└── installer.nsh                 # Custom installer script
```

---

## How HTML/JS Gets Wrapped for Desktop

### The Magic Explained

**Step 1: You write normal web code**
```html
<!-- index.html - looks like any webpage! -->
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="screen-time">00:00</div>
    <script src="renderer.js"></script>
</body>
</html>
```

**Step 2: Electron wraps it in a BrowserWindow**

```javascript
// main.js - creates a window that shows your HTML
const { BrowserWindow } = require('electron');

const mainWindow = new BrowserWindow({
    width: 200,
    height: 160,
    frame: false,        // No title bar (custom design!)
    transparent: true,   // Can have transparent background
    alwaysOnTop: true,   // Stays above other windows
});

// Load your HTML file into this window
mainWindow.loadFile('src/renderer/index.html');
```

**Step 3: Your HTML now runs in a desktop window!**

Instead of opening in Chrome/Firefox, your HTML opens in Electron's built-in browser. But unlike a regular webpage, you can now:
- Position the window anywhere on screen
- Make it frameless (no title bar)
- Keep it always on top
- Access system APIs through special bridges

### Real Example from InZone:

Your main widget is just HTML positioned in the **bottom-right corner** of the screen:

```javascript
// Calculate position for bottom-right corner
const { screen } = require('electron');
const primaryDisplay = screen.getPrimaryDisplay();
const { width, height } = primaryDisplay.workAreaSize;

const mainWindow = new BrowserWindow({
    x: width - 200 - 20,   // 20px from right edge
    y: height - 160 - 20,  // 20px from bottom
    width: 200,
    height: 160,
});
```

---

## The Three Processes of Electron

This is the **most important concept** to understand!

### 1. Main Process (Backend - Node.js)
**File**: `src/main/main.js`
**What it is**: The Node.js server that controls your application
**What it can do**:
- Create and manage windows
- Access the file system (read/write files)
- Execute system commands (like PowerShell scripts)
- Create system tray icons
- Handle app lifecycle (startup, quit)

**Think of it as**: The backend server, but running on the user's computer

**Example**:
```javascript
// main.js can access Node.js modules
const fs = require('fs');
const path = require('path');

// Read a settings file
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath));
```

### 2. Renderer Process (Frontend - Chromium)
**Files**: `src/renderer/*.html`, `src/renderer/*.js`
**What it is**: Your HTML/CSS/JavaScript running in a browser-like environment
**What it can do**:
- Display UI (HTML, CSS)
- Handle user interactions (clicks, inputs)
- Update the DOM
- Run JavaScript logic

**What it CANNOT do** (for security):
- Access file system directly
- Execute system commands
- Access Node.js modules

**Think of it as**: A regular webpage, but running inside your app instead of a browser

**Example**:
```javascript
// renderer.js - just like web development!
document.getElementById('refresh-btn').addEventListener('click', async () => {
    // Can't directly read files or run PowerShell
    // Must ask the main process to do it
    const data = await window.electronAPI.getScreenTime();
    updateUI(data);
});
```

### 3. Preload Script (Security Bridge)
**File**: `src/preload/preload.js`
**What it is**: A special script that creates a **safe bridge** between main and renderer
**Why it exists**: Security! You don't want every webpage to access your file system.

**Think of it as**: A security guard that only allows specific, pre-approved actions

**Example**:
```javascript
// preload.js - exposes ONLY safe methods to renderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Renderer can ONLY call these specific functions
    getScreenTime: () => ipcRenderer.invoke('get-screen-time-data'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    // That's it! Nothing else is accessible.
});
```

Now in your renderer, you can use:
```javascript
// renderer.js
const data = await window.electronAPI.getScreenTime(); // ✅ Allowed
fs.readFileSync('./secret.txt');                       // ❌ Blocked!
```

---

## Complete Code Flow from Startup to Running

Let's trace **exactly** what happens when a user double-clicks your app icon!

### Phase 1: Application Startup (Main Process)

**1. User double-clicks InZone.exe**

**2. Electron reads package.json**
```json
{
  "name": "inzone",
  "version": "1.0.1",
  "main": "src/main/main.js"  // ← Electron starts here!
}
```

**3. Electron executes main.js**

```javascript
// src/main/main.js
const { app, BrowserWindow } = require('electron');

// Wait for Electron to be ready
app.whenReady().then(() => {
    console.log('App is starting...');

    // Step 4: Create the main window
    createWindow();

    // Step 5: Create system tray icon
    createTray();

    // Step 6: Set up IPC handlers (communication channels)
    setupIPC();

    // Step 7: Initialize auto-updater
    initAutoUpdater();
});
```

**4. createWindow() executes**

```javascript
function createWindow() {
    // Create a browser window
    mainWindow = new BrowserWindow({
        width: 200,
        height: 160,
        x: screenWidth - 220,
        y: screenHeight - 180,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        webPreferences: {
            // SECURITY: Specify the preload script
            preload: path.join(__dirname, '../preload/preload.js'),
            contextIsolation: true,    // Isolate contexts (secure)
            nodeIntegration: false     // Don't give renderer Node.js access
        }
    });

    // Load the HTML file
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
}
```

**5. setupIPC() creates communication channels**

```javascript
function setupIPC() {
    const { ipcMain } = require('electron');

    // Set up handlers for renderer requests
    ipcMain.handle('get-screen-time-data', async () => {
        // When renderer asks for data, run PowerShell script
        const data = await getScreenTimeData();
        return data;
    });

    ipcMain.handle('save-settings', async (event, settings) => {
        // When renderer saves settings, write to file
        await settingsManager.saveSettings(settings);

        // Broadcast to all windows so they update
        BrowserWindow.getAllWindows().forEach(window => {
            window.webContents.send('settings-updated', settings);
        });

        return { success: true };
    });

    // ... more handlers
}
```

### Phase 2: Window Loading (Renderer Process Starts)

**6. Electron loads index.html**

```html
<!-- src/renderer/index.html -->
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="widget-container" data-theme="cyan">
        <div class="screen-time-display">
            <span id="screen-time">00:00</span>
        </div>
        <div id="flash-message" class="flash-message"></div>
        <div class="controls">
            <button id="expand-btn">⊞</button>
            <button id="settings-btn">⚙</button>
        </div>
    </div>

    <!-- Load the renderer JavaScript -->
    <script src="renderer.js"></script>
</body>
</html>
```

**7. Preload script executes BEFORE renderer.js**

```javascript
// src/preload/preload.js - runs first!
const { contextBridge, ipcRenderer } = require('electron');

// Expose safe API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
    getScreenTime: () => ipcRenderer.invoke('get-screen-time-data'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    onSettingsUpdated: (callback) => {
        ipcRenderer.on('settings-updated', (event, settings) => {
            callback(settings);
        });
    },
    // ... more safe methods
});

console.log('Preload script done! window.electronAPI is now available.');
```

**8. renderer.js executes**

```javascript
// src/renderer/renderer.js

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Renderer started!');

    // Now we can use the API that preload exposed
    await init();
});

async function init() {
    // Step 1: Load messages from JSON
    await loadMessages();

    // Step 2: Load user settings
    const settings = await window.electronAPI.getSettings();
    applyTheme(settings.theme);

    // Step 3: Fetch initial screen time data
    await updateScreenTime();

    // Step 4: Set up event listeners
    setupEventListeners();

    // Step 5: Start auto-refresh (every 5 minutes)
    setInterval(updateScreenTime, 5 * 60 * 1000);
}

async function updateScreenTime() {
    // Ask main process for data
    const data = await window.electronAPI.getScreenTime();

    // Update the UI
    document.getElementById('screen-time').textContent = formatTime(data.screenTime);

    // Show message if needed
    checkAndShowMessage(data);
}

function setupEventListeners() {
    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
        window.electronAPI.openSettingsWindow();
    });

    // Listen for theme changes from settings window
    window.electronAPI.onSettingsUpdated((settings) => {
        applyTheme(settings.theme);
    });
}
```

### Phase 3: First Data Fetch (IPC Communication)

**9. Renderer requests screen time data**

```javascript
// renderer.js
const data = await window.electronAPI.getScreenTime();
```

**Flow**:
```
Renderer (await window.electronAPI.getScreenTime())
    ↓
Preload (ipcRenderer.invoke('get-screen-time-data'))
    ↓
Main Process (ipcMain.handle('get-screen-time-data'))
    ↓
PowerShell Bridge (executes screen-time-data.ps1)
    ↓
PowerShell Script (reads Windows event logs for screen activity)
    ↓
Returns JSON: { screenTime: 263, breakTime: 45, date: "2025-12-15" }
    ↓
Main Process (receives result, returns it)
    ↓
Preload (passes through)
    ↓
Renderer (receives data, updates DOM)
```

**10. UI updates with data**

```javascript
// renderer.js
function displayScreenTime(data) {
    const hours = Math.floor(data.screenTime / 60);
    const minutes = data.screenTime % 60;
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    document.getElementById('screen-time').textContent = formatted;
    // Shows: "04:23"
}
```

### Phase 4: User Interaction Example

**11. User clicks Settings button**

```javascript
// renderer.js
document.getElementById('settings-btn').addEventListener('click', () => {
    window.electronAPI.openSettingsWindow();
});
```

**12. Message sent to main process**

```javascript
// preload.js
openSettingsWindow: () => ipcRenderer.send('open-settings-window')
```

**13. Main process creates settings window**

```javascript
// main.js
ipcMain.on('open-settings-window', () => {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 500,
        height: 600,
        parent: mainWindow,  // Modal to main window
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.js')
        }
    });

    settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));
});
```

**14. Settings window appears!** Now it runs its own renderer process with settings.html and settings.js.

**15. User changes theme and saves**

```javascript
// settings.js
document.getElementById('save-btn').addEventListener('click', async () => {
    const settings = {
        theme: document.getElementById('theme-select').value,
        goal: parseInt(document.getElementById('goal-input').value),
        startTime: document.getElementById('start-time').value,
        endTime: document.getElementById('end-time').value
    };

    // Send to main process
    await window.electronAPI.saveSettings(settings);

    // Close settings window
    window.electronAPI.closeWindow();
});
```

**16. Main process saves and broadcasts**

```javascript
// main.js
ipcMain.handle('save-settings', async (event, settings) => {
    // Save to file
    const fs = require('fs');
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // Broadcast to ALL open windows
    BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('settings-updated', settings);
    });

    return { success: true };
});
```

**17. Main window receives broadcast and updates theme**

```javascript
// renderer.js
window.electronAPI.onSettingsUpdated((settings) => {
    // Apply new theme
    document.querySelector('.widget-container').setAttribute('data-theme', settings.theme);
});
```

**18. CSS reacts to theme change**

```css
/* styles.css */
.widget-container[data-theme="cyan"] {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.widget-container[data-theme="orange"] {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
```

---

## How .exe Installation Works

### Step 1: Building the Application

**What happens when you run `npm run build`?**

```json
// package.json
{
  "scripts": {
    "build": "electron-builder build --win --x64"
  }
}
```

**Electron Builder Process**:

1. **Gathers all source files**:
   - Everything in `src/`
   - Everything in `assets/`
   - `package.json`

2. **Downloads Electron binary**:
   - Downloads Electron.exe (Windows Chromium + Node.js bundle)
   - Size: ~150 MB

3. **Packages your app**:
   - Creates an `app.asar` file (compressed archive of your code)
   - ASAR = Electron Archive format (like a ZIP file)
   - Contains all your HTML/JS/CSS/JSON files

4. **Bundles everything together**:
   ```
   InZone.exe (renamed Electron.exe)
   ├── resources/
   │   ├── app.asar              (your code, compressed)
   │   ├── app.asar.unpacked/    (files that need direct access)
   │   │   ├── src/main/*.ps1    (PowerShell scripts)
   │   │   └── assets/icons/*    (icon files)
   │   └── electron.asar         (Electron framework)
   ```

5. **Creates installer**:
   - Uses NSIS (Nullsoft Scriptable Install System)
   - Generates `InZone Setup 1.0.1.exe`

### Step 2: What's in the .exe installer?

The installer contains:
- Your app bundle (InZone.exe + resources/)
- Installation script (where to copy files)
- Uninstaller
- Custom graphics (installer-sidebar.bmp)

### Step 3: Installation Flow

**When user runs InZone Setup 1.0.1.exe:**

1. **Installer extracts files to**:
   ```
   C:\Users\{Username}\AppData\Local\Programs\InZone\
   ├── InZone.exe             (main executable)
   ├── resources/
   │   ├── app.asar           (your app)
   │   └── app.asar.unpacked/
   ├── locales/               (Chromium language files)
   ├── chrome_100_percent.pak (Chromium resources)
   └── ... (other Electron files)
   ```

2. **Creates shortcuts**:
   - Desktop: `C:\Users\{Username}\Desktop\InZone.lnk`
   - Start Menu: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\InZone\InZone.lnk`

3. **Registers in Windows**:
   - Adds to "Apps & Features" (Control Panel)
   - Creates uninstaller at: `C:\Users\{Username}\AppData\Local\Programs\InZone\Uninstall InZone.exe`

4. **Sets up auto-update**:
   - Your app will check GitHub for updates
   - URL: `https://github.com/gokulan04/screen-time-widget/releases`

### Step 4: How the .exe runs your code

**When user double-clicks InZone.exe:**

```
InZone.exe starts
    ↓
Loads Electron runtime (Chromium + Node.js)
    ↓
Reads resources/app.asar/package.json
    ↓
Finds "main": "src/main/main.js"
    ↓
Executes main.js with Node.js
    ↓
main.js creates BrowserWindow
    ↓
BrowserWindow loads index.html from app.asar
    ↓
Your app is running!
```

### Understanding ASAR Archives

**Why use ASAR?**
- **Performance**: One file is faster to read than thousands
- **Mild obfuscation**: Source code is in binary format (not encrypted, just packaged)
- **Electron can read directly**: No need to extract

**What gets unpacked?**
Some files can't be in ASAR:
```json
// package.json
{
  "build": {
    "asarUnpack": [
      "src/main/*.ps1",      // PowerShell scripts need direct access
      "assets/icons/*",      // Icon files need direct paths
      "assets/*.png"
    ]
  }
}
```

These files go to `app.asar.unpacked/` folder.

**How your code accesses files**:

```javascript
// main.js
const path = require('path');

// Development: __dirname = /e/projects/screen-time-clean/src/main
// Production: __dirname = /C/.../resources/app.asar/src/main

// To get unpacked files in production:
const isDev = !app.isPackaged;
const psScriptPath = isDev
    ? path.join(__dirname, 'screen-time-data.ps1')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'screen-time-data.ps1');
```

---

## Deep Dive: Communication Between Processes

### IPC (Inter-Process Communication)

Think of IPC like **sending messages between different programs**. Your main process and renderer process are separate programs that can't directly talk to each other.

### Two IPC Patterns

#### Pattern 1: Request-Response (invoke/handle)

**Used for**: Getting data, performing operations that return results

```javascript
// RENDERER: Ask for data
const data = await window.electronAPI.getScreenTime();

// PRELOAD: Forward the request
getScreenTime: () => ipcRenderer.invoke('get-screen-time-data')

// MAIN: Handle the request and return data
ipcMain.handle('get-screen-time-data', async () => {
    const data = await fetchScreenTimeFromWindows();
    return data;  // ← Goes back to renderer
});
```

**Flow**:
```
Renderer asks → Preload forwards → Main handles → Returns data → Preload forwards → Renderer receives
```

**Real Example - Save Settings**:

```javascript
// renderer.js (settings window)
const saveButton = document.getElementById('save-btn');
saveButton.addEventListener('click', async () => {
    const newSettings = {
        theme: 'cyan',
        goal: 8
    };

    const result = await window.electronAPI.saveSettings(newSettings);
    if (result.success) {
        alert('Settings saved!');
    }
});

// preload.js
saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings)

// main.js
ipcMain.handle('save-settings', async (event, settings) => {
    try {
        // Save to file
        fs.writeFileSync(settingsPath, JSON.stringify(settings));

        // Broadcast to all windows
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('settings-updated', settings);
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

#### Pattern 2: One-Way Events (send/on)

**Used for**: Commands, notifications that don't need a response

```javascript
// RENDERER: Send a command
window.electronAPI.minimizeToTray();

// PRELOAD: Forward the command
minimizeToTray: () => ipcRenderer.send('minimize-to-tray')

// MAIN: Listen for the command
ipcMain.on('minimize-to-tray', () => {
    mainWindow.hide();
    // No return value needed
});
```

#### Pattern 3: Broadcast Events (send from main)

**Used for**: Notifying all windows about changes

```javascript
// MAIN: Broadcast to all windows
BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('theme-changed', 'cyan');
});

// PRELOAD: Set up listener
onThemeChanged: (callback) => {
    ipcRenderer.on('theme-changed', (event, theme) => {
        callback(theme);
    });
}

// RENDERER: React to broadcasts
window.electronAPI.onThemeChanged((newTheme) => {
    document.body.setAttribute('data-theme', newTheme);
});
```

### Complete IPC Example: User Changes Theme

Let's trace the **entire flow** when user changes theme from cyan to orange:

```
1. USER ACTION
   User selects "orange" in settings dropdown
   ↓

2. SETTINGS WINDOW (renderer)
   settings.js:
   - Reads form values
   - Calls: await window.electronAPI.saveSettings({ theme: 'orange', ... })
   ↓

3. PRELOAD (settings window)
   preload.js:
   - Receives call
   - Forwards via: ipcRenderer.invoke('save-settings', { theme: 'orange', ... })
   ↓

4. MAIN PROCESS
   main.js:
   - ipcMain.handle('save-settings') receives the request
   - Saves to: C:\Users\{User}\AppData\Roaming\InZone\settings.json
   - Broadcasts to ALL windows:
     BrowserWindow.getAllWindows().forEach(win => {
         win.webContents.send('settings-updated', { theme: 'orange', ... });
     });
   - Returns: { success: true }
   ↓

5. PRELOAD (main window)
   preload.js:
   - ipcRenderer.on('settings-updated') fires
   - Calls registered callback
   ↓

6. MAIN WINDOW (renderer)
   renderer.js:
   - window.electronAPI.onSettingsUpdated() callback executes
   - Updates: document.querySelector('.widget-container').dataset.theme = 'orange'
   ↓

7. CSS UPDATES
   styles.css:
   - [data-theme="orange"] selector now matches
   - Background gradient changes to orange
   ↓

8. RESULT
   User sees theme change in real-time in main widget!
```

---

## Building and Packaging Process

### Development vs Production

**Development (npm start)**:
```bash
npm start
```

What happens:
1. Runs: `electron .` (from package.json)
2. Electron looks at package.json → finds `"main": "src/main/main.js"`
3. Executes main.js with full Node.js access
4. Windows open with your HTML files
5. **Hot reload**: You can edit files and refresh with Ctrl+R
6. **DevTools**: Press Ctrl+Shift+I to debug like in Chrome

File paths in dev:
```javascript
__dirname = "e:\projects\screen-time-clean\src\main"
```

**Production (npm run build)**:
```bash
npm run build
```

What happens:
1. `electron-builder` reads build config from package.json:

```json
{
  "build": {
    "appId": "com.inzone",
    "productName": "InZone",
    "win": {
      "target": ["nsis"],  // Create Windows installer
      "icon": "assets/icons/icon-256.png",
      "requestedExecutionLevel": "requireAdministrator"
    },
    "nsis": {
      "oneClick": false,  // User chooses install location
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "perMachine": true,  // Install for all users
      "include": "installer.nsh"  // Custom installer script
    }
  }
}
```

2. **Electron-builder steps**:
   ```
   Step 1: Download Electron binary for Windows (x64)
           Size: ~150 MB

   Step 2: Package app into app.asar
           - Compress all JS/HTML/CSS/JSON
           - Output: resources/app.asar

   Step 3: Copy unpacked files
           - PowerShell scripts → resources/app.asar.unpacked/
           - Icons → resources/app.asar.unpacked/assets/icons/

   Step 4: Rename Electron.exe → InZone.exe

   Step 5: Generate NSIS installer script
           - Combines: installer.nsh + generated script
           - Adds: sidebar images, uninstaller

   Step 6: Compile installer
           - Output: dist/InZone Setup 1.0.1.exe
           - Size: ~170 MB (includes Electron + your app)
   ```

3. **Final output structure**:
   ```
   dist/
   ├── InZone Setup 1.0.1.exe    (installer - this is what users download)
   ├── win-unpacked/             (unpacked app for testing)
   │   ├── InZone.exe
   │   ├── resources/
   │   │   ├── app.asar
   │   │   └── app.asar.unpacked/
   │   └── ... (Electron files)
   └── latest.yml                (update metadata for auto-updater)
   ```

File paths in production:
```javascript
app.isPackaged = true
__dirname = "C:\Users\{User}\AppData\Local\Programs\InZone\resources\app.asar\src\main"
process.resourcesPath = "C:\Users\{User}\AppData\Local\Programs\InZone\resources"
```

### Handling Paths Correctly

**The Challenge**: Paths are different in dev vs production!

**The Solution**: Check if app is packaged

```javascript
// main.js
const path = require('path');
const { app } = require('electron');

function getResourcePath(relativePath) {
    if (app.isPackaged) {
        // Production: files are in resources folder
        return path.join(process.resourcesPath, 'app.asar.unpacked', relativePath);
    } else {
        // Development: files are in project folder
        return path.join(__dirname, '..', '..', relativePath);
    }
}

// Usage:
const iconPath = getResourcePath('assets/icons/icon.png');
const psScriptPath = getResourcePath('src/main/screen-time-data.ps1');
```

### Auto-Updater Configuration

**How updates work**:

1. **Publish to GitHub Releases**:
   - Upload `InZone Setup 1.0.1.exe` to GitHub releases
   - Electron-builder auto-generates `latest.yml` with version info
   - Upload both files

2. **App checks for updates**:
   ```javascript
   // auto-updater.js
   const { autoUpdater } = require('electron-updater');

   autoUpdater.setFeedURL({
       provider: 'github',
       owner: 'gokulan04',
       repo: 'screen-time-widget'
   });

   // Check on startup
   autoUpdater.checkForUpdates();

   // Check every 4 hours
   setInterval(() => {
       autoUpdater.checkForUpdates();
   }, 4 * 60 * 60 * 1000);
   ```

3. **Update flow**:
   ```
   App starts → Check GitHub releases API
       ↓
   Latest version: 1.0.2
   Current version: 1.0.1
       ↓
   Update available! Download InZone Setup 1.0.2.exe
       ↓
   Show badge in UI (downloading... 45%)
       ↓
   Download complete! Prompt user "Install now?"
       ↓
   User clicks "Install" → App quits → Installer runs → New version opens
   ```

---

## Common Questions Answered

### Q1: Why do I need three separate files (main.js, preload.js, renderer.js)?

**A**: Security and architecture!

- **main.js**: Has full system access (dangerous if compromised)
- **renderer.js**: Runs untrusted code (what if you load external content?)
- **preload.js**: Acts as a security guard, only allowing specific safe actions

Without this separation, a malicious script in your HTML could:
- Delete files
- Steal data
- Execute system commands

**Example attack scenario** (without security):
```javascript
// Malicious ad script loaded in your HTML
<script src="https://evil.com/malware.js"></script>

// malware.js (if it had Node.js access)
const fs = require('fs');
fs.unlinkSync('C:\\Windows\\System32\\*');  // Disaster!
```

With Electron's security model:
```javascript
// malware.js tries:
const fs = require('fs');  // ❌ ERROR: require is not defined
// Only window.electronAPI methods work, and those are controlled by YOU
```

### Q2: How does the app actually track screen time on Windows?

**A**: Via PowerShell scripts that read Windows event logs!

Windows logs every mouse/keyboard input. Your PowerShell script reads these logs:

```powershell
# screen-time-data.ps1 (simplified)
$StartTime = "8:00 AM"
$EndTime = "10:00 PM"

# Get all input events from Windows Security log
$Events = Get-WinEvent -FilterHashtable @{
    LogName = 'Microsoft-Windows-Security-Auditing'
    StartTime = [datetime]$StartTime
    EndTime = [datetime]$EndTime
}

# Calculate time differences between events
# If gap > 5 minutes → it's a break
# Sum all active periods → screen time
```

**Flow**:
```
User moves mouse at 9:00 AM → Windows logs event
User types at 9:02 AM → Windows logs event
(30 minutes of no input)
User clicks at 9:32 AM → Windows logs event
    ↓
PowerShell reads logs
    ↓
Calculates: Active time = 2 minutes, Break time = 30 minutes
    ↓
Returns JSON: { screenTime: 2, breakTime: 30 }
```

**Why admin rights required?**
Security event logs require administrator privileges to read.

### Q3: Can users see my source code in the packaged app?

**Yes and no.**

**ASAR is not encryption!** Anyone can extract it:
```bash
npm install -g asar
asar extract app.asar extracted/
```

**Protection options**:
1. **Obfuscation**: Use tools like `javascript-obfuscator` to make code hard to read
2. **Minification**: Compress code (harder to read, smaller size)
3. **Move sensitive logic to backend**: Keep secrets on a server, not in the app
4. **License checks**: Verify purchase on your server

**Important**: Never put API keys, passwords, or secrets in your Electron app. Users can always extract them!

### Q4: How does the app remember settings between sessions?

**A**: Electron's `app.getPath('userData')` provides a persistent folder!

```javascript
// settings-manager.js
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

// Electron automatically creates a folder for your app:
// Windows: C:\Users\{User}\AppData\Roaming\InZone
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

// Save settings
function saveSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

// Load settings
function loadSettings() {
    if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }
    return defaultSettings;
}
```

**Result**:
```
C:\Users\GokulanGM\AppData\Roaming\InZone\
├── settings.json          (user preferences)
├── screen-time-widget.log (app logs)
└── Cache/                 (Chromium cache)
```

This folder persists even after app updates!

### Q5: How do all windows (main, breakdown, settings) communicate?

**A**: Through the main process as a central hub!

**Scenario**: User changes theme in settings, main widget should update.

```javascript
// Settings window renderer
await window.electronAPI.saveSettings({ theme: 'orange' });

// Main process receives and broadcasts
ipcMain.handle('save-settings', async (event, settings) => {
    saveToFile(settings);

    // Send to ALL windows
    BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('theme-changed', settings.theme);
    });
});

// Main widget renderer receives broadcast
window.electronAPI.onThemeChanged((theme) => {
    applyTheme(theme);
});
```

**Think of it like**:
```
Settings Window ──────► Main Process (hub) ──────► Main Widget
                             │
                             └──────────────────► Breakdown Window
```

All communication goes **through** the main process!

### Q6: What happens when I click the close button?

**A**: The window hides, but the app keeps running in the tray!

```javascript
// main.js
mainWindow.on('close', (event) => {
    // Prevent default close behavior
    event.preventDefault();

    // Hide window instead
    mainWindow.hide();

    // Window is hidden, but process is still running
    // Tray icon is still visible
});

// To fully quit:
app.on('before-quit', () => {
    // Set flag to allow closing
    willQuitApp = true;
});

// User right-clicks tray → Quit
tray.on('click', () => {
    app.quit();  // Now it actually quits
});
```

### Q7: How big is the final .exe?

**Breakdown**:
- Electron runtime (Chromium + Node.js): ~150 MB
- Your code (HTML/JS/CSS/JSON): ~1 MB
- Assets (icons, images): ~2 MB
- **Total installer**: ~170 MB

**Why so big?**
You're shipping an entire browser! Chromium alone is huge.

**Can you reduce it?**
- ✅ Use `electron-builder` compression
- ✅ Remove unused dependencies
- ❌ Can't remove Chromium (it's the runtime)

**Alternatives for smaller apps**:
- Tauri (uses OS webview, ~5 MB)
- NW.js (similar to Electron)
- PWA (no desktop install, just web)

### Q8: Can I make this app work on Mac/Linux?

**Yes! 95% of your code already works.**

Changes needed:
1. **PowerShell scripts won't work** on Mac/Linux
   - Replace with: macOS Screen Time API or Linux `xprintidle`

2. **Build configuration**:
   ```json
   {
     "build": {
       "win": { "target": ["nsis"] },
       "mac": { "target": ["dmg"] },
       "linux": { "target": ["AppImage", "deb"] }
     }
   }
   ```

3. **Different installers**:
   - Windows: `.exe` installer (NSIS)
   - Mac: `.dmg` disk image
   - Linux: `.AppImage` or `.deb` package

Your HTML/CSS/JS stays exactly the same!

---

## Summary: The Complete Picture

### What Electron Is:
A desktop app framework that combines:
- **Chromium** (displays your HTML/CSS/JS)
- **Node.js** (accesses system features)
- **V8** (executes JavaScript)

### Your App Structure:
```
Main Process (Node.js backend)
    ├── Creates windows
    ├── Handles IPC requests
    ├── Accesses file system
    └── Runs PowerShell scripts

Preload Script (Security bridge)
    ├── Exposes safe API
    └── Prevents dangerous access

Renderer Process (Chromium frontend)
    ├── Your HTML/CSS/JS
    ├── Displays UI
    └── Handles user interaction
```

### Build Process:
```
Your Code
    ↓
electron-builder packages
    ↓
Creates app.asar (compressed)
    ↓
Bundles with Electron runtime
    ↓
Generates NSIS installer
    ↓
InZone Setup 1.0.1.exe (170 MB)
```

### Installation:
```
User runs installer
    ↓
Extracts to: C:\Users\{User}\AppData\Local\Programs\InZone\
    ↓
Creates shortcuts
    ↓
Registers in Windows
    ↓
User can launch app!
```

### Running:
```
User clicks InZone.exe
    ↓
Loads Electron runtime
    ↓
Executes src/main/main.js
    ↓
Creates windows with HTML
    ↓
App runs until user quits from tray
```

---

## Next Steps for Learning

1. **Experiment**: Change colors, sizes, text in your app
2. **Add features**: Try adding a new button or window
3. **Explore IPC**: Add a new IPC handler to fetch different data
4. **Debug**: Use Ctrl+Shift+I to open DevTools and inspect
5. **Read docs**: [electronjs.org/docs](https://www.electronjs.org/docs)

You now understand the complete anatomy of an Electron app! 🚀
