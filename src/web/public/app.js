/* ============================================
   BZM BOT MANAGER - Frontend Application
   ============================================ */

const API_URL = window.location.origin;

// Global State
let globalConfig = null;
let password = null;
let expandedBots = new Set();
let activeBotSections = new Map();
let skyblockItems = [];
let updateIntervals = new Map();
let botCharts = new Map();
let purseCharts = new Map();
let cumulativeCharts = new Map();
let expandedChart = new Map();

// DOM Elements
const form = document.getElementById('passwordForm');
const errorDiv = document.getElementById('error');
const loginForm = document.getElementById('loginForm');
const dashboard = document.getElementById('dashboard');
const passwordInput = document.getElementById('password');

// Event Listeners
form.addEventListener('submit', handleLogin);
passwordInput.focus();
loadSkyblockItems();

window.addEventListener('DOMContentLoaded', () => {
  // Discord theme is now the only theme - no need for theme switching
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    document.querySelectorAll('.search-results').forEach(div => div.style.display = 'none');
  }
});

// ==================== UTILITIES ====================
function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
  setTimeout(() => errorDiv.classList.remove('show'), 3000);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('en-US');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

// ==================== DATA LOADING ====================
async function loadSkyblockItems() {
  try {
    const res = await fetch('https://api.hypixel.net/resources/skyblock/items');
    const data = await res.json();
    skyblockItems = data.items || [];
    console.log(`✅ Loaded ${skyblockItems.length} Skyblock items`);
  } catch (error) {
    console.error('Error loading Skyblock items:', error);
  }
}

// ==================== AUTH ====================
async function handleLogin(e) {
  e.preventDefault();
  const pwd = passwordInput.value;
  const submitBtn = form.querySelector('.btn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading"></span>';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd })
    });
    const data = await res.json();

    if (data.success) {
      password = pwd;
      globalConfig = data.config;
      showDashboard(data.config);
    } else {
      showError(data.error || 'Unknown error');
      passwordInput.value = '';
      passwordInput.focus();
    }
  } catch (error) {
    showError('Connection error with server');
    console.error('Login error:', error);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function logout() {
  password = null;
  globalConfig = null;
  botCharts.clear();
  purseCharts.clear();
  cumulativeCharts.clear();
  stopGlobalPolling();
  loginForm.classList.remove('hidden');
  dashboard.classList.remove('show');
}

// ==================== DASHBOARD ====================
function showDashboard(config) {
  loginForm.style.display = 'none';
  dashboard.classList.add('show');
  renderDashboard(config);
}

function renderDashboard(config) {
  renderWebhook(config.discordWebhook);
  
  const tabsContainer = document.querySelector('.tabs-container');
  tabsContainer.innerHTML = `
    <div class="stats-bar">${renderStatsBar(config.accounts)}</div>
    <div class="bots-grid">${config.accounts.map((account, index) => renderBotCard(account, index)).join('')}</div>
  `;
  
  // Inicializar todos los sliders después de renderizar
  initializeAllSliders(config.accounts);
  
  startGlobalPolling();
}

function renderStatsBar(accounts) {
  const totalAccounts = accounts.length;
  const enabledAccounts = accounts.filter(a => a.enabled).length;
  const totalFlips = accounts.reduce((sum, a) => sum + (a.flips?.maxFlips || 0), 0);
  const totalWhitelist = accounts.reduce((sum, a) => sum + (a.flips?.whitelist?.length || 0), 0);

  return `
    <div class="stat-card">
      <div class="stat-value">${enabledAccounts}/${totalAccounts}</div>
      <div class="stat-label">Active Bots</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalFlips}</div>
      <div class="stat-label">Total Flips</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalWhitelist}</div>
      <div class="stat-label">Whitelist Items</div>
    </div>
  `;
}

// ==================== WEBHOOK ====================
function renderWebhook(webhook) {
  const webhookEl = document.getElementById('webhook');
  if (!webhookEl) return;

  if (!webhook || webhook === '') {
    webhookEl.innerHTML = '<span class="empty">No webhook configured</span>';
    webhookEl.classList.add('empty');
    webhookEl.classList.remove('editable');
  } else {
    webhookEl.textContent = webhook;
    webhookEl.classList.remove('empty');
    webhookEl.classList.add('editable');
  }

  const newWebhookEl = webhookEl.cloneNode(true);
  webhookEl.parentNode.replaceChild(newWebhookEl, webhookEl);

  newWebhookEl.addEventListener('click', () => makeWebhookEditable(newWebhookEl));
}

function makeWebhookEditable(element) {
  const currentValue = (globalConfig && globalConfig.discordWebhook) ? globalConfig.discordWebhook : '';
  
  element.innerHTML = '';
  element.classList.add('editing');
  
  const inputContainer = document.createElement('div');
  inputContainer.style.width = '100%';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentValue;
  input.className = 'webhook-input';
  input.placeholder = 'https://discord.com/api/webhooks/...';
  
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'webhook-buttons';
  
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.className = 'btn webhook-save-btn';
  saveBtn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await saveWebhook(input.value.trim(), currentValue);
  };
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'btn webhook-cancel-btn';
  cancelBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    element.classList.remove('editing');
    renderWebhook(currentValue);
  };
  
  buttonsContainer.appendChild(saveBtn);
  buttonsContainer.appendChild(cancelBtn);
  inputContainer.appendChild(input);
  inputContainer.appendChild(buttonsContainer);
  element.appendChild(inputContainer);
  
  setTimeout(() => {
    input.focus();
    input.select();
  }, 10);
  
  input.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveWebhook(input.value.trim(), currentValue);
    }
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      element.classList.remove('editing');
      renderWebhook(currentValue);
    }
  });
}

