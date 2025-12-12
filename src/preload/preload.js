const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    getScreenTime: () => ipcRenderer.invoke('get-screen-time-data'),
    getScreenTimeBreakdown: (dateString) => ipcRenderer.invoke('get-screen-time-breakdown', dateString),
    checkAdminStatus: () => ipcRenderer.invoke('check-admin-status'),
    minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
    closeWindow: () => ipcRenderer.send('close-window'),
    openBreakdownWindow: () => ipcRenderer.send('open-breakdown-window'),
    openHelpWindow: () => ipcRenderer.send('open-help-window'),
    openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    onThemeChanged: (callback) => ipcRenderer.on('theme-changed', (event, theme) => callback(theme))
});
