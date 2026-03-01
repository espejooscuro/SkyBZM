/* ============================================
   CHARTS MODULE
   ============================================ */

import { globalConfig, password, botCharts, purseCharts, cumulativeCharts, expandedChart, expandedBots } from './config.js';
import { formatNumber, formatTimeAgo, escapeHtml } from './utils.js';

const API_URL = window.location.origin;

// ==================== CHART DATA LOADING ====================
export async function loadBotData(accountIndex, isUpdate = false) {
  await Promise.all([
    loadProfitChart(accountIndex, isUpdate),
    loadCumulativeChart(accountIndex, isUpdate),
    loadBotStats(accountIndex, isUpdate)
  ]);
}

async function loadBotStats(accountIndex, isUpdate = false) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;

  try {
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/stats`, {
      method: 'GET',
      headers: { 'x-password': password }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    renderPurseChart(accountIndex, data, isUpdate);
  } catch (error) {
    if (!isUpdate) {
      console.error(`❌ Error loading stats:`, error);
    }
  }
}

async function loadProfitChart(accountIndex, isUpdate = false) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;

  try {
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/profit?limit=50`, {
      method: 'GET',
      headers: { 'x-password': password }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    renderProfitChartData(accountIndex, data, isUpdate);
  } catch (error) {
    if (!isUpdate) console.error(`❌ Error loading profit data:`, error);
  }
}