async function saveWebhook(webhook, oldValue) {
  if (!password) {
    showToast('Session expired. Please login again.', 'error');
    logout();
    return;
  }

  try {
    const response = await fetch('/api/discord/webhook', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-password': password },
      body: JSON.stringify({ webhook })
    });
    const data = await response.json();

    if (response.ok && data.success) {
      showToast('Webhook updated successfully', 'success');
      if (globalConfig) globalConfig.discordWebhook = webhook;
      const webhookEl = document.getElementById('webhook');
      if (webhookEl) webhookEl.classList.remove('editing');
      renderWebhook(webhook);
    } else {
      showToast('Failed to update webhook: ' + (data.error || 'Unknown error'), 'error');
      const webhookEl = document.getElementById('webhook');
      if (webhookEl) webhookEl.classList.remove('editing');
      renderWebhook(oldValue);
    }
  } catch (error) {
    console.error('❌ Error updating webhook:', error);
    showToast('Error updating webhook: ' + error.message, 'error');
    const webhookEl = document.getElementById('webhook');
    if (webhookEl) webhookEl.classList.remove('editing');
    renderWebhook(oldValue);
  }
}

// ==================== BOT CARD ====================
function renderBotCard(account, index) {
  const isExpanded = expandedBots.has(index);
  
  return `
    <div class="bot-card ${isExpanded ? 'expanded' : ''}" id="bot-${index}">
      <div class="bot-header" onclick="toggleBotCard(${index})">
        <div class="bot-avatar">
          <img src="https://mc-heads.net/head/${escapeHtml(account.username)}/64" alt="${escapeHtml(account.username)}"
            onerror="this.src='https://minotar.net/avatar/${escapeHtml(account.username)}/64'"/>
          <div class="bot-status-indicator offline" id="status-indicator-${index}"></div>
        </div>
        
        <div class="bot-info">
          <div class="bot-name">${escapeHtml(account.username)}</div>
          <div class="bot-stats">
            <div class="bot-stat">STATUS: <span class="bot-stat-value" id="status-text-${index}">● OFFLINE</span></div>
            <div class="bot-stat">FLIPS: <span class="bot-stat-value">${account.flips?.maxFlips || 0}</span></div>
            <div class="bot-stat">ITEMS: <span class="bot-stat-value">${account.flips?.whitelist?.length || 0}</span></div>
          </div>
        </div>

        <div class="bot-controls" onclick="event.stopPropagation()">
          <button class="bot-btn start" id="start-btn-${index}" onclick="startBot(${index})">▶</button>
          <button class="bot-btn stop" id="stop-btn-${index}" onclick="stopBot(${index})" style="display:none;">■</button>
          <button class="bot-btn restart" id="restart-btn-${index}" onclick="restartBot(${index})" style="display:none;">↻</button>
        </div>

        <div class="bot-expand">▼</div>
      </div>

      <div class="bot-details">
        <div class="bot-details-content">${renderBotDetails(account, index)}</div>
      </div>
    </div>
  `;
}

function renderBotDetails(account, index) {
  const activeSection = activeBotSections.get(index) || 'bot-config';
  
  return `
    <div class="bot-details-layout">
      <div class="bot-sidebar">
        <button class="sidebar-item ${activeSection === 'bot-config' ? 'active' : ''}" 
                onclick="event.preventDefault(); switchBotSection(${index}, 'bot-config');">
          <span class="sidebar-icon">⚙</span>
          <span class="sidebar-label">Bot Config</span>
        </button>
        <button class="sidebar-item ${activeSection === 'flipper-config' ? 'active' : ''}" 
                onclick="event.preventDefault(); switchBotSection(${index}, 'flipper-config');">
          <span class="sidebar-icon">$</span>
          <span class="sidebar-label">Flipper Config</span>
        </button>
        <button class="sidebar-item ${activeSection === 'earnings-stats' ? 'active' : ''}" 
                onclick="event.preventDefault(); switchBotSection(${index}, 'earnings-stats');">
          <span class="sidebar-icon">▸</span>
          <span class="sidebar-label">Earnings Stats</span>
        </button>
      </div>
      
      <div class="bot-content">
        <div class="bot-section ${activeSection === 'bot-config' ? 'active' : ''}" id="bot-config-${index}">
          ${renderBotConfigSection(account, index)}
        </div>
        
        <div class="bot-section ${activeSection === 'flipper-config' ? 'active' : ''}" id="flipper-config-${index}">
          ${renderFlipperConfigSection(account, index)}
        </div>
        
        <div class="bot-section ${activeSection === 'earnings-stats' ? 'active' : ''}" id="earnings-stats-${index}">
          ${renderStatsChart(account, index)}
        </div>
      </div>
    </div>
  `;
}

