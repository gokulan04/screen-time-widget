// Apply theme from settings
window.addEventListener('DOMContentLoaded', async () => {
    const helpWindow = document.querySelector('.help-window');

    try {
        const settings = await window.electronAPI.getSettings();
        const savedTheme = (settings && settings.theme) || 'cyan';
        if (helpWindow) {
            helpWindow.setAttribute('data-theme', savedTheme);
        }
    } catch (error) {
        console.error('Error loading theme:', error);
        // Fallback to default
        if (helpWindow) {
            helpWindow.setAttribute('data-theme', 'cyan');
        }
    }

    // Listen for theme changes from settings window
    window.electronAPI.onThemeChanged((theme) => {
        if (helpWindow) {
            helpWindow.setAttribute('data-theme', theme);
        }
    });
});
