# Auto-Update Implementation Plan for InZone

## Overview
Implement auto-update functionality for the InZone Electron app to deliver patches and updates to installed users via GitHub releases.

## Current State
- App uses electron-builder v26.0.12 with NSIS installer
- GitHub repo: gokulan04/screen-time-widget
- app-update.yml already exists with GitHub configuration
- **Missing**: electron-updater package, update checking code, publish config

## Implementation Steps

### 1. Install Dependencies
```bash
npm install electron-updater --save
```

### 2. Create Auto-Updater Module
**New file**: `src/main/auto-updater.js`

This module will:
- Configure electron-updater (auto-download: true, auto-install: false)
- Set up event handlers for update lifecycle:
  - `checking-for-update`: Log check initiation
  - `update-available`: Notify renderer, start download
  - `download-progress`: Send progress to renderer
  - `update-downloaded`: Show install dialog
  - `error`: Log and notify renderer
- Check for updates on startup (10s delay) and every 4 hours
- Provide `initializeAutoUpdater()`, `checkForUpdates()`, `quitAndInstall()`, `getUpdateStatus()`, `cleanup()`
- Show native dialog when update ready: "Install Now" or "Install Later"

### 3. Update Main Process
**File**: `src/main/main.js`

Changes:
- Import auto-updater module: `const autoUpdater = require('./auto-updater');`
- Add IPC handlers in `setupIPC()`:
  - `check-for-updates`: Manual update check
  - `install-update`: Quit and install
  - `get-update-status`: Get current update state
- Initialize in `app.whenReady()`:
  ```javascript
  if (app.isPackaged) {
      autoUpdater.initializeAutoUpdater();
  }
  ```
- Add "Check for Updates" option to tray menu
- Call `autoUpdater.cleanup()` in `before-quit` handler

### 4. Update Preload Bridge
**File**: `src/preload/preload.js`

Add to `electronAPI`:
```javascript
checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
installUpdate: () => ipcRenderer.invoke('install-update'),
getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
onUpdateDownloading: (callback) => ipcRenderer.on('update-downloading', (event, info) => callback(info)),
onUpdateDownloadProgress: (callback) => ipcRenderer.on('update-download-progress', (event, progress) => callback(progress)),
onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error))
```

### 5. Configure Publishing
**File**: `package.json`

Add to `build` section:
```json
"publish": {
  "provider": "github",
  "owner": "gokulan04",
  "repo": "screen-time-widget",
  "releaseType": "release"
}
```

### 6. Optional: Update UI Notification
**File**: `src/renderer/index.html`

Add update badge near settings button:
```html
<div id="update-badge" class="update-badge" style="display: none;" title="Update available">
  <!-- Icon/percentage display -->
</div>
```

**File**: `src/renderer/renderer.js`

Add in `init()`:
- Listen to `onUpdateDownloading`: Show badge
- Listen to `onUpdateDownloadProgress`: Update badge with percentage
- Listen to `onUpdateError`: Hide badge
- Add click handler to badge: Install if ready, else check for updates

**CSS**: Add pulse animation for update badge

## Update Flow

1. App starts → Wait 10s → Check GitHub for updates
2. If update available → Auto-download in background
3. Download complete → Show dialog: "Install Now" / "Install Later"
4. User clicks "Install Now" → Quit & Install → Restart with new version
5. User clicks "Install Later" → Update installs on next app quit
6. Periodic checks every 4 hours
7. Manual check via tray menu "Check for Updates"

## Release Workflow

When releasing new version:

1. Update `package.json` version (e.g., 1.0.0 → 1.0.1)
2. Build: `npm run build`
3. Create GitHub Release at: https://github.com/gokulan04/screen-time-widget/releases/new
   - Tag: `v1.0.1`
   - Upload from `dist/`:
     - `InZone Setup 1.0.1.exe`
     - `latest.yml`
4. Publish release
5. Users get notified within 4 hours (or via manual check)

## Testing Plan

1. Build v1.0.0: `npm run build`
2. Install from `dist/InZone Setup 1.0.0.exe`
3. Create test GitHub release v1.0.1 with built artifacts
4. Run installed app, wait 10s for auto-check
5. Verify download notification and progress
6. Test "Install Now" → App restarts with v1.0.1
7. Test "Install Later" → App continues running
8. Test manual check from tray menu
9. Test error scenarios (no internet, no release)

## Critical Files to Modify

1. **src/main/auto-updater.js** - NEW FILE (core update logic)
2. **src/main/main.js** - MODIFY (integration & IPC)
3. **package.json** - MODIFY (dependency + publish config)
4. **src/preload/preload.js** - MODIFY (expose update APIs)
5. **src/renderer/renderer.js** - MODIFY (optional UI notifications)
6. **src/renderer/index.html** - MODIFY (optional update badge)

## Optional Enhancements

### Code Signing (Recommended for Production)
- Obtain certificate (~$100-300/year)
- Configure in `package.json` win section:
  ```json
  "certificateFile": "certificate.pfx",
  "certificatePassword": "${env.CERTIFICATE_PASSWORD}"
  ```
- Eliminates Windows SmartScreen warnings

### CI/CD Automation
Create `.github/workflows/release.yml` for automated builds on git tags:
```bash
git tag v1.0.1
git push origin v1.0.1
# GitHub Actions auto-builds and creates release
```

## Security & Safety

- Updates only from official GitHub repository
- HTTPS only (enforced by electron-updater)
- Signature verification via `latest.yml` hash
- User confirmation required before installation
- All errors logged to `screen-time-widget.log`
- Only works in packaged mode (not dev mode)

## Known Limitations

- Windows only (current NSIS config)
- GitHub releases only
- Full installer download (no delta updates)
- Admin privileges required (already required by app)
- No offline update support

## Success Criteria

- [ ] electron-updater installed
- [ ] Auto-check works on startup (10s delay)
- [ ] Periodic checks every 4 hours
- [ ] Manual "Check for Updates" in tray menu
- [ ] Background download with progress
- [ ] Install dialog appears when ready
- [ ] "Install Now" restarts and updates app
- [ ] "Install Later" allows continued use
- [ ] Errors logged properly
- [ ] Test release v1.0.1 successfully updates v1.0.0

## Estimated Implementation Time
3-4 hours total (including testing and first release)