function renderBotConfigSection(account, index) {
  const restSchedule = account.restSchedule || {
    shortBreaks: { enabled: false, workMinutes: 30, restMinutes: 5 },
    dailyRest: { enabled: false, workHours: 16 }
  };
  
  const dailyRestHours = 24 - (restSchedule.dailyRest.workHours || 16);
  
  return `
    <div class="config-section collapsible">
      <div class="config-section-header" onclick="toggleConfigSection(this)">
        <h3>⚙ General Config</h3>
        <span class="config-expand">▼</span>
      </div>
      <div class="config-section-content">
        <div class="bot-config-grid">
          <!-- Auto-Start -->
          <div class="bot-config-row">
            <div class="bot-config-title">Auto-Start Bot</div>
            <div class="bot-config-control">
              <label class="switch">
                <input type="checkbox" ${account.autoStart ? 'checked' : ''} 
                  onchange="updateConfig(${index}, 'autoStart', this.checked)">
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="bot-config-description">Automatically start bot when loaded</div>
          </div>

          <!-- Short Breaks Enable -->
          <div class="bot-config-row">
            <div class="bot-config-title">Short Breaks</div>
            <div class="bot-config-control">
              <label class="switch">
                <input type="checkbox" ${restSchedule.shortBreaks.enabled ? 'checked' : ''}
                  onchange="updateRestSchedule(${index}, 'shortBreaks.enabled', this.checked)">
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="bot-config-description">Take short breaks between work periods</div>
          </div>

          <!-- Work Duration - Nested -->
          <div class="bot-config-row nested-config" id="work-duration-${index}" style="display: ${restSchedule.shortBreaks.enabled ? 'grid' : 'none'}">
            <div class="bot-config-title">Work Time</div>
            <div class="bot-config-control">
              <div class="slider-container">
                <input type="range" class="slider colored-slider" data-color="#8b5cf6" 
                  min="5" max="120" step="5" value="${restSchedule.shortBreaks.workMinutes}"
                  oninput="updateSliderValue(this, 'work-time-${index}', ' min')"
                  onchange="updateRestSchedule(${index}, 'shortBreaks.workMinutes', parseInt(this.value))"/>
                <div class="slider-value-card" id="work-time-${index}" style="--slider-color: #8b5cf6">${restSchedule.shortBreaks.workMinutes} min</div>
                <div class="slider-labels">
                  <span>5 min</span>
                  <span>120 min</span>
                </div>
              </div>
            </div>
            <div class="bot-config-description">Time the bot actively flips before break</div>
          </div>

          <!-- Break Duration - Nested -->
          <div class="bot-config-row nested-config" id="break-duration-${index}" style="display: ${restSchedule.shortBreaks.enabled ? 'grid' : 'none'}">
            <div class="bot-config-title">Break Time</div>
            <div class="bot-config-control">
              <div class="slider-container">
                <input type="range" class="slider colored-slider" data-color="#7c3aed" 
                  min="1" max="30" step="1" value="${restSchedule.shortBreaks.restMinutes}"
                  oninput="updateSliderValue(this, 'break-time-${index}', ' min')"
                  onchange="updateRestSchedule(${index}, 'shortBreaks.restMinutes', parseInt(this.value))"/>
                <div class="slider-value-card" id="break-time-${index}" style="--slider-color: #7c3aed">${restSchedule.shortBreaks.restMinutes} min</div>
                <div class="slider-labels">
                  <span>1 min</span>
                  <span>30 min</span>
                </div>
              </div>
            </div>
            <div class="bot-config-description">Duration of rest period between work</div>
          </div>

          <!-- Daily Rest Enable -->
          <div class="bot-config-row">
            <div class="bot-config-title">Daily Rest Period</div>
            <div class="bot-config-control">
              <label class="switch">
                <input type="checkbox" ${restSchedule.dailyRest.enabled ? 'checked' : ''}
                  onchange="updateRestSchedule(${index}, 'dailyRest.enabled', this.checked)">
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="bot-config-description">Enable daily rest period to avoid detection</div>
          </div>

          <!-- Active Hours (Green to Red gradient) - Nested -->
          <div class="bot-config-row nested-config" id="active-hours-${index}" style="display: ${restSchedule.dailyRest.enabled ? 'grid' : 'none'}">
            <div class="bot-config-title">Active Hours per Day</div>
            <div class="bot-config-control">
              <div class="slider-container">
                <input type="range" class="slider gradient-slider-green-red" 
                  id="active-hours-slider-${index}"
                  min="1" max="23" step="1" value="${restSchedule.dailyRest.workHours}"
                  oninput="updateActiveHoursSlider(${index}, this.value)"
                  onchange="updateRestSchedule(${index}, 'dailyRest.workHours', parseInt(this.value))"/>
                <div class="slider-value-card gradient-value-green-red" id="active-hours-value-${index}">${restSchedule.dailyRest.workHours}h</div>
                <div class="slider-labels">
                  <span>1h</span>
                  <span>23h</span>
                </div>
              </div>
            </div>
            <div class="bot-config-description">Hours active per day (rest: ${24 - restSchedule.dailyRest.workHours}h). Lower is safer.</div>
          </div>
        </div>
      </div>
    </div>

    <div class="config-section collapsible">
      <div class="config-section-header" onclick="toggleConfigSection(this)">
        <h3>⊡ Proxy Config</h3>
        <span class="config-expand">▼</span>
      </div>
      <div class="config-section-content">
        ${renderProxyConfig(account.proxy || {}, index)}
      </div>
    </div>
  `;
}

function renderFlipperConfigSection(account, index) {
  return `
    <div class="config-section collapsible">
      <div class="config-section-header" onclick="toggleConfigSection(this)">
        <h3>$ Flip Config</h3>
        <span class="config-expand">▼</span>
      </div>
      <div class="config-section-content">
        ${renderFlipConfig(account.flips, index)}
      </div>
    </div>

    <div class="lists-container">
      <div class="config-section collapsible">
        <div class="config-section-header" onclick="toggleConfigSection(this)">
          <h3>+ Whitelist Editor</h3>
          <span class="config-expand">▼</span>
        </div>
        <div class="config-section-content">
          ${renderListEditor(account.flips, index, 'whitelist')}
        </div>
      </div>

      <div class="config-section collapsible">
        <div class="config-section-header" onclick="toggleConfigSection(this)">
          <h3>− Blacklist Editor</h3>
          <span class="config-expand">▼</span>
        </div>
        <div class="config-section-content">
          ${renderListEditor(account.flips, index, 'blacklist')}
        </div>
      </div>
    </div>
  `;
}

