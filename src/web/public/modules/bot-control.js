/* ============================================
   BOT CONTROL MODULE - Bot Start/Stop/Restart
   ============================================ */

async function updateBotStatus(accountIndex) {
  try {
    const res = await fetch(`/api/account/${accountIndex}/status`, {
      headers: { 'x-password': password }
    });
    const data = await res.json();
    
    if (!data) return;
    
    const indicator = document.getElementById(`status-indicator-${accountIndex}`);
    const statusText = document.getElementById(`status-text-${accountIndex}`);
    const startBtn = document.getElementById(`start-btn-${accountIndex}`);
    const stopBtn = document.getElementById(`stop-btn-${accountIndex}`);
    const restartBtn = document.getElementById(`restart-btn-${accountIndex}`);
    
    if (!indicator || !statusText) return;
    
    const wasOffline = indicator.classList.contains('offline');
    const isOnlineNow = data.status === 'online';
    
    indicator.className = `bot-status-indicator ${data.status}`;
    statusText.textContent = `● ${data.status.toUpperCase()}`;
    
    if (startBtn && stopBtn && restartBtn) {
      if (data.status === 'online') {
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';
        restartBtn.style.display = 'inline-flex';
      } else {
        startBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
        restartBtn.style.display = 'none';
      }
    }
    
    if (wasOffline && isOnlineNow) {
      startBotIntervals(accountIndex);
    } else if (!isOnlineNow) {
      stopBotIntervals(accountIndex);
    }
  } catch (error) {
    console.error(`Error updating bot ${accountIndex} status:`, error);
  }
}

function toggleBotCard(index) {
  const card = document.getElementById(`bot-${index}`);
  if (!card) return;

  const isExpanded = card.classList.contains('expanded');
  
  if (isExpanded) {
    card.classList.remove('expanded');
    expandedBots.delete(index);
    stopBotIntervals(index);
  } else {
    card.classList.add('expanded');
    expandedBots.add(index);
    loadBotData(index);
    startBotIntervals(index);
  }
}

