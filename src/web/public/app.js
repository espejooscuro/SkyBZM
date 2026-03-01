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
let healthMonitorInterval = null; // 🔥 Monitor de salud global
let lastHealthCheck = new Map(); // 🔥 Último chequeo de salud por bot

/* ============================================
   🔥 HEALTH MONITORING SYSTEM
   ============================================ */

/**
 * Inicia el monitor de salud global que revisa todos los bots
 */
function startGlobalHealthMonitor() {
  if (healthMonitorInterval) return; // Ya está corriendo
  
  console.log('🏥 Starting global health monitor...');
  
  // Revisar salud cada 60 segundos (reducido para evitar falsos positivos)
  healthMonitorInterval = setInterval(async () => {
    if (!globalConfig) return;
    
    for (let i = 0; i < globalConfig.accounts.length; i++) {
      await updateBotStatus(i);
    }
  }, 60000); // 60 segundos
}

/**
 * Detiene el monitor de salud global
 */
function stopGlobalHealthMonitor() {
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval);
    healthMonitorInterval = null;
    console.log('🏥 Stopped global health monitor');
  }
}

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
      startGlobalHealthMonitor(); // 🔥 Iniciar monitor de salud
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
  stopGlobalHealthMonitor(); // 🔥 Detener monitor de salud
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
  const container = document.getElementById('dashboard-content');
  if (!container) {
    console.error('Dashboard content container not found');
    return;
  }
  
  const botCards = config.accounts.map((account, index) => renderBotCard(account, index)).join('');
  
  container.innerHTML = `
    <div class="bots-container">
      ${botCards}
    </div>
  `;
  
  startGlobalHealthMonitor();
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
  const activeSection = activeBotSections.get(index) || 'bot-brain';
  
  return `
    <div class="bot-details-layout">
      <div class="bot-sidebar">
        <button class="sidebar-item ${activeSection === 'bot-brain' ? 'active' : ''}" 
                onclick="event.preventDefault(); switchBotSection(${index}, 'bot-brain');">
          <span class="sidebar-icon">◉</span>
          <span class="sidebar-label">Bot Brain</span>
        </button>
        <button class="sidebar-item ${activeSection === 'earnings-stats' ? 'active' : ''}" 
                onclick="event.preventDefault(); switchBotSection(${index}, 'earnings-stats');">
          <span class="sidebar-icon">▸</span>
          <span class="sidebar-label">Earnings Stats</span>
        </button>
        <button class="sidebar-item ${activeSection === 'flipper-config' ? 'active' : ''}" 
                onclick="event.preventDefault(); switchBotSection(${index}, 'flipper-config');">
          <span class="sidebar-icon">$</span>
          <span class="sidebar-label">Flipper Config</span>
        </button>
        <button class="sidebar-item ${activeSection === 'bot-config' ? 'active' : ''}" 
                onclick="event.preventDefault(); switchBotSection(${index}, 'bot-config');">
          <span class="sidebar-icon">⚙</span>
          <span class="sidebar-label">Bot Config</span>
        </button>
      </div>
      
      <div class="bot-content">
        <div class="bot-section ${activeSection === 'bot-brain' ? 'active' : ''}" id="bot-brain-${index}">
          ${renderBotBrain(account, index)}
        </div>
        
        <div class="bot-section ${activeSection === 'earnings-stats' ? 'active' : ''}" id="earnings-stats-${index}">
          ${renderStatsChart(account, index)}
        </div>
        
        <div class="bot-section ${activeSection === 'flipper-config' ? 'active' : ''}" id="flipper-config-${index}">
          ${renderFlipperConfigSection(account, index)}
        </div>
        
        <div class="bot-section ${activeSection === 'bot-config' ? 'active' : ''}" id="bot-config-${index}">
          ${renderBotConfigSection(account, index)}
        </div>
      </div>
    </div>
  `;
}
function renderBotConfigSection(account, index) {
  const restSchedule = account.restSchedule || {
    shortBreaks: { enabled: false, workDuration: 30, breakDuration: 5 },
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

          <!-- Discord Webhook -->
          <div class="bot-config-row">
            <div class="bot-config-title">Discord Webhook</div>
            <div class="bot-config-control">
              <input type="text" class="config-input" 
                placeholder="https://discord.com/api/webhooks/..." 
                value="${account.discordWebhook || ''}"
                onchange="updateConfig(${index}, 'discordWebhook', this.value.trim())"/>
            </div>
            <div class="bot-config-description">Discord webhook for flip notifications</div>
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
                  min="5" max="120" step="5" value="${restSchedule.shortBreaks.workDuration}"
                  oninput="updateSliderValue(this, 'work-time-${index}', ' min')"
                  onchange="updateRestSchedule(${index}, 'shortBreaks.workDuration', parseInt(this.value))"/>
                <div class="slider-value-card" id="work-time-${index}" style="--slider-color: #8b5cf6">${restSchedule.shortBreaks.workDuration} min</div>
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
                  min="1" max="30" step="1" value="${restSchedule.shortBreaks.breakDuration}"
                  oninput="updateSliderValue(this, 'break-time-${index}', ' min')"
                  onchange="updateRestSchedule(${index}, 'shortBreaks.breakDuration', parseInt(this.value))"/>
                <div class="slider-value-card" id="break-time-${index}" style="--slider-color: #7c3aed">${restSchedule.shortBreaks.breakDuration} min</div>
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
                <div class="slider-value-card" id="active-hours-value-${index}">${restSchedule.dailyRest.workHours}h</div>
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

    <div class="lists-buttons-container">
      <button class="list-editor-button whitelist-btn" onclick="openListEditorModal(${index}, 'whitelist')">
        <span class="list-btn-icon">+</span>
        <div class="list-btn-content">
          <div class="list-btn-title">Whitelist Editor</div>
          <div class="list-btn-count">${account.flips?.whitelist?.length || 0} items</div>
        </div>
      </button>

      <button class="list-editor-button blacklist-btn" onclick="openListEditorModal(${index}, 'blacklist')">
        <span class="list-btn-icon">−</span>
        <div class="list-btn-content">
          <div class="list-btn-title">Blacklist Editor</div>
          <div class="list-btn-count">${account.flips?.blacklistContaining?.length || 0} items</div>
        </div>
      </button>
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
function renderItemCard(itemId, accountIndex, listType, isModal = false) {
  const item = skyblockItems.find(i => i.id === itemId);
  const itemName = item ? item.name : itemId;
  const imageUrl = item ? getItemImageUrl(item) : 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/block/stone.png';
  
  const removeFunction = isModal ? 'removeItemModal' : 'removeItem';
  
  return `
    <div class="item-card ${listType}">
      <img src="${imageUrl}" alt="${escapeHtml(itemName)}" class="item-icon" 
        onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/item/barrier.png'"/>
      <div class="item-info">
        <div class="item-name">${escapeHtml(itemName)}</div>
        <div class="item-id">${escapeHtml(itemId)}</div>
      </div>
      <button class="item-remove" onclick="${removeFunction}(${accountIndex}, '${listType}', '${escapeHtml(itemId)}')">×</button>
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

async function addItemToListModal(accountIndex, listType, itemId) {
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
      document.getElementById(`modal-${listType}-search-${accountIndex}`).value = '';
      document.getElementById(`modal-${listType}-results-${accountIndex}`).innerHTML = '';
      document.getElementById(`modal-${listType}-results-${accountIndex}`).style.display = 'none';
      
      const itemsContainer = document.getElementById(`modal-${listType}-items-${accountIndex}`);
      itemsContainer.innerHTML += renderItemCard(itemId, accountIndex, listType, true);
      
      // Update button count
      updateListButtonCount(accountIndex, listType);
      
      showToast(`✅ Item added to ${listType}`, 'success');
    } else {
      showToast(`❌ ${data.error || 'Error adding item'}`, 'error');
    }
  } catch (error) {
    console.error('Error adding item:', error);
    showToast(`❌ Failed to add item: ${error.message}`, 'error');
  }
}

async function removeItemModal(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    showToast(`Removing from ${listType}...`, 'info');
    
    const res = await fetch(`/api/account/${accountIndex}/${endpoint}/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: { 'x-password': password }
    });
    const data = await res.json();
    
    if (data.success) {
      const itemsContainer = document.getElementById(`modal-${listType}-items-${accountIndex}`);
      itemsContainer.innerHTML = data[endpoint].map(id => renderItemCard(id, accountIndex, listType, true)).join('');
      
      // Update button count
      updateListButtonCount(accountIndex, listType);
      
      showToast(`✅ Item removed from ${listType}`, 'success');
    } else {
      showToast(`❌ ${data.error || 'Error removing item'}`, 'error');
    }
  } catch (error) {
    console.error('Error removing item:', error);
    showToast(`❌ Failed to remove item: ${error.message}`, 'error');
  }
}