function renderProxyConfig(proxy, index) {
  if (!proxy) return '<div class="config-item"><div class="config-value">No proxy configured</div></div>';

  return `
    <div class="config-grid">
      <div class="config-item">
        <label class="config-label">Host</label>
        <input type="text" class="config-value editable" value="${escapeHtml(proxy.host)}"
          onchange="updateConfig(${index}, 'proxy.host', this.value)"/>
      </div>
      <div class="config-item">
        <label class="config-label">Port</label>
        <input type="number" class="config-value editable" value="${proxy.port}"
          onchange="updateConfig(${index}, 'proxy.port', parseInt(this.value))"/>
      </div>
      <div class="config-item">
        <label class="config-label">Type</label>
        <div class="config-value">SOCKS${proxy.type}</div>
      </div>
      ${proxy.username ? `
      <div class="config-item">
        <label class="config-label">Username</label>
        <input type="text" class="config-value editable" value="${escapeHtml(proxy.username)}"
          onchange="updateConfig(${index}, 'proxy.username', this.value)"/>
      </div>` : ''}
    </div>
  `;
}

function renderFlipConfig(flips, index) {
  const configs = [
    { key: 'maxBuyPrice', label: 'Max Buy Price', min: 100000, max: 50000000, step: 100000, unit: ' coins', minLabel: '100K', maxLabel: '50M', color: '#b19cd9' },
    { key: 'minProfit', label: 'Min Profit', min: 1000, max: 1000000, step: 1000, unit: ' coins', minLabel: '1K', maxLabel: '1M', color: '#a78bfa' },
    { key: 'minVolume', label: 'Min Volume', min: 1, max: 100000, step: 1, unit: ' sales/day', minLabel: '1', maxLabel: '100K', color: '#9b6ff7' },
    { key: 'maxFlips', label: 'Max Flips', min: 1, max: 20, step: 1, unit: '', minLabel: '1', maxLabel: '20', color: '#8b5cf6' },
    { key: 'maxRelist', label: 'Max Relist', min: 1, max: 10, step: 1, unit: '', minLabel: '1', maxLabel: '10', color: '#7c3aed' },
    { key: 'maxBuyRelist', label: 'Max Buy Relist', min: 1, max: 10, step: 1, unit: '', minLabel: '1', maxLabel: '10', color: '#6d28d9' },
    { key: 'minOrder', label: 'Min Order', min: 1, max: 1000, step: 1, unit: ' items', minLabel: '1', maxLabel: '1K', color: '#5b21b6' },
    { key: 'maxOrder', label: 'Max Order', min: 10, max: 10000, step: 10, unit: ' items', minLabel: '10', maxLabel: '10K', color: '#4c1d95' },
    { key: 'minSpread', label: 'Min Spread', min: 0, max: 100, step: 1, unit: '%', minLabel: '0%', maxLabel: '100%', color: '#3b0764' }
  ];

  return `
    <div class="config-grid">
      ${configs.map(cfg => {
        const value = flips[cfg.key] || (cfg.key === 'maxBuyRelist' ? 3 : 0);
        return `
          <div class="config-item">
            <label class="config-label">${cfg.label}</label>
            <div class="slider-container">
              <input type="range" class="slider colored-slider" data-color="${cfg.color}" min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${value}"
                oninput="updateSliderValue(this, '${cfg.key}-${index}')"
                onchange="updateConfig(${index}, 'flips.${cfg.key}', parseInt(this.value))"/>
              <div class="slider-value-card" id="${cfg.key}-${index}" style="--slider-color: ${cfg.color}">${formatNumber(value)}${cfg.unit}</div>
              <div class="slider-labels">
                <span>${cfg.minLabel}</span>
                <span>${cfg.maxLabel}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function updateSliderValue(slider, elementId, unit = '') {
  const valueEl = document.getElementById(elementId);
  if (!valueEl) return;
  
  const value = parseInt(slider.value);
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  
  // Calculate progress percentage
  const progress = ((value - min) / (max - min)) * 100;
  slider.style.setProperty('--slider-progress', `${progress}%`);
  
  // Update color if the slider has a data-color attribute
  const color = slider.getAttribute('data-color');
  if (color) {
    slider.style.setProperty('--slider-color', color);
  }
  
  // If unit is explicitly provided, use it
  if (unit) {
    valueEl.textContent = formatNumber(value) + unit;
    return;
  }
  
  // Otherwise, determine unit based on element ID
  if (elementId.includes('maxBuyPrice') || elementId.includes('minProfit')) {
    valueEl.textContent = formatNumber(value) + ' coins';
  } else if (elementId.includes('minVolume')) {
    valueEl.textContent = formatNumber(value) + ' sales/day';
  } else if (elementId.includes('minOrder') || elementId.includes('maxOrder')) {
    valueEl.textContent = formatNumber(value) + ' items';
  } else if (elementId.includes('minSpread')) {
    valueEl.textContent = value + '%';
  } else if (elementId.includes('work') || elementId.includes('break')) {
    valueEl.textContent = value + ' min';
  } else if (elementId.includes('daily')) {
    valueEl.textContent = value + 'h';
  } else {
    valueEl.textContent = formatNumber(value);
  }
}

function renderListEditor(flips, index, listType) {
  const list = listType === 'whitelist' ? (flips.whitelist || []) : (flips.blacklistContaining || []);
  
  return `
    <div class="item-editor">
      <div class="search-container">
        <input type="text" class="item-search" id="${listType}-search-${index}"
          placeholder="Search items..." oninput="searchItems(${index}, '${listType}', this.value)" autocomplete="off"/>
        <div class="search-results" id="${listType}-results-${index}"></div>
      </div>
      <div class="items-grid" id="${listType}-items-${index}">
        ${list.map(itemId => renderItemCard(itemId, index, listType)).join('')}
      </div>
    </div>
  `;
}

// ==================== ITEMS ====================
function renderItemCard(itemId, accountIndex, listType) {
  const item = skyblockItems.find(i => i.id === itemId);
  const itemName = item ? item.name : itemId;
  const imageUrl = item ? getItemImageUrl(item) : 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/block/stone.png';
  
  return `
    <div class="item-card ${listType}">
      <img src="${imageUrl}" alt="${escapeHtml(itemName)}" class="item-icon" 
        onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/item/barrier.png'"/>
      <div class="item-info">
        <div class="item-name">${escapeHtml(itemName)}</div>
        <div class="item-id">${escapeHtml(itemId)}</div>
      </div>
      <button class="item-remove" onclick="removeItem(${accountIndex}, '${listType}', '${escapeHtml(itemId)}')">×</button>
    </div>
  `;
}

function getItemImageUrl(item) {
  if (!item) return 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/item/barrier.png';
  
  if (item.skin && item.skin.value) {
    try {
      const decoded = atob(item.skin.value);
      const skinData = JSON.parse(decoded);
      if (skinData.textures && skinData.textures.SKIN && skinData.textures.SKIN.url) {
        const textureHash = skinData.textures.SKIN.url.split('/').pop();
        return `https://mc-heads.net/head/${textureHash}/32`;
      }
    } catch (error) {
      console.warn('⚠️ Failed to decode skin data:', error);
    }
  }
  
  let material = (item.material || 'STONE').toLowerCase();
  
  const materialMap = {
    'wood_hoe': 'wooden_hoe', 'wood_sword': 'wooden_sword', 'wood_axe': 'wooden_axe',
    'gold_hoe': 'golden_hoe', 'gold_sword': 'golden_sword', 'gold_axe': 'golden_axe',
    'gold_helmet': 'golden_helmet', 'gold_chestplate': 'golden_chestplate',
    'skull_item': 'player_head'
  };
  
  material = materialMap[material] || material;
  
  const blockMaterials = ['stone', 'cobblestone', 'dirt', 'grass_block', 'sand', 'gravel', 'glass', 
    'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'obsidian', 'tnt', 'chest'];
  const textureType = blockMaterials.includes(material) ? 'block' : 'item';
  
  return `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/${textureType}/${material}.png`;
}

function searchItems(accountIndex, listType, query) {
  const resultsDiv = document.getElementById(`${listType}-results-${accountIndex}`);
  
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matches = skyblockItems
    .filter(item => item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery))
    .slice(0, 10);

  if (matches.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">No items found</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = matches.map(item => `
    <div class="search-result-item" onclick="addItemToList(${accountIndex}, '${listType}', '${escapeHtml(item.id)}')">
      <img src="${getItemImageUrl(item)}" alt="${escapeHtml(item.name)}" class="result-icon" 
        onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/item/stone.png'"/>
      <div class="result-info">
        <div class="result-name">${escapeHtml(item.name)}</div>
        <div class="result-id">${escapeHtml(item.id)}</div>
      </div>
    </div>
  `).join('');
  
  resultsDiv.style.display = 'block';
}

async function addItemToList(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    showToast(`Adding to ${listType}...`, 'info');
    
    const res = await fetch(`/api/account/${accountIndex}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': password },
      body: JSON.stringify({ itemId })
    });
    const data = await res.json();
    
    if (data.success) {
      document.getElementById(`${listType}-search-${accountIndex}`).value = '';
      document.getElementById(`${listType}-results-${accountIndex}`).innerHTML = '';
      document.getElementById(`${listType}-results-${accountIndex}`).style.display = 'none';
      
      const itemsContainer = document.getElementById(`${listType}-items-${accountIndex}`);
      itemsContainer.innerHTML += renderItemCard(itemId, accountIndex, listType);
      
      showToast(`✅ Item added to ${listType}`, 'success');
    } else {
      showToast(`❌ ${data.error || 'Error adding item'}`, 'error');
    }
  } catch (error) {
    console.error('Error adding item:', error);
    showToast(`❌ Failed to add item: ${error.message}`, 'error');
  }
}

