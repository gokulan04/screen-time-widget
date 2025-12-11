// DOM Elements
const breakdownTitle = document.getElementById('breakdown-title');
const totalScreenTimeEl = document.getElementById('total-screen-time');
const totalBreakTimeEl = document.getElementById('total-break-time');
const sessionsTbody = document.getElementById('sessions-tbody');
const breaksTbody = document.getElementById('breaks-tbody');
const noSessions = document.getElementById('no-sessions');
const noBreaks = document.getElementById('no-breaks');
const sessionsTable = document.getElementById('sessions-table');
const breaksTable = document.getElementById('breaks-table');
const breakdownWindow = document.querySelector('.breakdown-window');

/**
 * Load and display breakdown data
 */
async function loadBreakdownData() {
    try {
        // @ts-ignore - electronAPI is added via preload
        const data = await window.electronAPI.getScreenTimeBreakdown();

        // Apply theme from localStorage
        const savedTheme = localStorage.getItem('theme') || 'cyan';
        if (breakdownWindow) {
            breakdownWindow.setAttribute('data-theme', savedTheme);
        }

        // Update title with date
        if (breakdownTitle) {
            breakdownTitle.textContent = `Screen Time Breakdown (${data.date || 'Today'})`;
        }

        // Update summary
        if (totalScreenTimeEl) {
            totalScreenTimeEl.textContent = data.totalScreenTime || '0 min';
        }
        if (totalBreakTimeEl) {
            totalBreakTimeEl.textContent = data.totalBreakTime || '0 min';
        }

        // Populate active sessions table
        if (sessionsTbody) {
            sessionsTbody.innerHTML = '';
            if (data.activeSessions && data.activeSessions.length > 0) {
                data.activeSessions.forEach(session => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${session.StartTime}</td>
                        <td>${session.EndTime}</td>
                        <td>${session.Duration}</td>
                    `;
                    sessionsTbody.appendChild(row);
                });
                if (sessionsTable) sessionsTable.style.display = 'table';
                if (noSessions) noSessions.style.display = 'none';
            } else {
                if (sessionsTable) sessionsTable.style.display = 'none';
                if (noSessions) noSessions.style.display = 'block';
            }
        }

        // Populate breaks table
        if (breaksTbody) {
            breaksTbody.innerHTML = '';
            if (data.breaks && data.breaks.length > 0) {
                data.breaks.forEach(breakItem => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${breakItem.StartTime}</td>
                        <td>${breakItem.EndTime}</td>
                        <td>${breakItem.Duration}</td>
                    `;
                    breaksTbody.appendChild(row);
                });
                if (breaksTable) breaksTable.style.display = 'table';
                if (noBreaks) noBreaks.style.display = 'none';
            } else {
                if (breaksTable) breaksTable.style.display = 'none';
                if (noBreaks) noBreaks.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading breakdown data:', error);
    }
}

// Load data when window loads
window.addEventListener('DOMContentLoaded', loadBreakdownData);