function updateListButtonCount(accountIndex, listType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;
  
  const count = listType === 'whitelist' 
    ? (account.flips?.whitelist?.length || 0) 
    : (account.flips?.blacklistContaining?.length || 0);
  
  const button = document.querySelector(`.${listType}-btn .list-btn-count`);
  if (button) {
    button.textContent = `${count} items`;
  }
}

// === CONFIG UPDATE FUNCTIONS ===
async function updateConfig(accountIndex, path, value) {
  try {
    // accountIndex es el índice en el array, no account.index
    const account = globalConfig.accounts[accountIndex];
    if (!account) {
      showToast('Account not found', 'error');
      return;
    }

    // Update local state
    const pathParts = path.split('.');
    let target = account;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) target[pathParts[i]] = {};
      target = target[pathParts[i]];
    }
    target[pathParts[pathParts.length - 1]] = value;

    // Send to server
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify({ path, value })
    });

    if (!res.ok) throw new Error('Failed to update config');

    const updated = await res.json();
    
    // Update local account
    globalConfig.accounts[accountIndex] = updated;
    showToast('Configuration updated', 'success');
  } catch (error) {
    console.error('Config update error:', error);
    showToast('Failed to update configuration', 'error');
  }
}

async function updateRestSchedule(accountIndex, path, value) {
  try {
    const account = globalConfig.accounts[accountIndex];
    if (!account) {
      showToast('Account not found', 'error');
      return;
    }

    // Initialize restSchedule if it doesn't exist
    if (!account.restSchedule) {
      account.restSchedule = {
        shortBreaks: { enabled: false, workDuration: 30, breakDuration: 5 },
        dailyRest: { enabled: false, workHours: 8 }
      };
    }

    // Update local state
    const pathParts = path.split('.');
    let target = account.restSchedule;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) target[pathParts[i]] = {};
      target = target[pathParts[i]];
    }
    target[pathParts[pathParts.length - 1]] = value;

    // Send to server
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });

    if (!res.ok) throw new Error('Failed to update rest schedule');

    const updated = await res.json();
    
    // Update local account
    globalConfig.accounts[accountIndex] = updated;
    
    // Toggle nested controls visibility
    if (path === 'shortBreaks.enabled') {
      const workDuration = document.getElementById(`work-duration-${accountIndex}`);
      const breakDuration = document.getElementById(`break-duration-${accountIndex}`);
      if (workDuration) workDuration.style.display = value ? 'grid' : 'none';
      if (breakDuration) breakDuration.style.display = value ? 'grid' : 'none';
    } else if (path === 'dailyRest.enabled') {
      const activeHours = document.getElementById(`active-hours-${accountIndex}`);
      if (activeHours) activeHours.style.display = value ? 'grid' : 'none';
    }

    showToast('Rest schedule updated', 'success');
  } catch (error) {
    console.error('Rest schedule update error:', error);
    showToast('Failed to update rest schedule', 'error');
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
      const health = data.health || {};
      
      // 🔥 Detectar desincronización
      let statusClass = 'offline';
      let statusLabel = '● OFFLINE';
      
      if (isOnline) {
        if (health.needsReconnection) {
          statusClass = 'warning';
          statusLabel = '⚠ DESYNC';
          
          // Don't auto-reconnect - let user decide
          console.warn(`⚠️ Bot ${accountIndex} may be desynchronized`);
          
        } else if (!health.isHealthy) {
          statusClass = 'warning';
          statusLabel = '⚠ UNHEALTHY';
        } else if (!health.isResponsive) {
          statusClass = 'warning';
          statusLabel = '⚠ SLOW';
        } else {
          statusClass = 'online';
          statusLabel = '● ONLINE';
        }
      }
      
      statusIndicator.className = `bot-status-indicator ${statusClass}`;
      statusText.textContent = statusLabel;
      
      // 🔥 Añadir tooltip con info de salud
      if (health.timeSinceHeartbeat !== undefined) {
        const timeSince = Math.floor(health.timeSinceHeartbeat / 1000);
        statusText.title = `Last heartbeat: ${timeSince}s ago`;
      }
      
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
    if (!activeBotSections.has(index)) activeBotSections.set(index, 'bot-brain');
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

  ['bot-config', 'flipper-config', 'earnings-stats', 'bot-brain'].forEach(sectionName => {
    const element = document.getElementById(`${sectionName}-${accountIndex}`);
    if (element) element.classList.toggle('active', sectionName === section);
  });
  
  // Stop starfield if switching away from bot-brain
  if (section !== 'bot-brain') {
    stopStarfield(accountIndex);
  }
  
  if (section === 'earnings-stats') {
    stopBotIntervals(accountIndex);
    loadBotData(accountIndex);
    loadActivityLogs(accountIndex);
    startBotIntervals(accountIndex);
  } else if (section === 'bot-brain') {
    stopBotIntervals(accountIndex);
    // Initialize starfield and start brain polling
    setTimeout(() => {
      initStarfield(`brain-starfield-${accountIndex}`, accountIndex);
      loadBotBrain(accountIndex);
      startBrainPolling(accountIndex);
    }, 100);
  } else {
    stopBotIntervals(accountIndex);
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
  stopBrainPolling(accountIndex);
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
          ticks: { color: '#AAA', callback: (value) => (value >= 0 ? '+' : '') + formatNumber(value) }
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

async function loadActivityLogs(accountIndex) {
  const logsContainer = document.getElementById(`logs-container-${accountIndex}`);
  if (!logsContainer) return;

  // Check if user was scrolled to bottom before update
  const wasAtBottom = logsContainer.scrollHeight - logsContainer.clientHeight <= logsContainer.scrollTop + 1;

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
      if (containerEl) containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💰</p><p>No data yet</p></div>';
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
    shortBreaks: { enabled: false, workDuration: 30, breakDuration: 5 },
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
            <input type="range" class="slider" min="5" max="120" step="5" value="${restSchedule.shortBreaks.workDuration}"
              oninput="updateSliderValue(this, 'work-${index}', ' min')"
              onchange="updateRestSchedule(${index}, 'shortBreaks.workDuration', parseInt(this.value))"/>
            <div class="slider-value" id="work-${index}">${restSchedule.shortBreaks.workDuration} min</div>
            <div class="slider-labels">
              <span>5 min</span>
              <span>120 min</span>
            </div>
          </div>
        </div>

        <div class="config-item">
          <label class="config-label">Break Duration</label>
          <div class="slider-container">
            <input type="range" class="slider" min="1" max="30" step="1" value="${restSchedule.shortBreaks.breakDuration}"
              oninput="updateSliderValue(this, 'break-${index}', ' min')"
              onchange="updateRestSchedule(${index}, 'shortBreaks.breakDuration', parseInt(this.value))"/>
            <div class="slider-value" id="break-${index}">${restSchedule.shortBreaks.breakDuration} min</div>
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

function updateListButtonCount(accountIndex, listType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;
  
  const count = listType === 'whitelist' 
    ? (account.flips?.whitelist?.length || 0) 
    : (account.flips?.blacklistContaining?.length || 0);
  
  const button = document.querySelector(`.${listType}-btn .list-btn-count`);
  if (button) {
    button.textContent = `${count} items`;
  }
}

// ==================== LIST EDITOR MODAL ====================
function openListEditorModal(accountIndex, listType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;

  const list = listType === 'whitelist' ? (account.flips.whitelist || []) : (account.flips.blacklistContaining || []);
  const title = listType === 'whitelist' ? 'Whitelist Editor' : 'Blacklist Editor';
  const icon = listType === 'whitelist' ? '+' : '−';

  // Remove existing modal if any
  const existingModal = document.getElementById('list-editor-modal');
  if (existingModal) existingModal.remove();

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'list-editor-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-container list-editor-modal">
      <div class="modal-header">
        <div class="modal-title">
          <span class="modal-icon ${listType}">${icon}</span>
          <h3>${title}</h3>
        </div>
        <button class="modal-close" onclick="closeListEditorModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="item-editor">
          <div class="search-container">
            <input type="text" class="item-search" id="modal-${listType}-search-${accountIndex}"
              placeholder="Search items..." oninput="searchItemsModal(${accountIndex}, '${listType}', this.value)" autocomplete="off"/>
            <div class="search-results" id="modal-${listType}-results-${accountIndex}"></div>
          </div>
          <div class="items-grid" id="modal-${listType}-items-${accountIndex}">
            ${list.map(itemId => renderItemCard(itemId, accountIndex, listType, true)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on overlay click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeListEditorModal();
  });

  // Show modal with animation
  setTimeout(() => modal.classList.add('show'), 10);
}

function closeListEditorModal() {
  const modal = document.getElementById('list-editor-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

function searchItemsModal(accountIndex, listType, query) {
  const resultsDiv = document.getElementById(`modal-${listType}-results-${accountIndex}`);
  
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
    <div class="search-result-item" onclick="addItemToListModal(${accountIndex}, '${listType}', '${escapeHtml(item.id)}')">
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

// ==================== BOT BRAIN FUNCTIONS ====================

function renderBotBrain(account, index) {
  return `
    <div class="bot-brain-container" id="brain-container-${index}">
      <canvas id="brain-starfield-${index}" class="brain-starfield"></canvas>
      
      <div class="brain-overlay">
        <div class="brain-header">
          <div class="brain-header-left">
            <h3>🧠 Task Queue Brain</h3>
            <div id="brain-stats-${index}" class="brain-stats-inline">
              <!-- Compact stats will be populated here -->
            </div>
          </div>
          <div class="brain-header-controls">
            <button class="brain-fullscreen-btn" id="brain-fullscreen-${index}" title="Fullscreen" onclick="toggleBrainFullscreen(${index})">
              <span class="fullscreen-icon">⛶</span>
            </button>
            <div class="brain-status" id="brain-status-${index}">
              <span class="status-dot"></span>
              <span class="status-text">Idle</span>
            </div>
          </div>
        </div>

        <div class="brain-nodes-container" id="brain-nodes-${index}">
          <div class="brain-nodes-placeholder">
            <div class="placeholder-icon">🌌</div>
            <div class="placeholder-text">No active tasks</div>
          </div>
        </div>

        <div class="brain-legend">
          <div class="legend-item">
            <div class="legend-color" style="background: #3b82f6;"></div>
            <span>Enter Skyblock</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #fb923c;"></div>
            <span>Buy Order</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #22c55e;"></div>
            <span>Sell Order</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #a855f7;"></div>
            <span>Relist</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #fbbf24;"></div>
            <span>Claim</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #8b5cf6;"></div>
            <span>Check</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #6b7280;"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Starfield animation
const starfields = new Map();

function initStarfield(canvasId, accountIndex) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  
  // Scale context for high DPI
  ctx.scale(dpr, dpr);

  const stars = [];
  const numStars = 80;

  for (let i = 0; i < numStars; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 1 + 0.3, // Más pequeñas: entre 0.3 y 1.3
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      opacity: Math.random() * 0.3 + 0.2 // Más tenues: entre 0.2 y 0.5
    });
  }

  function animate() {
    // Fondo negro sólido sin estela
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(star => {
      star.x += star.vx;
      star.y += star.vy;

      if (star.x < 0 || star.x > canvas.width) star.vx *= -1;
      if (star.y < 0 || star.y > canvas.height) star.vy *= -1;

      // Glow effect más sutil
      const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.radius * 4);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${star.opacity * 0.2})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 4, 0, Math.PI * 2);
      ctx.fill();

      // Estrella central más brillante
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();
    });

    const animationId = requestAnimationFrame(animate);
    starfields.set(accountIndex, animationId);
  }

  animate();
}

function stopStarfield(accountIndex) {
  const animationId = starfields.get(accountIndex);
  if (animationId) {
    cancelAnimationFrame(animationId);
    starfields.delete(accountIndex);
  }
}

// Load and update brain data
async function loadBotBrain(index) {
  try {
    const response = await fetch(`/api/bot/${index}/brain`, {
      headers: { 'x-password': password }
    });
    
    const data = await response.json();
    console.log('[Bot Brain] API Response:', data);
    
    if (!data.success) {
      console.error('[Bot Brain] API Error:', data.error || data.message);
      renderBrainNodes(index, null);
      return;
    }

    console.log('[Bot Brain] Queue Length:', data.queueLength);
    console.log('[Bot Brain] Current Task:', data.currentTask);
    console.log('[Bot Brain] Queued Tasks:', data.queuedTasks?.length || 0);
    
    // Extra debugging
    if (data.currentTask) {
      console.log('[Bot Brain] ✅ SHOWING CURRENT TASK:', data.currentTask.metadata);
    }
    
    // Update status
    const statusEl = document.getElementById(`brain-status-${index}`);
    if (statusEl) {
      const statusText = statusEl.querySelector('.status-text');
      if (data.isProcessing) {
        statusText.textContent = 'Active';
      } else if (data.isPaused) {
        statusText.textContent = 'Paused';
      } else {
        statusText.textContent = 'Idle';
      }
    }
    
    renderBrainNodes(index, data);
  } catch (error) {
    console.error('[Bot Brain] Load error:', error);
    renderBrainNodes(index, null);
  }
}

// Brain visualization state
let brainState = {
  nodes: [],
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isDragging: false,
  lastX: 0,
  lastY: 0,
  animationFrame: null,
  previousNodes: [],
  previousTaskId: null
};

function renderBrainNodes(index, data) {
  const container = document.getElementById(`brain-nodes-${index}`);
  if (!container) return;

  if (!data || !data.success) {
    container.innerHTML = `
      <div class="brain-nodes-placeholder">
        <div class="placeholder-icon">🌌</div>
        <div class="placeholder-text">Bot offline</div>
      </div>
    `;
    return;
  }

  // Stats Section - Compact inline version
  const heartbeat = data.heartbeat || {};
  const isAlive = heartbeat.isAlive !== false;
  const timeSincePacket = heartbeat.timeSinceLastPacket || 0;
  
  // Calculate BPM (60-80 normal, decreasing to 0 as we approach 10s)
  const maxTimeout = 10000; // 10 seconds
  const normalBPM = 75; // Normal resting heart rate
  const timeRatio = Math.max(0, 1 - (timeSincePacket / maxTimeout));
  const bpm = Math.round(normalBPM * timeRatio);
  
  let ecgPoints, bpmColor, bpmClass;
  
  // If dead or BPM is 0, show flatline
  if (!isAlive || bpm === 0) {
    ecgPoints = '0,10 60,10'; // Straight flat line
    bpmColor = '#ef4444'; // Critical red
    bpmClass = 'flatline';
  } else {
    // Create realistic ECG pattern with quick rise and gradual fall
    const time = Date.now() / 100;
    const variation = Math.sin(time) * 0.15 + 1; // Subtle variation in amplitude
    
    // Create a single realistic heartbeat with proper P-QRS-T morphology
    const createBeat = (offset, scale = 1) => {
      const s = scale * variation;
      const baseline = 10;
      
      // P wave (small rise before main spike)
      const p1 = `${offset},${baseline}`;
      const p2 = `${offset+1.5},${baseline - 0.5*s}`;
      const p3 = `${offset+2},${baseline}`;
      
      // QRS complex (sharp spike - quick rise, quick fall)
      const q = `${offset+2.5},${baseline + 0.3*s}`; // Small dip
      const r = `${offset+3},${baseline - 7*s}`; // Sharp peak (fast rise)
      const sPt = `${offset+3.5},${baseline + 0.5*s}`; // Small dip after peak (fast fall)
      
      // ST segment and T wave (gradual fall)
      const st1 = `${offset+4},${baseline - 0.3*s}`;
      const t1 = `${offset+5},${baseline - 1.2*s}`;
      const t2 = `${offset+6},${baseline - 0.8*s}`;
      const t3 = `${offset+7},${baseline - 0.4*s}`;
      const t4 = `${offset+8},${baseline}`;
      
      // Rest (flat baseline)
      const rest = `${offset+11},${baseline}`;
      
      return `${p1} ${p2} ${p3} ${q} ${r} ${sPt} ${st1} ${t1} ${t2} ${t3} ${t4} ${rest}`;
    };
    
    // Create 5 beats across the 60px width with slight variations
    ecgPoints = [
      createBeat(0, 0.95),
      createBeat(12, 1.0),
      createBeat(24, 1.05),
      createBeat(36, 0.98),
      createBeat(48, 1.02)
    ].join(' ');
    
    // Determine BPM color based on heart rate
    if (bpm < 30) {
      bpmColor = '#ef4444'; // Critical red
      bpmClass = 'alive';
    } else if (bpm < 50) {
      bpmColor = '#f59e0b'; // Warning orange
      bpmClass = 'alive';
    } else {
      bpmColor = '#10b981'; // Normal green
      bpmClass = 'alive';
    }
  }
  
  const statsContainer = document.getElementById(`brain-stats-${index}`);
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="brain-heartbeat-compact">
        <svg class="ecg-mini ${bpmClass}" viewBox="0 0 60 20" preserveAspectRatio="none">
          <polyline class="ecg-path-mini" points="${ecgPoints}" stroke="${bpmColor}" />
        </svg>
        <span class="heartbeat-status ${bpmClass}" style="color: ${bpmColor}">
          ${bpm} BPM
        </span>
        <span class="heartbeat-separator">|</span>
        <span class="queue-info">Queue: ${data.queueLength} • Active: ${data.currentTask ? '1' : '0'}</span>
      </div>
    `;
  }

  // Build complete task list
  const tasks = [];
  
  // Get previous nodes if they exist (to maintain completed tasks)
  const previousCompleted = brainState.nodes.filter(n => n.status === 'completed');
  
  // Add completed tasks from previous state (keep last 5)
  previousCompleted.slice(-5).forEach(task => {
    tasks.push({
      ...task,
      status: 'completed'
    });
  });
  
  // If current task changed and there was a previous current task, mark it as completed
  if (data.currentTask?.id && brainState.previousTaskId && brainState.previousTaskId !== data.currentTask.id) {
    const previousCurrent = brainState.nodes.find(n => n.id === brainState.previousTaskId);
    if (previousCurrent && !tasks.find(t => t.id === brainState.previousTaskId)) {
      tasks.push({
        ...previousCurrent,
        status: 'completed'
      });
    }
  }
  
  // Limit to last 5 completed
  const completedTasks = tasks.filter(t => t.status === 'completed').slice(-5);
  tasks.length = 0;
  tasks.push(...completedTasks);
  
  // Add current task
  if (data.currentTask && 
      data.currentTask.metadata && 
      data.currentTask.metadata.type && 
      data.currentTask.metadata.type !== 'unknown') {
    tasks.push({
      ...data.currentTask,
      status: 'current',
      position: 0
    });
  }
  
  // Add ALL queued tasks
  if (data.queuedTasks && data.queuedTasks.length > 0) {
    data.queuedTasks.forEach((task, idx) => {
      if (task && 
          task.metadata && 
          task.metadata.type && 
          task.metadata.type !== 'unknown') {
        tasks.push({
          ...task,
          status: 'queued',
          position: idx + 1
        });
      }
    });
  }

  console.log('[Bot Brain] Rendering nodes:', {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    current: tasks.filter(t => t.status === 'current').length,
    queued: tasks.filter(t => t.status === 'queued').length
  });

  // Detect if this is initial render or an update
  const isInitialRender = brainState.nodes.length === 0;
  const taskChanged = brainState.previousTaskId && brainState.previousTaskId !== data.currentTask?.id && data.currentTask;
  
  // Update state
  brainState.previousNodes = [...brainState.nodes];
  brainState.nodes = tasks;
  brainState.previousTaskId = data.currentTask?.id;

  // Create or get canvas
  let canvas = container.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'brain-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);
    
    // Setup canvas with proper DPI scaling
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Scale context for high DPI
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    // Initial centering on CURRENT task
    brainState.offsetX = rect.width / 2;
    brainState.offsetY = rect.height / 2;
    
    // Setup controls
    setupBrainControls(canvas, container);
  }

  // If task changed, animate slide
  if (taskChanged && !isInitialRender) {
    animateSlideTransition(canvas);
  } else {
    renderBrainCanvas(canvas);
  }
}

function getTaskColor(taskType) {
  const typeUpper = taskType.toUpperCase();
  
  // User's specified colors
  if (typeUpper.includes('ENTER') && typeUpper.includes('SKYBLOCK')) return '#3b82f6'; // Azul
  if (typeUpper.includes('BUY') && !typeUpper.includes('RELIST')) return '#fb923c'; // Naranja (comprar)
  if (typeUpper.includes('RELIST')) return '#a855f7'; // Morado (cualquier relist)
  if (typeUpper.includes('CLAIM')) return '#fbbf24'; // Dorado
  if (typeUpper.includes('SELL') && !typeUpper.includes('RELIST')) return '#22c55e'; // Verde
  if (typeUpper.includes('CHECK')) return '#8b5cf6'; // Púrpura para check
  if (typeUpper.includes('FINISH')) return '#ef4444'; // Rojo
  
  return '#8b8b8b'; // Gris por defecto
}

function getTaskIcon(taskType, isCurrent, isCompleted) {
  if (isCompleted) return '✓';
  if (isCurrent) return '⟳';
  
  return '○'; // For queued tasks
}

function setupBrainControls(canvas, container) {
  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, brainState.scale * delta));
    
    // Zoom towards mouse position
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldX = (mouseX - brainState.offsetX) / brainState.scale;
    const worldY = (mouseY - brainState.offsetY) / brainState.scale;
    
    brainState.scale = newScale;
    brainState.offsetX = mouseX - worldX * brainState.scale;
    brainState.offsetY = mouseY - worldY * brainState.scale;
    
    renderBrainCanvas(canvas);
  });
  
  // Mouse drag to pan
  canvas.addEventListener('mousedown', (e) => {
    brainState.isDragging = true;
    brainState.lastX = e.clientX;
    brainState.lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (!brainState.isDragging) return;
    
    const dx = e.clientX - brainState.lastX;
    const dy = e.clientY - brainState.lastY;
    
    brainState.offsetX += dx;
    brainState.offsetY += dy;
    brainState.lastX = e.clientX;
    brainState.lastY = e.clientY;
    
    renderBrainCanvas(canvas);
  });
  
  canvas.addEventListener('mouseup', () => {
    brainState.isDragging = false;
    canvas.style.cursor = 'grab';
  });
  
  canvas.addEventListener('mouseleave', () => {
    brainState.isDragging = false;
    canvas.style.cursor = 'grab';
  });
  
  canvas.style.cursor = 'grab';
  
  // Reset view button
  const resetBtn = document.createElement('button');
  resetBtn.className = 'brain-reset-btn';
  resetBtn.innerHTML = '⌖ Reset View';
  resetBtn.onclick = () => {
    brainState.scale = 1;
    // Center on current node (which is at Y=0 in our coordinate system)
    const displayWidth = parseInt(canvas.style.width) || canvas.width;
    brainState.offsetX = displayWidth / 2;
    brainState.offsetY = displayWidth / 2; // Use width for square centering
    renderBrainCanvas(canvas);
  };
  container.appendChild(resetBtn);
  
  // Zoom controls
  const zoomControls = document.createElement('div');
  zoomControls.className = 'brain-zoom-controls';
  zoomControls.innerHTML = `
    <button class="zoom-btn" data-action="in">+</button>
    <button class="zoom-btn" data-action="out">−</button>
  `;
  container.appendChild(zoomControls);
  
  zoomControls.addEventListener('click', (e) => {
    const btn = e.target.closest('.zoom-btn');
    if (!btn) return;
    
    const delta = btn.dataset.action === 'in' ? 1.2 : 0.8;
    brainState.scale = Math.max(0.3, Math.min(3, brainState.scale * delta));
    renderBrainCanvas(canvas);
  });
}