async function removeItem(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    showToast(`Removing from ${listType}...`, 'info');
    
    const res = await fetch(`/api/account/${accountIndex}/${endpoint}/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: { 'x-password': password }
    });
    const data = await res.json();
    
    if (data.success) {
      const itemsContainer = document.getElementById(`${listType}-items-${accountIndex}`);
      itemsContainer.innerHTML = data[endpoint].map(id => renderItemCard(id, accountIndex, listType)).join('');
      showToast(`✅ Item removed from ${listType}`, 'success');
    } else {
      showToast(`❌ ${data.error || 'Error removing item'}`, 'error');
    }
  } catch (error) {
    console.error('Error removing item:', error);
    showToast(`❌ Failed to remove item: ${error.message}`, 'error');
  }
}

// ==================== STATS & CHARTS ====================
function renderStatsChart(account, index) {
  return `
    <div class="global-stats-bar">
      <div class="global-stat-card">
        <div class="stat-label">Total Profit</div>
        <div class="stat-value" id="global-total-profit-${index}">Loading...</div>
      </div>
      <div class="global-stat-card">
        <div class="stat-label">Avg Profit/Flip</div>
        <div class="stat-value" id="global-avg-profit-${index}">Loading...</div>
      </div>
      <div class="global-stat-card">
        <div class="stat-label">Total Flips</div>
        <div class="stat-value" id="global-total-flips-${index}">Loading...</div>
      </div>
      <div class="global-stat-card">
        <div class="stat-label">Coins/Hour</div>
        <div class="stat-value" id="global-coins-hour-${index}">Loading...</div>
      </div>
      <div class="global-stat-card">
        <div class="stat-label">Best Flip</div>
        <div class="stat-value" id="global-best-flip-${index}">Loading...</div>
      </div>
    </div>

    <div class="charts-grid" id="charts-grid-${index}">
      <div class="mini-chart-card" onclick="toggleChartExpand(${index}, 'profit')" id="profit-chart-card-${index}">
        <div class="mini-chart-header">
          <h4>📈 Profit per Flip</h4>
          <span class="expand-icon">⛶</span>
        </div>
        <div class="chart-container mini" id="chart-container-${index}">
          <div class="chart-loading"><div class="loading"></div></div>
        </div>
      </div>

      <div class="mini-chart-card" onclick="toggleChartExpand(${index}, 'cumulative')" id="cumulative-chart-card-${index}">
        <div class="mini-chart-header">
          <h4>💰 Total Gains Over Time</h4>
          <span class="expand-icon">⛶</span>
        </div>
        <div class="chart-container mini" id="cumulative-chart-container-${index}">
          <div class="chart-loading"><div class="loading"></div></div>
        </div>
      </div>

      <div class="mini-chart-card" onclick="toggleChartExpand(${index}, 'purse')" id="purse-chart-card-${index}">
        <div class="mini-chart-header">
          <h4>💵 Purse Balance</h4>
          <span class="expand-icon">⛶</span>
        </div>
        <div class="chart-container mini" id="purse-chart-container-${index}">
          <div class="chart-loading"><div class="loading"></div></div>
        </div>
      </div>
    </div>

    <div class="activity-logs">
      <h4>▸ Recent Activity</h4>
      <div class="logs-container" id="logs-container-${index}">
        <div class="log-placeholder">No recent activity</div>
      </div>
    </div>
  `;
}

// ==================== POLLING ====================
let globalPollingInterval = null;

function startGlobalPolling() {
  if (globalPollingInterval) clearInterval(globalPollingInterval);
  
  globalPollingInterval = setInterval(async () => {
    if (!globalConfig || !globalConfig.accounts || !password) return;
    
    for (let i = 0; i < globalConfig.accounts.length; i++) {
      await updateBotStatus(i);
    }
  }, 2000);
}

function stopGlobalPolling() {
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

function toggleBotCard(index) {
  const card = document.getElementById(`bot-${index}`);
  
  if (expandedBots.has(index)) {
    expandedBots.delete(index);
    card.classList.remove('expanded');
    stopBotIntervals(index);
  } else {
    expandedBots.add(index);
    if (!activeBotSections.has(index)) activeBotSections.set(index, 'bot-config');
    card.classList.add('expanded');
    
    const activeSection = activeBotSections.get(index);
    if (activeSection === 'earnings-stats') {
      loadBotData(index);
      loadActivityLogs(index);
      startBotIntervals(index);
    }
  }
}

function switchBotSection(accountIndex, section) {
  activeBotSections.set(accountIndex, section);
  
  const sidebar = document.querySelector(`#bot-${accountIndex} .bot-sidebar`);
  if (sidebar) {
    const buttons = sidebar.querySelectorAll('.sidebar-item');
    buttons.forEach(btn => {
      const isActive = btn.textContent.toLowerCase().includes(section.replace('-', ' '));
      btn.classList.toggle('active', isActive);
    });
  }

  ['bot-config', 'flipper-config', 'earnings-stats'].forEach(sectionName => {
    const element = document.getElementById(`${sectionName}-${accountIndex}`);
    if (element) element.classList.toggle('active', sectionName === section);
  });
  
  if (section !== 'earnings-stats') {
    stopBotIntervals(accountIndex);
  } else {
    loadBotData(accountIndex);
    loadActivityLogs(accountIndex);
    startBotIntervals(accountIndex);
  }
}

function startBotIntervals(accountIndex) {
  if (!updateIntervals.has(accountIndex)) {
    updateIntervals.set(accountIndex, {});
  }
  
  const intervals = updateIntervals.get(accountIndex);
  
  intervals.chart = setInterval(() => {
    if (expandedBots.has(accountIndex)) loadBotData(accountIndex, true);
  }, 5000);
  
  intervals.logs = setInterval(() => {
    if (expandedBots.has(accountIndex)) loadActivityLogs(accountIndex);
  }, 10000);
}

function stopBotIntervals(accountIndex) {
  if (updateIntervals.has(accountIndex)) {
    const intervals = updateIntervals.get(accountIndex);
    if (intervals.chart) clearInterval(intervals.chart);
    if (intervals.logs) clearInterval(intervals.logs);
    updateIntervals.delete(accountIndex);
  }
}

async function loadBotData(accountIndex, isUpdate = false) {
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
        y: { grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#AAA', callback: (value) => formatNumber(value) } }
      }
    }
  });
  
  purseCharts.set(accountIndex, chart);
}

