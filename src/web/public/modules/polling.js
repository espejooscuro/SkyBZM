/* ============================================
   POLLING MODULE
   ============================================ */

import { globalConfig, password, expandedBots, activeBotSections, updateIntervals } from './config.js';

const API_URL = window.location.origin;
let globalPollingInterval = null;

export function startGlobalPolling() {
  if (globalPollingInterval) clearInterval(globalPollingInterval);
  
  globalPollingInterval = setInterval(async () => {
    if (!globalConfig || !globalConfig.accounts || !password) return;
    
    for (let i = 0; i < globalConfig.accounts.length; i++) {
      await updateBotStatus(i);
    }
  }, 2000);
}

export function stopGlobalPolling() {
  if (globalPollingInterval) {
    clearInterval(globalPollingInterval);
    globalPollingInterval = null;
  }
  
  for (const [accountIndex, intervals] of updateIntervals) {
    if (intervals.chart) clearInterval(intervals.chart);
    if (intervals.logs) clearInterval(intervals.logs);
  }
  updateIntervals.clear();
}

async function updateBotStatus(accountIndex) {
  try {
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/status`, {
      method: 'GET',
      headers: { 'x-password': password }
    });

    if (!response.ok) return;

    const data = await response.json();
    
    const statusIndicator = document.getElementById(`status-indicator-${accountIndex}`);
    const statusText = document.getElementById(`status-text-${accountIndex}`);
    const startBtn = document.getElementById(`start-btn-${accountIndex}`);
    const stopBtn = document.getElementById(`stop-btn-${accountIndex}`);
    const restartBtn = document.getElementById(`restart-btn-${accountIndex}`);

    if (statusIndicator && statusText && startBtn && stopBtn && restartBtn) {
      const isOnline = data.connected;
      
      statusIndicator.className = `bot-status-indicator ${isOnline ? 'online' : 'offline'}`;
      statusText.textContent = isOnline ? '● ONLINE' : '● OFFLINE';
      
      startBtn.style.display = isOnline ? 'none' : 'inline-block';
      stopBtn.style.display = isOnline ? 'inline-block' : 'none';
      restartBtn.style.display = isOnline ? 'inline-block' : 'none';
    }
  } catch (error) {
    console.error(`Error updating bot status for ${accountIndex}:`, error);
  }
}

export function startBotIntervals(accountIndex) {
  if (!updateIntervals.has(accountIndex)) {
    updateIntervals.set(accountIndex, {});
  }
  
  const intervals = updateIntervals.get(accountIndex);
  
  // Import dynamically to avoid circular dependencies
  import('./charts.js').then(({ loadBotData, loadActivityLogs }) => {
    intervals.chart = setInterval(() => {
      if (expandedBots.has(accountIndex)) loadBotData(accountIndex, true);
    }, 5000);
    
    intervals.logs = setInterval(() => {
      if (expandedBots.has(accountIndex)) loadActivityLogs(accountIndex);
    }, 10000);
  });
}

export function stopBotIntervals(accountIndex) {
  if (updateIntervals.has(accountIndex)) {
    const intervals = updateIntervals.get(accountIndex);
    if (intervals.chart) clearInterval(intervals.chart);
    if (intervals.logs) clearInterval(intervals.logs);
    updateIntervals.delete(accountIndex);
  }
}