function switchBotSection(accountIndex, section) {
  activeBotSections.set(accountIndex, section);
  
  const botContent = document.querySelector(`#bot-${accountIndex} .bot-content`);
  if (!botContent) return;
  
  botContent.querySelectorAll('.bot-section').forEach(sec => {
    sec.classList.remove('active');
  });
  
  const targetSection = document.getElementById(`${section}-${accountIndex}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  document.querySelectorAll(`#bot-${accountIndex} .sidebar-item`).forEach(item => {
    item.classList.remove('active');
  });
  
  const activeButton = document.querySelector(`#bot-${accountIndex} .sidebar-item[onclick*="${section}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }
  
  if (section === 'earnings-stats') {
    loadBotStats(accountIndex);
  }
}

function startBotIntervals(accountIndex) {
  if (updateIntervals.has(accountIndex)) return;
  
  const intervals = {
    chart: setInterval(() => loadBotStats(accountIndex, true), 5000),
    logs: setInterval(() => loadActivityLogs(accountIndex), 3000)
  };
  
  updateIntervals.set(accountIndex, intervals);
}

function stopBotIntervals(accountIndex) {
  const intervals = updateIntervals.get(accountIndex);
  if (intervals) {
    if (intervals.chart) clearInterval(intervals.chart);
    if (intervals.logs) clearInterval(intervals.logs);
    updateIntervals.delete(accountIndex);
  }
}

async function loadBotData(accountIndex, isUpdate = false) {
  await updateBotStatus(accountIndex);
  const activeSection = activeBotSections.get(accountIndex);
  
  if (activeSection === 'earnings-stats') {
    await loadBotStats(accountIndex, isUpdate);
  }
}

async function loadBotStats(accountIndex, isUpdate = false) {
  try {
    await Promise.all([
      loadProfitChart(accountIndex, isUpdate),
      loadCumulativeChart(accountIndex, isUpdate),
      loadActivityLogs(accountIndex)
    ]);
    
    const profitRes = await fetch(`/api/account/${accountIndex}/profit`, {
      headers: { 'x-password': password }
    });
    const profitData = await profitRes.json();
    
    if (profitData && Array.isArray(profitData)) {
      const totalProfit = profitData.reduce((sum, flip) => sum + flip.profit, 0);
      const avgProfit = profitData.length > 0 ? totalProfit / profitData.length : 0;
      const bestFlip = profitData.length > 0 ? Math.max(...profitData.map(f => f.profit)) : 0;
      
      const totalFlips = profitData.length;
      const firstFlip = profitData.length > 0 ? profitData[0].timestamp : Date.now();
      const hoursActive = (Date.now() - firstFlip) / (1000 * 60 * 60);
      const coinsPerHour = hoursActive > 0 ? totalProfit / hoursActive : 0;
      
      document.getElementById(`global-total-profit-${accountIndex}`).textContent = formatNumber(totalProfit) + ' coins';
      document.getElementById(`global-avg-profit-${accountIndex}`).textContent = formatNumber(avgProfit) + ' coins';
      document.getElementById(`global-total-flips-${accountIndex}`).textContent = formatNumber(totalFlips);
      document.getElementById(`global-coins-hour-${accountIndex}`).textContent = formatNumber(coinsPerHour) + ' coins/h';
      document.getElementById(`global-best-flip-${accountIndex}`).textContent = formatNumber(bestFlip) + ' coins';
    }
  } catch (error) {
    console.error(`Error loading stats for bot ${accountIndex}:`, error);
  }
}

async function loadProfitChart(accountIndex, isUpdate = false) {
  try {
    const res = await fetch(`/api/account/${accountIndex}/profit`, {
      headers: { 'x-password': password }
    });
    const data = await res.json();
    
    if (data) {
      renderProfitChartData(accountIndex, data, isUpdate);
    }
  } catch (error) {
    console.error(`Error loading profit chart for bot ${accountIndex}:`, error);
  }
}

async function loadCumulativeChart(accountIndex, isUpdate = false) {
  try {
    const res = await fetch(`/api/account/${accountIndex}/profit`, {
      headers: { 'x-password': password }
    });
    const profitData = await res.json();
    
    if (profitData) {
      renderCumulativeChart(accountIndex, profitData, isUpdate);
    }
  } catch (error) {
    console.error(`Error loading cumulative chart for bot ${accountIndex}:`, error);
  }
}

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

async function startBot(accountIndex) {
  await botControl(accountIndex, 'start', '▶ Starting bot...');
}

async function stopBot(accountIndex) {
  await botControl(accountIndex, 'stop', '■ Stopping bot...');
}

async function restartBot(accountIndex) {
  await botControl(accountIndex, 'restart', '↻ Restarting bot...');
}

async function botControl(accountIndex, action, message) {
  try {
    showToast(message, 'info');
    
    const res = await fetch(`/api/account/${accountIndex}/${action}`, {
      method: 'POST',
      headers: { 'x-password': password }
    });
    const data = await res.json();
    
    if (data.success) {
      showToast(`✅ ${action.charAt(0).toUpperCase() + action.slice(1)} successful`, 'success');
      setTimeout(() => updateBotStatus(accountIndex), 1000);
    } else {
      showToast(`❌ ${data.error || `Failed to ${action}`}`, 'error');
    }
  } catch (error) {
    console.error(`Error ${action}ing bot:`, error);
    showToast(`❌ Failed to ${action} bot: ${error.message}`, 'error');
  }
}

function toggleConfigSection(headerElement) {
  const section = headerElement.parentElement;
  section.classList.toggle('collapsed');
}

function toggleChartExpand(accountIndex, chartType) {
  const chartCard = document.getElementById(`${chartType}-chart-card-${accountIndex}`);
  if (!chartCard) return;
  
  const isExpanded = chartCard.classList.contains('expanded');
  
  document.querySelectorAll(`#charts-grid-${accountIndex} .mini-chart-card`).forEach(card => {
    card.classList.remove('expanded');
  });
  
  if (!isExpanded) {
    chartCard.classList.add('expanded');
    
    if (chartType === 'profit') {
      loadProfitChart(accountIndex, true);
    } else if (chartType === 'cumulative') {
      loadCumulativeChart(accountIndex, true);
    }
  }
}