async function loadCumulativeChart(accountIndex, isUpdate = false) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;

  try {
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/profit?limit=50`, {
      method: 'GET',
      headers: { 'x-password': password }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    renderCumulativeChart(accountIndex, data, isUpdate);
  } catch (error) {
    if (!isUpdate) {
      console.error(`❌ Error loading cumulative data:`, error);
      const containerEl = document.getElementById(`cumulative-chart-container-${accountIndex}`);
      if (containerEl) containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">⚠️</p><p>Failed to load data</p></div>';
    }
  }
}

// ==================== CHART RENDERING ====================
function renderProfitChartData(accountIndex, profitData, isUpdate = false) {
  const containerEl = document.getElementById(`chart-container-${accountIndex}`);
  if (!containerEl) return;

  if (!profitData.profits || profitData.profits.length === 0) {
    if (!isUpdate) {
      containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💰</p><p>No profit data available yet.</p></div>';
      document.getElementById(`global-total-profit-${accountIndex}`).textContent = '0';
      document.getElementById(`global-avg-profit-${accountIndex}`).textContent = '0';
      document.getElementById(`global-total-flips-${accountIndex}`).textContent = '0';
      document.getElementById(`global-coins-hour-${accountIndex}`).textContent = '0';
      document.getElementById(`global-best-flip-${accountIndex}`).textContent = '0';
    }
    return;
  }

  const profits = profitData.profits;
  const labels = profits.map((p, i) => `Flip ${profits.length - i}`);
  const values = profits.map(p => p.profit);

  const totalProfit = values.reduce((sum, p) => sum + p, 0);
  const avgProfit = totalProfit / values.length;
  const bestFlip = Math.max(...values);
  const totalFlips = values.length;
  
  let coinsPerHour = 0;
  if (profits.length >= 2) {
    const firstTimestamp = profits[profits.length - 1].timestamp;
    const lastTimestamp = profits[0].timestamp;
    const timeSpanHours = (lastTimestamp - firstTimestamp) / (1000 * 60 * 60);
    if (timeSpanHours > 0) coinsPerHour = totalProfit / timeSpanHours;
  }

  document.getElementById(`global-total-profit-${accountIndex}`).textContent = formatNumber(totalProfit);
  document.getElementById(`global-avg-profit-${accountIndex}`).textContent = formatNumber(avgProfit);
  document.getElementById(`global-total-flips-${accountIndex}`).textContent = totalFlips;
  document.getElementById(`global-coins-hour-${accountIndex}`).textContent = formatNumber(coinsPerHour);
  document.getElementById(`global-best-flip-${accountIndex}`).textContent = formatNumber(bestFlip);

  if (!document.getElementById(`chart-canvas-${accountIndex}`)) {
    containerEl.innerHTML = '<canvas id="chart-canvas-' + accountIndex + '"></canvas>';
  }
  
  const canvas = document.getElementById(`chart-canvas-${accountIndex}`);
  if (!canvas) return;

  if (botCharts.has(accountIndex)) botCharts.get(accountIndex).destroy();

  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.reverse(),
      datasets: [{
        label: 'Profit',
        data: values.reverse(),
        borderColor: '#00FF88',
        backgroundColor: 'rgba(0, 255, 136, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#00FF88'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#00FF88',
          bodyColor: '#FFF',
          callbacks: { 
            label: (ctx) => `Profit: ${ctx.parsed.y >= 0 ? '+' : ''}${formatNumber(ctx.parsed.y)} coins`
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#AAA' } },
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
          ticks: { 
            color: '#AAA', 
            callback: (value) => (value >= 0 ? '+' : '') + formatNumber(value)
          } 
        }
      }
    }
  });
  
  botCharts.set(accountIndex, chart);
}

function renderPurseChart(accountIndex, statsData, isUpdate = false) {
  const containerEl = document.getElementById(`purse-chart-container-${accountIndex}`);
  if (!containerEl) return;

  if (!statsData.purseHistory || statsData.purseHistory.length === 0) {
    if (!isUpdate) containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💰</p><p>No purse data available yet.</p></div>';
    return;
  }

  const history = statsData.purseHistory;
  const labels = history.map(point => new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
  const values = history.map(point => point.purse);

  if (!document.getElementById(`purse-canvas-${accountIndex}`)) {
    containerEl.innerHTML = '<canvas id="purse-canvas-' + accountIndex + '"></canvas>';
  }
  
  const canvas = document.getElementById(`purse-canvas-${accountIndex}`);
  if (!canvas) return;

  if (purseCharts.has(accountIndex)) purseCharts.get(accountIndex).destroy();

  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Purse',
        data: values,
        borderColor: '#FFD700',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#FFD700',
          bodyColor: '#FFF',
          callbacks: { label: (ctx) => 'Purse: ' + formatNumber(ctx.parsed.y) + ' coins' }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#AAA' } },
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
          ticks: { color: '#AAA', callback: (value) => formatNumber(value) } 
        }
      }
    }
  });
  
  purseCharts.set(accountIndex, chart);
}

function renderCumulativeChart(accountIndex, profitData, isUpdate = false) {
  const containerEl = document.getElementById(`cumulative-chart-container-${accountIndex}`);
  if (!containerEl) return;

  if (!profitData.profits || profitData.profits.length === 0) {
    if (!isUpdate) containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💰</p><p>No data yet</p></div>';
    return;
  }

  const profits = [...profitData.profits].reverse();
  const labels = profits.map((p, i) => `Flip ${i + 1}`);
  
  let cumulative = 0;
  const values = profits.map(p => {
    cumulative += p.profit;
    return cumulative;
  });

  if (!document.getElementById(`cumulative-canvas-${accountIndex}`)) {
    containerEl.innerHTML = '<canvas id="cumulative-canvas-' + accountIndex + '"></canvas>';
  }
  
  const canvas = document.getElementById(`cumulative-canvas-${accountIndex}`);
  if (!canvas) return;

  if (cumulativeCharts.has(accountIndex)) cumulativeCharts.get(accountIndex).destroy();

  const ctx = canvas.getContext('2d');
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Gains',
        data: values,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointBackgroundColor: '#06b6d4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#06b6d4',
          bodyColor: '#FFF',
          callbacks: { label: (ctx) => `Total: ${formatNumber(ctx.parsed.y)} coins` }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#AAA' } },
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
          ticks: { color: '#AAA', callback: (value) => formatNumber(value) } 
        }
      }
    }
  });
  
  cumulativeCharts.set(accountIndex, chart);
}

// ==================== ACTIVITY LOGS ====================
export async function loadActivityLogs(accountIndex) {
  const logsContainer = document.getElementById(`logs-container-${accountIndex}`);
  if (!logsContainer) return;

  const scrollTop = logsContainer.scrollTop;
  const scrollHeight = logsContainer.scrollHeight;
  const clientHeight = logsContainer.clientHeight;
  const wasAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

  try {
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/logs?limit=10`, {
      method: 'GET',
      headers: { 'x-password': password }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    
    if (!data.success || !data.logs || data.logs.length === 0) {
      logsContainer.innerHTML = '<div class="log-placeholder">No recent activity</div>';
      return;
    }

    const uniqueLogs = [];
    const seenLogs = new Map();
    for (const log of data.logs) {
      const key = `${log.message}_${Math.floor(log.timestamp / 1000)}`;
      if (!seenLogs.has(key)) {
        seenLogs.set(key, true);
        uniqueLogs.push(log);
      }
    }

    logsContainer.innerHTML = uniqueLogs.map(log => {
      const timeAgo = formatTimeAgo(log.timestamp);
      const formattedMessage = formatLogMessage(log.message);
      
      let logType = '';
      const msg = log.message.toLowerCase();
      if (msg.includes('[bazaar] claimed') && msg.includes('selling')) logType = 'sold';
      else if (msg.includes('claimed') && msg.includes('worth')) logType = 'claimed';
      else if (msg.includes('buy order setup')) logType = 'buy-order';
      
      return `
        <div class="log-item ${logType}">
          <div class="log-icon">▸</div>
          <div class="log-content">
            <div class="log-message">${formattedMessage}</div>
            <div class="log-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');
    
    if (wasAtBottom) {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    } else {
      logsContainer.scrollTop = scrollTop;
    }
  } catch (error) {
    console.error(`❌ Error loading logs for bot ${accountIndex}:`, error);
  }
}

function formatLogMessage(message) {
  if (!message) return '';
  const escaped = escapeHtml(message);
  
  const patterns = [
    { regex: /Claimed (\d+)x? ([^w]+) worth ([\d,\.]+) coins bought for ([\d,\.]+) each/i,
      format: (m) => `<span class="action">Claimed</span> <span class="amount">${m[1]}x</span> <span class="item-name">${m[2].trim()}</span> worth <span class="coins">${m[3]} coins</span>` },
    { regex: /\[Bazaar\] Claimed ([\d,\.]+) coins from selling (\d+)x?\s+([^a]+?)\s+at\s+([\d,\.]+)\s+each/i,
      format: (m) => `<span class="action">[Bazaar] Claimed</span> <span class="coins">${m[1]} coins</span> from selling <span class="amount">${m[2]}x</span> <span class="item-name">${m[3].trim()}</span>` },
    { regex: /([\d,\.]+)\s+(coins?)/gi, format: (m) => `<span class="coins">${m[1]} ${m[2]}</span>` }
  ];
  
  let formatted = escaped;
  for (const pattern of patterns) {
    formatted = formatted.replace(pattern.regex, (...match) => {
      try { return pattern.format(match); } catch (e) { return match[0]; }
    });
  }
  return formatted;
}

// ==================== CHART EXPANSION ====================
export function toggleChartExpand(accountIndex, chartType) {
  const currentExpanded = expandedChart.get(accountIndex);
  const chartsGrid = document.getElementById(`charts-grid-${accountIndex}`);
  
  if (currentExpanded === chartType) {
    expandedChart.delete(accountIndex);
    document.getElementById(`${chartType}-chart-card-${accountIndex}`).classList.remove('expanded');
    document.querySelectorAll(`#charts-grid-${accountIndex} .mini-chart-card`).forEach(card => {
      card.classList.remove('hidden');
    });
    chartsGrid.classList.remove('expanded');
    return;
  }
  
  if (currentExpanded) {
    document.getElementById(`${currentExpanded}-chart-card-${accountIndex}`).classList.remove('expanded');
  }
  
  expandedChart.set(accountIndex, chartType);
  const cards = document.querySelectorAll(`#charts-grid-${accountIndex} .mini-chart-card`);
  cards.forEach(card => {
    if (card.id === `${chartType}-chart-card-${accountIndex}`) {
      card.classList.add('expanded');
      card.classList.remove('hidden');
    } else {
      card.classList.add('hidden');
    }
  });
  chartsGrid.classList.add('expanded');
}

// Make functions globally available
window.toggleChartExpand = toggleChartExpand;