async function loadActivityLogs(accountIndex) {
  const logsContainer = document.getElementById(`logs-container-${accountIndex}`);
  if (!logsContainer) return;

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

    const scrollTop = logsContainer.scrollTop;
    const scrollHeight = logsContainer.scrollHeight;
    const clientHeight = logsContainer.clientHeight;
    const wasAtBottom = scrollTop + clientHeight >= scrollHeight - 10;

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

// ==================== BOT CONTROLS ====================
async function startBot(accountIndex) {
  await botControl(accountIndex, 'start', 'Starting bot');
}

async function stopBot(accountIndex) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !confirm(`Stop bot ${account.username}?`)) return;
  await botControl(accountIndex, 'stop', 'Stopping bot');
}

async function restartBot(accountIndex) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !confirm(`Restart bot ${account.username}?`)) return;
  await botControl(accountIndex, 'restart', 'Restarting bot');
}

async function botControl(accountIndex, action, message) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return showToast('Bot not found', 'error');
  
  try {
    showToast(`${message}: ${account.username}...`, 'info');
    
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-password': password }
    });
    
    const result = await response.json();
    showToast(result.message || result.error, result.success ? 'success' : 'error');
  } catch (error) {
    console.error(`Error ${action} bot:`, error);
    showToast(`Failed to ${action} bot: ${error.message}`, 'error');
  }
}

