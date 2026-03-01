/* ============================================
   LOGS MODULE - Activity Logs Management
   ============================================ */

async function loadActivityLogs(accountIndex) {
  try {
    const res = await fetch(`/api/account/${accountIndex}/logs`, {
      headers: { 'x-password': password }
    });
    const logs = await res.json();
    
    const logsContainer = document.getElementById(`logs-container-${accountIndex}`);
    if (!logsContainer) return;
    
    if (!logs || logs.length === 0) {
      logsContainer.innerHTML = '<div class="log-placeholder">No recent activity</div>';
      return;
    }
    
    logsContainer.innerHTML = logs.slice(0, 10).map(log => `
      <div class="log-item">
        <span class="log-time">${formatTimeAgo(log.timestamp)}</span>
        <span class="log-message">${formatLogMessage(log.message)}</span>
      </div>
    `).join('');
  } catch (error) {
    console.error(`Error loading logs for bot ${accountIndex}:`, error);
  }
}