function animateSlideTransition(canvas) {
  const startTime = Date.now();
  const duration = 800;
  const startOffset = brainState.offsetX;
  const displayWidth = parseInt(canvas.style.width) || canvas.width;
  const endOffset = displayWidth / 2;
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    
    brainState.offsetX = startOffset + (endOffset - startOffset) * eased;
    renderBrainCanvas(canvas);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }
  
  animate();
}

function renderBrainCanvas(canvas, fadeOldNode = 0) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const nodeWidth = 220;
  const nodeHeight = 140;
  const horizontalSpacing = 100; // Space between horizontal nodes (completed)
  const verticalSpacing = 80;    // Space between vertical nodes (queued)
  
  // Split nodes by status
  const completedNodes = brainState.nodes.filter(n => n.status === 'completed');
  const currentNode = brainState.nodes.find(n => n.status === 'current');
  const queuedNodes = brainState.nodes.filter(n => n.status === 'queued');
  
  ctx.save();
  ctx.translate(brainState.offsetX, brainState.offsetY);
  ctx.scale(brainState.scale, brainState.scale);
  
  // Arrow drawing function
  const drawArrow = (x1, y1, x2, y2, color, isActive) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = isActive ? 3 : 2;
    ctx.setLineDash(isActive ? [] : [5, 5]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Arrow head
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowSize = 12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - arrowSize * Math.cos(angle - Math.PI / 6),
      y2 - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      x2 - arrowSize * Math.cos(angle + Math.PI / 6),
      y2 - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
  };
  
  // Node drawing function
  const drawNode = (task, x, y, isCurrent, isCompleted) => {
    // ALWAYS gray for completed, colored for active/queued
    const color = isCompleted ? '#6b7280' : getTaskColor(task.metadata.type);
    
    // Node background with gradient
    const gradient = ctx.createLinearGradient(x, y, x, y + nodeHeight);
    
    if (isCompleted) {
      gradient.addColorStop(0, 'rgba(40,40,50,0.8)');
      gradient.addColorStop(1, 'rgba(30,30,40,0.8)');
      ctx.globalAlpha = fadeOldNode > 0 ? fadeOldNode : 0.6;
    } else if (isCurrent) {
      // Current node - colored with glow
      gradient.addColorStop(0, 'rgba(50,50,60,0.8)');
      gradient.addColorStop(1, 'rgba(40,40,50,0.8)');
      ctx.globalAlpha = 0.9;
    } else {
      // Queued - colored but darker
      gradient.addColorStop(0, 'rgba(50,50,60,0.8)');
      gradient.addColorStop(1, 'rgba(40,40,50,0.8)');
      ctx.globalAlpha = 0.9;
    }
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = color;
    ctx.lineWidth = isCurrent ? 4 : 2;
    ctx.setLineDash(isCurrent ? [] : [5, 5]);
    
    roundRect(ctx, x - nodeWidth/2, y - nodeHeight/2, nodeWidth, nodeHeight, 12);
    ctx.fill();
    ctx.stroke();
    
    ctx.globalAlpha = 1;
    
    // Status indicator bar at top
    ctx.fillStyle = color;
    roundRect(ctx, x - nodeWidth/2, y - nodeHeight/2, nodeWidth, 6, 12);
    ctx.fill();
    
    // Node content
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    
    const icon = getTaskIcon(task.metadata.type, isCurrent, isCompleted);
    const status = isCompleted ? 'DONE' : isCurrent ? 'PROCESSING' : 'QUEUED';
    
    ctx.fillText(`${icon} ${status}`, x, y - nodeHeight/2 + 30);
    
    ctx.font = 'bold 15px Arial';
    ctx.fillStyle = isCompleted ? '#9ca3af' : color;
    const taskTypeDisplay = task.metadata.type.replace(/_/g, ' ');
    ctx.fillText(truncateText(ctx, taskTypeDisplay, nodeWidth - 20), x, y - nodeHeight/2 + 55);
    
    ctx.font = '13px Arial';
    ctx.fillStyle = isCompleted ? '#9ca3af' : '#e0e0e0';
    const itemName = task.metadata.item || task.metadata.itemName || 'Processing...';
    ctx.fillText(truncateText(ctx, itemName, nodeWidth - 20), x, y - nodeHeight/2 + 75);
    
    if (task.metadata.amount) {
      ctx.fillStyle = isCompleted ? '#9ca3af' : '#b0b0b0';
      ctx.fillText(`Qty: ${task.metadata.amount}x`, x, y - nodeHeight/2 + 95);
    }
    if (task.metadata.price) {
      ctx.fillStyle = isCompleted ? '#9ca3af' : '#fbbf24';
      ctx.fillText(`${formatNumber(task.metadata.price)} coins`, x, y - nodeHeight/2 + 115);
    }
  };
  
  // Draw completed nodes HORIZONTALLY (left to right, ending at current position)
  completedNodes.forEach((task, idx) => {
    // Position to the left of current node (x < 0)
    const x = -(completedNodes.length - idx) * (nodeWidth + horizontalSpacing);
    const y = 0; // Same Y as current
    
    drawNode(task, x, y, false, true);
    
    // Arrow to next (or to current if last)
    if (idx === completedNodes.length - 1 && currentNode) {
      // Arrow to current node
      drawArrow(x + nodeWidth/2, y, -nodeWidth/2, y, '#6b7280', false);
    } else if (idx < completedNodes.length - 1) {
      // Arrow to next completed
      const nextX = -(completedNodes.length - (idx + 1)) * (nodeWidth + horizontalSpacing);
      drawArrow(x + nodeWidth/2, y, nextX - nodeWidth/2, y, '#6b7280', false);
    }
  });
  
  // Draw current node at origin (0, 0)
  if (currentNode) {
    drawNode(currentNode, 0, 0, true, false);
    
    // Arrow DOWN to first queued node
    if (queuedNodes.length > 0) {
      const firstQueuedY = nodeHeight + verticalSpacing;
      const currentColor = getTaskColor(currentNode.metadata.type);
      drawArrow(0, nodeHeight/2, 0, firstQueuedY - nodeHeight/2, currentColor, true);
    }
  }
  
  // Draw queued nodes VERTICALLY (downward from current)
  queuedNodes.forEach((task, idx) => {
    const x = 0; // Same X as current
    const y = (idx + 1) * (nodeHeight + verticalSpacing);
    
    drawNode(task, x, y, false, false);
    
    // Arrow DOWN to next queued
    if (idx < queuedNodes.length - 1) {
      const nextY = (idx + 2) * (nodeHeight + verticalSpacing);
      const taskColor = getTaskColor(task.metadata.type);
      drawArrow(0, y + nodeHeight/2, 0, nextY - nodeHeight/2, taskColor, false);
    }
  });
  
  ctx.restore();
  
  // Draw UI overlay - use style dimensions for positioning
  const displayWidth = parseInt(canvas.style.width) || canvas.width;
  const displayHeight = parseInt(canvas.style.height) || canvas.height;
  
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`Zoom: ${Math.round(brainState.scale * 100)}%`, 10, displayHeight - 30);
  ctx.fillText('Drag to pan • Scroll to zoom', 10, displayHeight - 10);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }
  
  let truncated = text;
  while (ctx.measureText(truncated + '...').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

// Brain polling
const brainPollingIntervals = new Map();
const brainTaskHistories = new Map(); // Store completed tasks with timestamps

function toggleBrainFullscreen(index) {
  const container = document.getElementById(`brain-container-${index}`);
  const fullscreenBtn = document.getElementById(`brain-fullscreen-${index}`);
  const icon = fullscreenBtn?.querySelector('.fullscreen-icon');
  
  if (!container) {
    console.error('Brain container not found:', `brain-container-${index}`);
    return;
  }
  
  if (!document.fullscreenElement) {
    container.requestFullscreen().then(() => {
      if (icon) icon.textContent = '⛶';
      // Resize canvas when entering fullscreen
      setTimeout(() => {
        const canvas = document.getElementById(`brain-nodes-${index}`)?.querySelector('canvas');
        if (canvas) {
          const rect = document.getElementById(`brain-nodes-${index}`).getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          canvas.style.width = rect.width + 'px';
          canvas.style.height = rect.height + 'px';
          
          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);
          
          // Re-center view
          brainState.offsetX = rect.width / 2;
          brainState.offsetY = rect.height / 2;
          
          renderBrainCanvas(canvas);
        }
      }, 100);
    }).catch(err => {
      console.error('Error entering fullscreen:', err);
      showToast('❌ Fullscreen not available', 'error');
    });
  } else {
    document.exitFullscreen();
    if (icon) icon.textContent = '⛶';
    // Resize canvas back when exiting fullscreen
    setTimeout(() => {
      const canvas = document.getElementById(`brain-nodes-${index}`)?.querySelector('canvas');
      if (canvas) {
        const nodesContainer = document.getElementById(`brain-nodes-${index}`);
        if (nodesContainer) {
          const rect = nodesContainer.getBoundingClientRect();
          const dpr = window.devicePixelRatio || 1;
          canvas.width = rect.width * dpr;
          canvas.height = rect.height * dpr;
          canvas.style.width = rect.width + 'px';
          canvas.style.height = rect.height + 'px';
          
          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);
          
          renderBrainCanvas(canvas);
        }
      }
    }, 100);
  }
}

function startBrainPolling(accountIndex) {
  if (brainPollingIntervals.has(accountIndex)) {
    clearInterval(brainPollingIntervals.get(accountIndex));
  }
  
  // Initialize task history for this account
  if (!brainTaskHistories.has(accountIndex)) {
    brainTaskHistories.set(accountIndex, []);
  }
  
  const interval = setInterval(() => {
    if (expandedBots.has(accountIndex) && activeBotSections.get(accountIndex) === 'bot-brain') {
      loadBotBrain(accountIndex);
    }
  }, 250); // Update 4 times per second for real-time visualization
  
  brainPollingIntervals.set(accountIndex, interval);
}

function stopBrainPolling(accountIndex) {
  if (brainPollingIntervals.has(accountIndex)) {
    clearInterval(brainPollingIntervals.get(accountIndex));
    brainPollingIntervals.delete(accountIndex);
  }
}