// ==================== UI HELPERS ====================
function toggleConfigSection(headerElement) {
  const section = headerElement.closest('.config-section');
  const content = section.querySelector('.config-section-content');
  const expandIcon = section.querySelector('.config-expand');
  
  if (section.classList.contains('collapsed')) {
    section.classList.remove('collapsed');
    content.style.display = 'block';
    expandIcon.textContent = '▼';
  } else {
    section.classList.add('collapsed');
    content.style.display = 'none';
    expandIcon.textContent = '▶';
  }
}

// ==================== CHART EXPANSION ====================
function toggleChartExpand(accountIndex, chartType) {
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

// ==================== CUMULATIVE CHART ====================
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

// ===========================
// REST SCHEDULE SYSTEM (REMOVED - Now per-bot configuration)
// ===========================

// Remove old rest schedule functions that reference non-existent DOM elements
document.addEventListener('DOMContentLoaded', () => {
  // No longer needed - rest schedule is now per-bot in the config sections
});

// ==================== BOT CONFIGURATION ====================

function renderGeneralConfig(account, index) {
  const restSchedule = account.restSchedule || {
    shortBreaks: { enabled: false, workMinutes: 30, restMinutes: 5 },
    dailyRest: { enabled: false, workHours: 16 }
  };

  return `
    <div class="config-grid">
      <div class="config-item full-width">
        <label class="config-label">Bot Status</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${account.enabled ? 'checked' : ''}
              onchange="updateConfig(${index}, 'enabled', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${account.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div class="config-item full-width">
        <label class="config-label">Auto-Start on Launch</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${account.autoStart ? 'checked' : ''}
              onchange="updateConfig(${index}, 'autoStart', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${account.autoStart ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div class="config-item full-width">
        <label class="config-label">Short Breaks</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${restSchedule.shortBreaks.enabled ? 'checked' : ''}
              onchange="updateRestSchedule(${index}, 'shortBreaks.enabled', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${restSchedule.shortBreaks.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div id="shortBreaks-${index}" style="display: ${restSchedule.shortBreaks.enabled ? 'contents' : 'none'}">
        <div class="config-item">
          <label class="config-label">Work Duration</label>
          <div class="slider-container">
            <input type="range" class="slider" min="5" max="120" step="5" value="${restSchedule.shortBreaks.workMinutes}"
              oninput="updateSliderValue(this, 'work-${index}', ' min')"
              onchange="updateRestSchedule(${index}, 'shortBreaks.workMinutes', parseInt(this.value))"/>
            <div class="slider-value" id="work-${index}">${restSchedule.shortBreaks.workMinutes} min</div>
            <div class="slider-labels">
              <span>5 min</span>
              <span>120 min</span>
            </div>
          </div>
        </div>

        <div class="config-item">
          <label class="config-label">Break Duration</label>
          <div class="slider-container">
            <input type="range" class="slider" min="1" max="30" step="1" value="${restSchedule.shortBreaks.restMinutes}"
              oninput="updateSliderValue(this, 'break-${index}', ' min')"
              onchange="updateRestSchedule(${index}, 'shortBreaks.restMinutes', parseInt(this.value))"/>
            <div class="slider-value" id="break-${index}">${restSchedule.shortBreaks.restMinutes} min</div>
            <div class="slider-labels">
              <span>1 min</span>
              <span>30 min</span>
            </div>
          </div>
        </div>
      </div>

      <div class="config-item full-width">
        <label class="config-label">Daily Rest Period</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${restSchedule.dailyRest.enabled ? 'checked' : ''}
              onchange="updateRestSchedule(${index}, 'dailyRest.enabled', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${restSchedule.dailyRest.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div id="dailyRest-${index}" class="config-item" style="display: ${restSchedule.dailyRest.enabled ? 'block' : 'none'}">
        <label class="config-label">Active Hours per Day</label>
        <div class="slider-container">
          <input type="range" class="slider" min="1" max="23" step="1" value="${restSchedule.dailyRest.workHours}"
            oninput="updateSliderValue(this, 'daily-${index}', 'h')"
            onchange="updateRestSchedule(${index}, 'dailyRest.workHours', parseInt(this.value))"/>
          <div class="slider-value" id="daily-${index}">${restSchedule.dailyRest.workHours}h</div>
          <div class="slider-labels">
            <span>1h</span>
            <span>23h</span>
          </div>
        </div>
      </div>
    </div>

    <div class="config-divider"></div>

    <h4 class="config-subtitle">Proxy Configuration</h4>
    ${renderProxyConfig(account.proxy || {}, index)}
  `;
}

function updateActiveHoursSlider(index, value) {
  const valueEl = document.getElementById(`active-hours-value-${index}`);
  if (valueEl) {
    valueEl.textContent = `${value}h`;
    
    // Update color based on value (more green for lower hours, more red for higher hours)
    const percentage = ((value - 1) / 22) * 100; // 1 to 23
    valueEl.style.setProperty('--hours-percentage', percentage);
  }
  
  // Update description with rest hours
  const row = document.getElementById(`active-hours-${index}`);
  if (row) {
    const description = row.querySelector('.bot-config-description');
    if (description) {
      const restHours = 24 - parseInt(value);
      description.textContent = `Hours active per day (rest: ${restHours}h). Lower is safer.`;
    }
  }
}

function initializeAllSliders(accounts) {
  accounts.forEach((account, index) => {
    // Initialize active hours slider if it exists
    const slider = document.getElementById(`active-hours-slider-${index}`);
    if (slider) {
      const value = slider.value;
      const min = slider.min || 0;
      const max = slider.max || 100;
      const percentage = ((value - min) / (max - min)) * 100;
      slider.style.setProperty('--slider-progress', `${percentage}%`);
    }

    // Initialize all other sliders
    const allSliders = document.querySelectorAll(`#bot-${index} .slider`);
    allSliders.forEach(s => {
      const val = s.value;
      const minVal = s.min || 0;
      const maxVal = s.max || 100;
      const prog = ((val - minVal) / (maxVal - minVal)) * 100;
      s.style.setProperty('--slider-progress', `${prog}%`);
    });
  });
}

function updateSliderProgress(slider) {
  const value = slider.value;
  const min = slider.min || 0;
  const max = slider.max || 100;
  const percentage = ((value - min) / (max - min)) * 100;
  slider.style.setProperty('--slider-progress', `${percentage}%`);
}

// ==================== BOT CONFIGURATION ====================

function renderGeneralConfig(account, index) {
  const restSchedule = account.restSchedule || {
    shortBreaks: { enabled: false, workMinutes: 30, restMinutes: 5 },
    dailyRest: { enabled: false, workHours: 16 }
  };

  return `
    <div class="config-grid">
      <div class="config-item full-width">
        <label class="config-label">Bot Status</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${account.enabled ? 'checked' : ''}
              onchange="updateConfig(${index}, 'enabled', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${account.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div class="config-item full-width">
        <label class="config-label">Auto-Start on Launch</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${account.autoStart ? 'checked' : ''}
              onchange="updateConfig(${index}, 'autoStart', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${account.autoStart ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div class="config-item full-width">
        <label class="config-label">Short Breaks</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${restSchedule.shortBreaks.enabled ? 'checked' : ''}
              onchange="updateRestSchedule(${index}, 'shortBreaks.enabled', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${restSchedule.shortBreaks.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div id="shortBreaks-${index}" style="display: ${restSchedule.shortBreaks.enabled ? 'contents' : 'none'}">
        <div class="config-item">
          <label class="config-label">Work Duration</label>
          <div class="slider-container">
            <input type="range" class="slider" min="5" max="120" step="5" value="${restSchedule.shortBreaks.workMinutes}"
              oninput="updateSliderValue(this, 'work-${index}', ' min')"
              onchange="updateRestSchedule(${index}, 'shortBreaks.workMinutes', parseInt(this.value))"/>
            <div class="slider-value" id="work-${index}">${restSchedule.shortBreaks.workMinutes} min</div>
            <div class="slider-labels">
              <span>5 min</span>
              <span>120 min</span>
            </div>
          </div>
        </div>

        <div class="config-item">
          <label class="config-label">Break Duration</label>
          <div class="slider-container">
            <input type="range" class="slider" min="1" max="30" step="1" value="${restSchedule.shortBreaks.restMinutes}"
              oninput="updateSliderValue(this, 'break-${index}', ' min')"
              onchange="updateRestSchedule(${index}, 'shortBreaks.restMinutes', parseInt(this.value))"/>
            <div class="slider-value" id="break-${index}">${restSchedule.shortBreaks.restMinutes} min</div>
            <div class="slider-labels">
              <span>1 min</span>
              <span>30 min</span>
            </div>
          </div>
        </div>
      </div>

      <div class="config-item full-width">
        <label class="config-label">Daily Rest Period</label>
        <div class="toggle-container">
          <label class="toggle-switch">
            <input type="checkbox" ${restSchedule.dailyRest.enabled ? 'checked' : ''}
              onchange="updateRestSchedule(${index}, 'dailyRest.enabled', this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label">${restSchedule.dailyRest.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      <div id="dailyRest-${index}" class="config-item" style="display: ${restSchedule.dailyRest.enabled ? 'block' : 'none'}">
        <label class="config-label">Active Hours per Day</label>
        <div class="slider-container">
          <input type="range" class="slider" min="1" max="23" step="1" value="${restSchedule.dailyRest.workHours}"
            oninput="updateSliderValue(this, 'daily-${index}', 'h')"
            onchange="updateRestSchedule(${index}, 'dailyRest.workHours', parseInt(this.value))"/>
          <div class="slider-value" id="daily-${index}">${restSchedule.dailyRest.workHours}h</div>
          <div class="slider-labels">
            <span>1h</span>
            <span>23h</span>
          </div>
        </div>
      </div>
    </div>

    <div class="config-divider"></div>

    <h4 class="config-subtitle">Proxy Configuration</h4>
    ${renderProxyConfig(account.proxy || {}, index)}
  `;
}

async function updateRestSchedule(accountIndex, field, value) {
  try {
    const config = globalConfig.accounts[accountIndex];
    const keys = field.split('.');
    let target = config.restSchedule;
    
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;

    const response = await fetch('/rest-schedule', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify({
        accountIndex,
        restSchedule: config.restSchedule
      })
    });

    if (!response.ok) throw new Error('Failed to update rest schedule');
    
    // Update UI visibility for nested config rows
    if (field === 'shortBreaks.enabled') {
      const workDurationRow = document.getElementById(`work-duration-${accountIndex}`);
      const breakDurationRow = document.getElementById(`break-duration-${accountIndex}`);
      const display = value ? 'grid' : 'none';
      if (workDurationRow) workDurationRow.style.display = display;
      if (breakDurationRow) breakDurationRow.style.display = display;
    } else if (field === 'dailyRest.enabled') {
      const activeHoursRow = document.getElementById(`active-hours-${accountIndex}`);
      if (activeHoursRow) activeHoursRow.style.display = value ? 'grid' : 'none';
    }
    
    console.log('Rest schedule updated successfully');
  } catch (err) {
    console.error('Error updating rest schedule:', err);
    alert('Error al actualizar la configuración de descanso');
  }
}

async function updateConfig(accountIndex, field, value) {
  try {
    const config = globalConfig.accounts[accountIndex];
    
    // Update the local config
    const keys = field.split('.');
    let target = config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
      target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;

    // Save to server
    const response = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify({ path: field, value })
    });

    if (!response.ok) throw new Error('Failed to update config');
    
    console.log('Config updated successfully');
  } catch (err) {
    console.error('Error updating config:', err);
    alert('Error al actualizar la configuración');
  }
}










