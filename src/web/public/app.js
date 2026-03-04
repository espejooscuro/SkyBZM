



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
let moneyFlowCharts = new Map(); // 🔥 NEW: Money flow charts
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
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString('en-US');
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Get item image URL from Minecraft assets
function getItemImageUrl(item) {
  if (!item) {
    return 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png';
  }
  
  // If item has custom skin texture (for heads/skulls)
  if (item.skin && item.skin.value) {
    try {
      // Decode base64 skin data
      const skinData = JSON.parse(atob(item.skin.value));
      if (skinData.textures && skinData.textures.SKIN && skinData.textures.SKIN.url) {
        // Extract texture hash from URL (last part after /)
        const textureUrl = skinData.textures.SKIN.url;
        const textureHash = textureUrl.split('/').pop();
        
        // Use mc-heads.net for 3D head rendering
        return `https://mc-heads.net/head/${textureHash}`;
      }
    } catch (e) {
      console.warn('Failed to decode skin texture:', e);
    }
  }
  
  // Fallback to material-based texture from minecraft-assets GitHub repo
  let material = (item.material || 'STONE').toLowerCase();
  
  // Map old Minecraft IDs to new texture names
  const materialMap = {
    // Special items
    'skull_item': 'skeleton_skull',
    'web': 'cobweb',
    
    // Flowers - all types
    'yellow_flower': 'dandelion',
    'red_flower': 'poppy',
    'red_rose': 'poppy',
    'dandelion': 'dandelion',
    'poppy': 'poppy',
    'blue_orchid': 'blue_orchid',
    'allium': 'allium',
    'azure_bluet': 'azure_bluet',
    'red_tulip': 'red_tulip',
    'orange_tulip': 'orange_tulip',
    'white_tulip': 'white_tulip',
    'pink_tulip': 'pink_tulip',
    'oxeye_daisy': 'oxeye_daisy',
    'sunflower': 'sunflower',
    'lilac': 'lilac',
    'rose_bush': 'rose_bush',
    'peony': 'peony',
    'tall_grass': 'tall_grass',
    'large_fern': 'large_fern',
    'cornflower': 'cornflower',
    'lily_of_the_valley': 'lily_of_the_valley',
    'wither_rose': 'wither_rose',
    
    // Wood variants
    'log': 'oak_log',
    'log_2': 'acacia_log',
    'wood': 'oak_planks',
    
    // Glass
    'stained_glass': 'white_stained_glass',
    'stained_glass_pane': 'white_stained_glass_pane',
    'thin_glass': 'glass_pane',
    
    // Wool and carpet
    'wool': 'white_wool',
    'carpet': 'white_carpet',
    
    // Clay
    'stained_clay': 'white_terracotta',
    'hard_clay': 'terracotta',
    
    // Food items
    'ink_sack': 'ink_sac',
    'carrot_item': 'carrot',
    'potato_item': 'potato',
    'baked_potato': 'baked_potato',
    'raw_fish': 'cod',
    'cooked_fish': 'cooked_cod',
    'pork': 'porkchop',
    'grilled_pork': 'cooked_porkchop',
    'raw_beef': 'beef',
    'cooked_beef': 'cooked_beef',
    'raw_chicken': 'chicken',
    'cooked_chicken': 'cooked_chicken',
    
    // Seeds and crops
    'seeds': 'wheat_seeds',
    'melon_seeds': 'melon_seeds',
    'pumpkin_seeds': 'pumpkin_seeds',
    'nether_stalk': 'nether_wart',
    'melon': 'melon_slice',
    
    // Saplings - all types
    'sapling': 'oak_sapling',
    'spruce_sapling': 'spruce_sapling',
    'birch_sapling': 'birch_sapling',
    'jungle_sapling': 'jungle_sapling',
    'acacia_sapling': 'acacia_sapling',
    'dark_oak_sapling': 'dark_oak_sapling',
    
    // Slabs - all types
    'step': 'stone_slab',
    'wood_step': 'oak_slab',
    'stone_slab': 'stone_slab',
    'stone_slab2': 'red_sandstone_slab',
    'wooden_slab': 'oak_slab',
    'oak_slab': 'oak_slab',
    'spruce_slab': 'spruce_slab',
    'birch_slab': 'birch_slab',
    'jungle_slab': 'jungle_slab',
    'acacia_slab': 'acacia_slab',
    'dark_oak_slab': 'dark_oak_slab',
    
    // Golden tools
    'gold_sword': 'golden_sword',
    'gold_pickaxe': 'golden_pickaxe',
    'gold_axe': 'golden_axe',
    'gold_spade': 'golden_shovel',
    'gold_hoe': 'golden_hoe',
    'golden_sword': 'golden_sword',
    'golden_pickaxe': 'golden_pickaxe',
    'golden_axe': 'golden_axe',
    'golden_shovel': 'golden_shovel',
    'golden_spade': 'golden_shovel',
    'golden_hoe': 'golden_hoe',
    
    // Golden armor
    'gold_helmet': 'golden_helmet',
    'gold_chestplate': 'golden_chestplate',
    'gold_leggings': 'golden_leggings',
    'gold_boots': 'golden_boots',
    'golden_helmet': 'golden_helmet',
    'golden_chestplate': 'golden_chestplate',
    'golden_leggings': 'golden_leggings',
    'golden_boots': 'golden_boots',
    
    // Wooden tools
    'wood_sword': 'wooden_sword',
    'wood_pickaxe': 'wooden_pickaxe',
    'wood_axe': 'wooden_axe',
    'wood_spade': 'wooden_shovel',
    'wood_hoe': 'wooden_hoe',
    'wooden_sword': 'wooden_sword',
    'wooden_pickaxe': 'wooden_pickaxe',
    'wooden_axe': 'wooden_axe',
    'wooden_shovel': 'wooden_shovel',
    'wooden_spade': 'wooden_shovel',
    'wooden_hoe': 'wooden_hoe',
    
    // Other tools (stone, iron, diamond)
    'stone_spade': 'stone_shovel',
    'iron_spade': 'iron_shovel',
    'diamond_spade': 'diamond_shovel',
    
    // Special items
    'enchanted_book': 'enchanted_book',
    'golden_carrot': 'golden_carrot',
    'speckled_melon': 'glistering_melon_slice',
    'sulphur': 'gunpowder',
    'mycel': 'mycelium',
    'ender_stone': 'end_stone',
    'grass': 'grass_block',
    'quartz_ore': 'nether_quartz_ore',
    'nether_brick_item': 'nether_brick',
    'nether_fence': 'nether_brick_fence',
    'enchantment_table': 'enchanting_table',
    'brewing_stand_item': 'brewing_stand',
    'cauldron_item': 'cauldron',
    
    // Miscellaneous
    'monster_egg': 'infested_stone',
    'huge_mushroom_1': 'brown_mushroom_block',
    'huge_mushroom_2': 'red_mushroom_block',
    'iron_fence': 'iron_bars',
    'snow': 'snow_block',
    'snow_layer': 'snow',
    'water_lily': 'lily_pad'
  };
  
  if (materialMap[material]) {
    material = materialMap[material];
  }
  
  // Remove data values
  material = material.split(':')[0];
  
  // Use GitHub for items (they look good as flat textures)
  const baseUrl = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures';
  return `${baseUrl}/item/${material}.png`;
}

// Helper to get block fallback URL
function getBlockImageUrl(material) {
  const materialMap = {
    'log': 'oak_log',
    'log_2': 'acacia_log',
    'ender_stone': 'end_stone',
    'mycel': 'mycelium',
    'grass': 'grass_block',
    'quartz_ore': 'nether_quartz_ore'
  };
  
  const mapped = materialMap[material] || material;
  const cleanMaterial = mapped.split(':')[0];
  
  // Use visage for 3D block rendering
  return `https://visage.surgeplay.com/bust/512/${cleanMaterial}`;
}

// Update slider value display
function updateSliderValue(slider, targetId, suffix = '') {
  const target = document.getElementById(targetId);
  if (target) {
    const value = slider.value;
    target.textContent = value + suffix;
  }
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
    console.log('🔄 Loading Skyblock items from Hypixel API...');
    const res = await fetch('https://api.hypixel.net/resources/skyblock/items');
    
    if (!res.ok) {
      throw new Error(`API returned status ${res.status}`);
    }
    
    const data = await res.json();
    skyblockItems = data.items || [];
    console.log(`✅ Loaded ${skyblockItems.length} Skyblock items`);
    
    // Debug: Log first item structure
    if (skyblockItems.length > 0) {
      console.log('📦 Sample item structure:', skyblockItems[0]);
    }
    
    if (skyblockItems.length === 0) {
      console.warn('⚠️ No items loaded from API');
    }
  } catch (error) {
    console.error('❌ Error loading Skyblock items:', error);
    showToast('Failed to load Skyblock items', 'error');
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
  moneyFlowCharts.clear(); // 🔥 NEW
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
    <div class="config-section-wrapper" style="display: grid; grid-template-columns: 1fr; gap: 24px;">
      <!-- Bot Parameters -->
      <div class="config-section collapsible">
        <div class="config-section-header" onclick="toggleConfigSection(this)" style="cursor: pointer;">
          <h3 style="display: flex; align-items: center; gap: 12px; margin: 0;">
            <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: #9b6ff7;">
              <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.32-.61-.32l-2.21 0c-.12 0-.49.18-.5 2v14c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/>
            </svg>
            Bot Configuration
          </h3>
          <span class="config-expand">▼</span>
        </div>
        <div class="config-section-content" style="display: block;">
          <div style="padding: 20px 0;">
            <!-- Short Breaks -->
            <div style="margin-bottom: 24px;">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(12, 24, 42, 0.4); border: 1px solid rgba(129, 62, 242, 0.15); border-radius: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #9b6ff7;">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  <div>
                    <div style="font-size: 14px; font-weight: 600; color: #fff;">Short Breaks</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Take breaks during work sessions</div>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${restSchedule.shortBreaks.enabled ? 'checked' : ''} 
                    onchange="toggleBotOption(${index}, 'shortBreaks', this.checked); updateConfig(${index}, 'restSchedule.shortBreaks.enabled', this.checked)">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="toggle-content ${restSchedule.shortBreaks.enabled ? 'active' : ''}" id="shortBreaks-${index}">
                <div class="config-sliders-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
                  <div class="slider-card">
                    <div class="slider-card-header">
                      <span class="slider-label">Work Duration</span>
                      <span class="slider-current-value" id="bot-work-duration-${index}">${restSchedule.shortBreaks.workDuration} min</span>
                    </div>
                    <div class="slider-track-wrapper">
                      <input type="range" class="modern-slider" style="--slider-color: #9b6ff7;"
                        min="10" max="120" step="5" value="${restSchedule.shortBreaks.workDuration}"
                        oninput="updateSliderValue(this, 'bot-work-duration-${index}', ' min')"
                        onchange="updateConfig(${index}, 'restSchedule.shortBreaks.workDuration', parseInt(this.value))"/>
                      <div class="slider-range-labels">
                        <span>10 min</span>
                        <span>120 min</span>
                      </div>
                    </div>
                  </div>
                  <div class="slider-card">
                    <div class="slider-card-header">
                      <span class="slider-label">Break Duration</span>
                      <span class="slider-current-value" id="bot-break-duration-${index}">${restSchedule.shortBreaks.breakDuration} min</span>
                    </div>
                    <div class="slider-track-wrapper">
                      <input type="range" class="modern-slider" style="--slider-color: #8b5cf6;"
                        min="1" max="30" step="1" value="${restSchedule.shortBreaks.breakDuration}"
                        oninput="updateSliderValue(this, 'bot-break-duration-${index}', ' min')"
                        onchange="updateConfig(${index}, 'restSchedule.shortBreaks.breakDuration', parseInt(this.value))"/>
                      <div class="slider-range-labels">
                        <span>1 min</span>
                        <span>30 min</span>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Daily Rest -->
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(12, 24, 42, 0.4); border: 1px solid rgba(129, 62, 242, 0.15); border-radius: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #9b6ff7;">
                    <path d="M17 10H7v2h10v-2zm2-7h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zm-5-5H7v-2h7v2z"/>
                  </svg>
                  <div>
                    <div style="font-size: 14px; font-weight: 600; color: #fff;">Daily Rest</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Set maximum work hours per day</div>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${restSchedule.dailyRest.enabled ? 'checked' : ''} 
                    onchange="toggleBotOption(${index}, 'dailyRest', this.checked); updateConfig(${index}, 'restSchedule.dailyRest.enabled', this.checked)">
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="toggle-content ${restSchedule.dailyRest.enabled ? 'active' : ''}" id="dailyRest-${index}">
                <div class="slider-card">
                  <div class="slider-card-header">
                    <span class="slider-label">Work Hours per Day</span>
                    <span class="slider-current-value" id="bot-work-hours-${index}">${restSchedule.dailyRest.workHours}h work, ${dailyRestHours}h rest</span>
                  </div>
                  <div class="slider-track-wrapper">
                    <input type="range" class="modern-slider" style="--slider-color: #7c3aed;"
                      min="1" max="23" step="1" value="${restSchedule.dailyRest.workHours}"
                      oninput="updateSliderValue(this, 'bot-work-hours-${index}', 'h work, ' + (24 - this.value) + 'h rest')"
                      onchange="updateConfig(${index}, 'restSchedule.dailyRest.workHours', parseInt(this.value))"/>
                    <div class="slider-range-labels">
                      <span>1 hour</span>
                      <span>23 hours</span>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SOCKS5 Proxy -->
            <div style="margin-top: 24px;">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 16px; background: rgba(12, 24, 42, 0.4); border: 1px solid rgba(129, 62, 242, 0.15); border-radius: 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #9b6ff7;">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                  <div>
                    <div style="font-size: 14px; font-weight: 600; color: #fff;">SOCKS5 Proxy</div>
                    <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Route bot traffic through proxy server</div>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" ${account.proxy ? 'checked' : ''} 
                    onchange="toggleBotOption(${index}, 'proxy', this.checked); if (this.checked) { updateProxyConfig(${index}, 'host', ''); } else { updateConfig(${index}, 'proxy', null); }">
                  <span class="toggle-slider"></span>
                </label>
              </div>

              <div class="toggle-content ${account.proxy ? 'active' : ''}" id="proxy-${index}">
                <div style="background: rgba(12, 24, 42, 0.4); border: 1px solid rgba(129, 62, 242, 0.15); border-radius: 10px; padding: 20px; margin-top: 12px;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">

                    <!-- Host -->
                    <div class="input-group">
                      <label class="input-label" style="display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px;">
                        Host
                      </label>
                      <input type="text" 
                        class="config-input" 
                        placeholder="e.g., 62.164.246.140"
                        value="${account.proxy?.host || ''}"
                        onchange="updateProxyConfig(${index}, 'host', this.value)"
                        style="width: 100%; padding: 12px; background: rgba(5, 16, 35, 0.6); border: 1px solid rgba(129, 62, 242, 0.2); border-radius: 8px; color: #fff; font-size: 14px; transition: all 0.3s ease;">
                    </div>

                    <!-- Port -->
                    <div class="input-group">
                      <label class="input-label" style="display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px;">
                        Port
                      </label>
                      <input type="number" 
                        class="config-input" 
                        placeholder="e.g., 7865"
                        value="${account.proxy?.port || ''}"
                        onchange="updateProxyConfig(${index}, 'port', parseInt(this.value))"
                        style="width: 100%; padding: 12px; background: rgba(5, 16, 35, 0.6); border: 1px solid rgba(129, 62, 242, 0.2); border-radius: 8px; color: #fff; font-size: 14px; transition: all 0.3s ease;">
                    </div>

                    <!-- Username -->
                    <div class="input-group">
                      <label class="input-label" style="font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; display: block;">
                        Username
                      </label>
                      <input type="text" 
                        class="config-input" 
                        placeholder="Optional"
                        value="${account.proxy?.username || ''}"
                        onchange="updateProxyConfig(${index}, 'username', this.value)"
                        style="width: 100%; padding: 12px; background: rgba(5, 16, 35, 0.6); border: 1px solid rgba(129, 62, 242, 0.2); border-radius: 8px; color: #fff; font-size: 14px; transition: all 0.3s ease;">
                    </div>

                    <!-- Password -->
                    <div class="input-group">
                      <label class="input-label" style="font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; display: block;">
                        Password
                      </label>
                      <input type="password" 
                        class="config-input" 
                        placeholder="Optional"
                        value="${account.proxy?.password || ''}"
                        onchange="updateProxyConfig(${index}, 'password', this.value)"
                        style="width: 100%; padding: 12px; background: rgba(5, 16, 35, 0.6); border: 1px solid rgba(129, 62, 242, 0.2); border-radius: 8px; color: #fff; font-size: 14px; transition: all 0.3s ease;">
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="config-actions" style="display: flex; gap: 12px; margin-top: 12px;">
        <button class="btn btn-danger" onclick="stopBot(${index})" style="flex: 1; background: rgba(239, 68, 68, 0.15); border: 1.5px solid rgba(239, 68, 68, 0.4); color: #ef4444; padding: 14px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
          <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor; vertical-align: middle; margin-right: 8px;">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          Stop Bot
        </button>
        <button class="btn btn-primary" onclick="restartBot(${index})" style="flex: 1; background: rgba(129, 62, 242, 0.2); border: 1.5px solid rgba(129, 62, 242, 0.5); color: #9b6ff7; padding: 14px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
          <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: currentColor; vertical-align: middle; margin-right: 8px;">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-2zm0 16H5V8h14v11zm-5-5H7v-2h7v2z"/>
          </svg>
          Restart Bot
        </button>
      </div>
    </div>
  `;
}


function renderFlipperConfigSection(account, index) {
  const flips = account.flipConfigs || [];
  
  return `
    <div class="flips-container">
      <div class="add-flip-btn" onclick="openAddFlipModal(${index})">
        <div class="add-flip-icon">+</div>
        <div class="add-flip-text">Add Flip</div>
      </div>
      ${flips.map((flip, flipIndex) => renderFlipCard(account, index, flip, flipIndex)).join('')}
    </div>
  `;
}

function renderFlipCard(account, accountIndex, flip, flipIndex) {
  const flipType = flip.type || 'SELL_ORDER';
  
  const typeColors = {
    'SELL_ORDER': '#00ff88',
    'KAT': '#fbbf24',
    'FORGE': '#ef4444',
    'NPC': '#3b82f6',
    'CRAFT': '#a855f7'
  };
  
  const typeLabels = {
    'SELL_ORDER': 'Sell Order',
    'KAT': 'Kat Flip',
    'FORGE': 'Forge Flip',
    'NPC': 'NPC Flip',
    'CRAFT': 'Craft Flip'
  };
  
  const typeIcons = {
    'SELL_ORDER': `<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-2.44.85-2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>`,
    'KAT': `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    'FORGE': `<svg viewBox="0 0 24 24"><path d="M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>`,
    'NPC': `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`,
    'CRAFT': `<svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>`
  };
  
  const color = typeColors[flipType] || '#888';
  const label = typeLabels[flipType] || flipType;
  const icon = typeIcons[flipType] || typeIcons['SELL_ORDER'];
  

  // For NPC flips, use item image if available

  let headerIcon = icon;

  if (flipType === 'NPC' && flip.item) {

    const item = skyblockItems.find(i => i.id === flip.item);

    if (item) {

      const imageUrl = getItemImageUrl(item);

      const material = (item.material || 'stone').toLowerCase().split(':')[0];

      const blockFallback = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/block/${material}.png`;

      headerIcon = `<img src="${imageUrl}" alt="${escapeHtml(item.name)}" style="width: 20px; height: 20px; image-rendering: pixelated;" onerror="this.onerror=null; this.src='${blockFallback}'"/>`;

    }

  }
  
  // For NPC flips, show different stats
  let statsHTML;
  if (flipType === 'NPC') {
    const currentItem = flip.item || '';
    let itemDisplay = 'Not set';
    let itemImageUrl = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png';
    
    if (currentItem) {
      const item = skyblockItems.find(i => i.id === currentItem);
      if (item) {
        itemDisplay = item.name;
        itemImageUrl = getItemImageUrl(item);
      } else {
        itemDisplay = currentItem;
      }
    }
    
    statsHTML = `
      <div class="flip-stat">
        <span class="flip-stat-label">Item</span>
        <span class="flip-stat-value">${escapeHtml(itemDisplay)}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Force Sell</span>
        <span class="flip-stat-value">${flip.forceSellAfter || 1} min</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Status</span>
        <span class="flip-stat-value ${flip.enabled ? 'positive' : 'warning'}">${flip.enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
    `;
  } else {
    const whitelistCount = flip.whitelist?.length || 0;
    const blacklistCount = flip.blacklistContaining?.length || 0;
    const maxFlips = flip.maxFlips || 0;
    const budget = flip.budget || 0;
    
    statsHTML = `
      <div class="flip-stat">
        <span class="flip-stat-label">Whitelist</span>
        <span class="flip-stat-value positive">${whitelistCount}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Blacklist</span>
        <span class="flip-stat-value warning">${blacklistCount}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Max Flips</span>
        <span class="flip-stat-value">${maxFlips}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Budget</span>
        <span class="flip-stat-value">${formatNumber(budget)}</span>
      </div>
    `;
  }
  
  // For NPC flips, don't show whitelist/blacklist buttons
  let footerHTML;
  if (flipType === 'NPC') {
    footerHTML = `
      <div class="flip-card-footer" style="padding: 16px; text-align: center; color: rgba(255,255,255,0.6);">
        <span>Click to configure</span>
      </div>
    `;
  } else {
    const whitelistCount = flip.whitelist?.length || 0;
    const blacklistCount = flip.blacklistContaining?.length || 0;
    
    footerHTML = `
      <div class="flip-card-footer">
        <button class="flip-footer-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'whitelist')">
          <div class="list-btn-icon">
            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <div class="list-btn-content">
            <div class="list-btn-label">Whitelist</div>
            <div class="list-btn-count">${whitelistCount} items</div>
          </div>
        </button>
        <button class="flip-footer-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'blacklistContaining')">
          <div class="list-btn-icon">
            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </div>
          <div class="list-btn-content">
            <div class="list-btn-label">Blacklist</div>
            <div class="list-btn-count">${blacklistCount} items</div>
          </div>
        </button>
      </div>
    `;
  }
  
  return `
    <div class="flip-card" data-flip-index="${flipIndex}" onclick="openFlipEditModal(${accountIndex}, ${flipIndex})">
      <div class="flip-card-header">
        <div class="flip-card-title">
          <div class="flip-type-icon">${headerIcon}</div>
          <h3>${label}</h3>
        </div>
        <div class="flip-type-badge" style="background: ${color}; color: #000;">
          ACTIVE
        </div>
      </div>
      
      <div class="flip-card-body">
        ${statsHTML}
      </div>
      
      ${footerHTML}
    </div>
  `;
}

// Add Flip Modal
function openAddFlipModal(accountIndex) {
  const modal = document.createElement('div');
  modal.className = 'flip-modal';
  modal.id = 'add-flip-modal';
  
  modal.innerHTML = `
    <div class="flip-modal-content">
      <div class="flip-modal-header">
        <h2 class="flip-modal-title">
          <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: #9b6ff7;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Add New Flip
        </h2>
        <button class="flip-modal-close" onclick="closeAddFlipModal()">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 6.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="flip-modal-body">
        <div class="flip-type-selector">
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'SELL_ORDER')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-2.44.85-2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>
            </div>
            <div class="flip-type-option-label">Sell Order</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'KAT')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <div class="flip-type-option-label">Kat Flip</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'FORGE')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>
            </div>
            <div class="flip-type-option-label">Forge Flip</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'NPC')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <div class="flip-type-option-label">NPC Flip</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'CRAFT')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
            </div>
            <div class="flip-type-option-label">Craft Flip</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.style.opacity = '1', 10);
}

function closeAddFlipModal() {
  const modal = document.getElementById('add-flip-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }
}

async function selectNewFlipType(accountIndex, flipType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;
  
  if (!account.flipConfigs) account.flipConfigs = [];
  
  let newFlip;
  
  if (flipType === 'NPC') {
    newFlip = {
      type: flipType,
      enabled: true,
      item: "",
      forceSellAfter: 1
    };
  } else {
    newFlip = {
      type: flipType,
      enabled: true,
      maxFlips: 5,
      budget: 10000000,
      minProfit: 100000,
      whitelist: [],
      blacklistContaining: []
    };
  }
  
  account.flipConfigs.push(newFlip);
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      closeAddFlipModal();
      showToast('✅ Flip created successfully', 'success');
    } else {
      showToast('❌ Failed to create flip', 'error');
    }
  } catch (error) {
    console.error('Error creating flip:', error);
    showToast('❌ Failed to create flip', 'error');
  }
}

// Edit Flip Modal
function openFlipEditModal(accountIndex, flipIndex) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const flipType = flip.type || 'SELL_ORDER';
  
  const modal = document.createElement('div');
  modal.className = 'flip-modal';
  modal.id = 'edit-flip-modal';
  
  modal.innerHTML = `
    <div class="flip-modal-content">
      <div class="flip-modal-header">
        <div style="flex: 1;">
          <h2 class="flip-modal-title">Configure Flip</h2>
          <p style="color: rgba(255, 255, 255, 0.5); font-size: 13px; margin: 4px 0 0 0;">${flipType.replace('_', ' ')}</p>
        </div>
        <button class="flip-modal-close" onclick="closeFlipEditModal()">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 6.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="flip-modal-body">
        <div style="padding: 24px 32px;">
          <!-- Enable Toggle at Top -->
          <div class="flip-enable-section">
            <div class="flip-enable-info">
              <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;">
                <path d="M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z"/>
              </svg>
              <div>
                <span class="flip-enable-label">Flip Status</span>
                <span class="flip-enable-desc">Enable or disable this flip configuration</span>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${flip.enabled ? 'checked' : ''} 
                onchange="updateConfig(${accountIndex}, 'flipConfigs.${flipIndex}.enabled', this.checked)"/>
              <span class="toggle-slider"></span>
            </label>
          </div>

          ${renderFlipConfigFields(flip, accountIndex, flipIndex)}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.style.opacity = '1', 10);
  
  // Setup NPC item selector event listener AFTER modal is added to DOM
  if (flipType === 'NPC') {
    setTimeout(() => {
      const selector = document.getElementById(`npc-item-display-${accountIndex}-${flipIndex}`);
      const searchInput = document.getElementById(`npc-item-search-${accountIndex}-${flipIndex}`);
      
      if (selector && searchInput) {
        selector.addEventListener('click', function() {
          if (searchInput.style.display === 'none' || searchInput.style.display === '') {
            searchInput.style.display = 'block';
            searchInput.focus();
            searchInput.value = '';
          } else {
            searchInput.style.display = 'none';
            document.getElementById(`npc-item-results-${accountIndex}-${flipIndex}`).style.display = 'none';
          }
        });
        
        // Setup search input
        searchInput.addEventListener('input', function() {
          searchNPCItem(accountIndex, flipIndex, this.value);
        });
      }
    }, 100);
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFlipEditModal();
  });
}

function closeFlipEditModal() {
  const modal = document.getElementById('edit-flip-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }
}

function renderFlipConfigFields(flip, accountIndex, flipIndex) {
  const flipType = flip.type || 'SELL_ORDER';
  
  // NPC Flip specific configuration
  if (flipType === 'NPC') {
    const currentItem = flip.item || '';
    let itemDisplay = 'Not set';
    let itemImageUrl = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png';
    
    if (currentItem) {
      const item = skyblockItems.find(i => i.id === currentItem);
      if (item) {
        itemDisplay = item.name;
        itemImageUrl = getItemImageUrl(item);
      } else {
        itemDisplay = currentItem;
      }
    }
    
    return `
      <!-- Configuration Parameters for NPC Flip -->
      <div class="config-params-section">
        <div class="section-title-bar">
          <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #3b82f6;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          <span>NPC Flip Configuration</span>
        </div>
        
        <!-- Item Selector -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; color: #fff; font-size: 14px; font-weight: 600;">Item to Sell</label>
          <div style="position: relative;">
            <div id="npc-item-display-${accountIndex}-${flipIndex}" class="npc-item-selector" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(12, 24, 42, 0.6); border: 1px solid rgba(129, 62, 242, 0.3); border-radius: 8px; cursor: pointer;">
              <img src="${itemImageUrl}" alt="${escapeHtml(itemDisplay)}" style="width: 32px; height: 32px; image-rendering: pixelated;" 
                onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png'"/>
              <div style="flex: 1;">
                <div style="color: #fff; font-weight: 500;">${escapeHtml(itemDisplay)}</div>
                ${currentItem ? `<div style="color: rgba(255,255,255,0.5); font-size: 12px;">${escapeHtml(currentItem)}</div>` : ''}
              </div>
              <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: rgba(255,255,255,0.5);">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <input 
              type="text" 
              class="config-input" 
              placeholder="Search for an item..."
              id="npc-item-search-${accountIndex}-${flipIndex}"
              style="width: 100%; margin-top: 8px; display: none;"
            />
            <div class="flip-search-results" id="npc-item-results-${accountIndex}-${flipIndex}" style="display: none;"></div>
          </div>
        </div>
        
        <div class="config-sliders-grid">
          <div class="slider-card">
            <div class="slider-card-header">
              <span class="slider-label">Force Sell After</span>
              <span class="slider-current-value" id="flip-forceSellAfter-${accountIndex}-${flipIndex}">${flip.forceSellAfter || 1} min</span>
            </div>
            <div class="slider-track-wrapper">
              <input type="range" class="modern-slider" 
                style="--slider-color: #3b82f6;"
                min="1" max="10" step="1" value="${flip.forceSellAfter || 1}"
                oninput="updateSliderValue(this, 'flip-forceSellAfter-${accountIndex}-${flipIndex}', ' min')"
                onchange="updateNPCFlipConfigAndRefresh(${accountIndex}, ${flipIndex}, 'forceSellAfter', parseInt(this.value))"/>
              <div class="slider-range-labels">
                <span>1 min</span>
                <span>10 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="config-actions" style="margin-top: 32px;">
        <button class="btn btn-danger" onclick="deleteFlip(${accountIndex}, ${flipIndex})">
          <svg viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          Delete Flip
        </button>
        <button class="btn btn-primary" onclick="closeFlipEditModal()">
          <svg viewBox="0 0 24 24">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
          Save Changes
        </button>
      </div>
    `;
  }
  
  // Sell Order Flip configuration (original)
  const whitelistCount = flip.whitelist?.length || 0;
  const blacklistCount = flip.blacklistContaining?.length || 0;
  
  const configs = [
    { key: 'maxBuyPrice', label: 'Max Buy Price', min: 100000, max: 50000000, step: 100000, unit: ' coins', minLabel: '100K', maxLabel: '50M', color: '#9b6ff7', value: flip.maxBuyPrice || 0 },
    { key: 'minProfit', label: 'Min Profit', min: 1000, max: 1000000, step: 1000, unit: ' coins', minLabel: '1K', maxLabel: '1M', color: '#8b5cf6', value: flip.minProfit || 0 },
    { key: 'minVolume', label: 'Min Volume', min: 1, max: 100000, step: 1, unit: ' sales/day', minLabel: '1', maxLabel: '100K', color: '#7c3aed', value: flip.minVolume || 0 },
    { key: 'maxFlips', label: 'Max Flips', min: 1, max: 20, step: 1, unit: '', minLabel: '1', maxLabel: '20', color: '#6d28d9', value: flip.maxFlips || 0 },
    { key: 'maxRelist', label: 'Max Relist', min: 1, max: 10, step: 1, unit: '', minLabel: '1', maxLabel: '10', color: '#5b21b6', value: flip.maxRelist || 0 },
    { key: 'maxBuyRelist', label: 'Max Buy Relist', min: 1, max: 10, step: 1, unit: '', minLabel: '1', maxLabel: '10', color: '#4c1d95', value: flip.maxBuyRelist || 0 },
    { key: 'minOrder', label: 'Min Order', min: 1, max: 1000, step: 1, unit: ' items', minLabel: '1', maxLabel: '1K', color: '#813ef2', value: flip.minOrder || 0 },
    { key: 'maxOrder', label: 'Max Order', min: 10, max: 10000, step: 10, unit: ' items', minLabel: '10', maxLabel: '10K', color: '#9b6ff7', value: flip.maxOrder || 0 },
    { key: 'minSpread', label: 'Min Spread', min: 0, max: 100, step: 1, unit: '%', minLabel: '0%', maxLabel: '100%', color: '#a78bfa', value: flip.minSpread || 0 }
  ];
  
  return `
    <!-- Configuration Parameters -->
    <div class="config-params-section">
      <div class="section-title-bar">
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #9b6ff7;">
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.32-.61-.32l-2.21 0c-.12 0-.49.18-.5 2v14c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/>
        </svg>
        <span>Flip Parameters</span>
      </div>
      <div class="config-sliders-grid">
        ${configs.map(cfg => `
          <div class="slider-card">
            <div class="slider-card-header">
              <span class="slider-label">${cfg.label}</span>
              <span class="slider-current-value" id="flip-${cfg.key}-${accountIndex}-${flipIndex}">${formatNumber(cfg.value)}${cfg.unit}</span>
            </div>
            <div class="slider-track-wrapper">
              <input type="range" class="modern-slider" 
                style="--slider-color: ${cfg.color};"
                min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${cfg.value}"
                oninput="updateSliderValue(this, 'flip-${cfg.key}-${accountIndex}-${flipIndex}', '${cfg.unit}')"
                onchange="updateConfig(${accountIndex}, 'flipConfigs.${flipIndex}.${cfg.key}', parseInt(this.value))"/>
              <div class="slider-range-labels">
                <span>${cfg.minLabel}</span>
                <span>${cfg.maxLabel}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
      
    <!-- Whitelist & Blacklist -->
    <div class="config-params-section" style="margin-top: 32px;">
      <div class="section-title-bar">
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #9b6ff7;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Item Filters</span>
      </div>
      <div class="list-buttons-container">
        <button class="modern-list-btn whitelist-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'whitelist')">
          <div class="list-btn-content">
            <svg viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <div class="list-btn-text">
              <span class="list-btn-title">Whitelist</span>
              <span class="list-btn-count">${whitelistCount} items</span>
            </div>
          </div>
          <svg viewBox="0 0 24 24" class="list-btn-arrow">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
        
        <button class="modern-list-btn blacklist-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'blacklistContaining')">
          <div class="list-btn-content">
            <svg viewBox="0 0 24 24">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
            <div class="list-btn-text">
              <span class="list-btn-title">Blacklist</span>
              <span class="list-btn-count">${blacklistCount} items</span>
            </div>
          </div>
          <svg viewBox="0 0 24 24" class="list-btn-arrow">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="config-actions" style="margin-top: 32px;">
      <button class="btn btn-danger" onclick="deleteFlip(${accountIndex}, ${flipIndex})">
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        Delete Flip
      </button>
      <button class="btn btn-primary" onclick="closeFlipEditModal()">
        <svg viewBox="0 0 24 24">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
        Save Changes
      </button>
    </div>
  `;
}

// NPC Item Search
function toggleNPCItemSearch(accountIndex, flipIndex) {
  const searchInput = document.getElementById(`npc-item-search-${accountIndex}-${flipIndex}`);
  const resultsDiv = document.getElementById(`npc-item-results-${accountIndex}-${flipIndex}`);
  
  if (searchInput.style.display === 'none' || searchInput.style.display === '') {
    searchInput.style.display = 'block';
    searchInput.focus();
    searchInput.value = '';
  } else {
    searchInput.style.display = 'none';
    resultsDiv.style.display = 'none';
  }
}

function searchNPCItem(accountIndex, flipIndex, query) {
  const resultsDiv = document.getElementById(`npc-item-results-${accountIndex}-${flipIndex}`);
  
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    return;
  }

  const lowerQuery = query.toLowerCase();
  
  // Filter and score matches
  const matches = skyblockItems
    .filter(item => item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery))
    .map(item => {
      const nameLower = item.name.toLowerCase();
      const idLower = item.id.toLowerCase();
      let score = 0;
      
      // Exact match gets highest priority
      if (nameLower === lowerQuery || idLower === lowerQuery) {
        score = 1000;
      }
      // Starts with query gets high priority
      else if (nameLower.startsWith(lowerQuery) || idLower.startsWith(lowerQuery)) {
        score = 500;
      }
      // Contains query as whole word gets medium priority
      else if (nameLower.includes(' ' + lowerQuery + ' ') || nameLower.startsWith(lowerQuery + ' ') || nameLower.endsWith(' ' + lowerQuery)) {
        score = 250;
      }
      // Contains query anywhere gets low priority
      else {
        score = 100;
      }
      
      // Bonus for shorter names (more specific)
      score += Math.max(0, 100 - item.name.length);
      
      // Penalty for "Minion" in name
      if (nameLower.includes('minion')) {
        score -= 50;
      }
      
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(result => result.item);

  if (matches.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">No items found</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = matches.map(item => {
    const itemImageUrl = getItemImageUrl(item);
    const material = (item.material || 'stone').toLowerCase();
    const blockFallback = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/block/${material.split(':')[0]}.png`;
    
    return `<div class="search-result-item" data-item-id="${item.id}">
      <img src="${itemImageUrl}" alt="${escapeHtml(item.name)}" class="result-icon" 
        onerror="this.onerror=null; this.src='${blockFallback}'"/>
      <div class="result-info">
        <div class="result-name">${escapeHtml(item.name)}</div>
        <div class="result-id">${escapeHtml(item.id)}</div>
      </div>
    </div>`;
  }).join('');
  
  // Add click listeners to results
  resultsDiv.querySelectorAll('.search-result-item').forEach(el => {
    el.addEventListener('click', function() {
      const itemId = this.getAttribute('data-item-id');
      selectNPCItem(accountIndex, flipIndex, itemId);
    });
  });
  
  resultsDiv.style.display = 'block';
}

async function selectNPCItem(accountIndex, flipIndex, itemId) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  flip.item = itemId;
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      // Update the display in the modal
      const item = skyblockItems.find(i => i.id === itemId);
      if (item) {
        const displayDiv = document.getElementById(`npc-item-display-${accountIndex}-${flipIndex}`);
        if (displayDiv) {
          displayDiv.innerHTML = `
            <img src="${getItemImageUrl(item)}" alt="${escapeHtml(item.name)}" style="width: 32px; height: 32px; image-rendering: pixelated;" 
              onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png'"/>
            <div style="flex: 1;">
              <div style="color: #fff; font-weight: 500;">${escapeHtml(item.name)}</div>
              <div style="color: rgba(255,255,255,0.5); font-size: 12px;">${escapeHtml(item.id)}</div>
            </div>
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: rgba(255,255,255,0.5);">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          `;
        }
      }
      
      // Hide search
      const searchInput = document.getElementById(`npc-item-search-${accountIndex}-${flipIndex}`);
      const resultsDiv = document.getElementById(`npc-item-results-${accountIndex}-${flipIndex}`);
      if (searchInput) searchInput.style.display = 'none';
      if (resultsDiv) resultsDiv.style.display = 'none';
      
      // Update the card in the main view
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      showToast('✅ Item selected', 'success');
    } else {
      showToast('❌ Failed to update item', 'error');
    }
  } catch (error) {
    console.error('Error updating item:', error);
    showToast('❌ Failed to update item', 'error');
  }
}

async function updateNPCFlipConfigAndRefresh(accountIndex, flipIndex, field, value) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  flip[field] = value;
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      // Update the card in the main view
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      showToast('✅ Configuration updated', 'success');
    } else {
      showToast('❌ Failed to update configuration', 'error');
    }
  } catch (error) {
    console.error('Error updating configuration:', error);
    showToast('❌ Failed to update configuration', 'error');
  }
}

// Whitelist/Blacklist Editor
function openFlipListEditor(accountIndex, flipIndex, listType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const list = listType === 'whitelist' ? flip.whitelist : flip.blacklistContaining;
  const title = listType === 'whitelist' ? 'Whitelist Items' : 'Blacklist Items';
  const color = listType === 'whitelist' ? '#00ff88' : '#fbbf24';
  
  const modal = document.createElement('div');
  modal.className = 'flip-modal';
  modal.id = 'flip-list-editor-modal';
  
  modal.innerHTML = `
    <div class="flip-modal-content">
      <div class="flip-modal-header">
        <h2 class="flip-modal-title" style="color: ${color};">${title}</h2>
        <button class="flip-modal-close" onclick="closeFlipListEditor()">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 6.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="flip-modal-body">
        <div class="flip-list-editor" style="padding: 32px;">
          <div class="search-section" style="margin-bottom: 24px; position: relative;">
            <input 
              type="text" 
              class="config-input" 
              placeholder="Search items..."
              id="flip-${listType}-search-${accountIndex}-${flipIndex}"
              oninput="searchFlipItems(${accountIndex}, ${flipIndex}, '${listType}', this.value)"
              style="width: 100%;"
            />
            <div class="flip-search-results" id="flip-${listType}-results-${accountIndex}-${flipIndex}"></div>
          </div>
          <div class="items-grid" id="flip-${listType}-items-${accountIndex}-${flipIndex}">
            ${list.map(itemId => renderFlipItemCard(itemId, accountIndex, flipIndex, listType)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.style.opacity = '1', 10);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFlipListEditor();
  });
}

function closeFlipListEditor() {
  const modal = document.getElementById('flip-list-editor-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }
}

function renderFlipItemCard(itemId, accountIndex, flipIndex, listType) {
  const item = skyblockItems.find(i => i.id === itemId);
  const itemName = item ? item.name : itemId;
  const imageUrl = item ? getItemImageUrl(item) : 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/stone.png';
  
  // Block fallback URL
  const material = item ? (item.material || 'stone').toLowerCase().split(':')[0] : 'stone';
  const blockFallback = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/block/${material}.png`;
  
  return `
    <div class="item-card ${listType}">
      <img src="${imageUrl}" alt="${escapeHtml(itemName)}" class="item-icon" 
        onerror="this.onerror=null; this.src='${blockFallback}'"/>
      <div class="item-info">
        <div class="item-name">${escapeHtml(itemName)}</div>
        <div class="item-id">${escapeHtml(itemId)}</div>
      </div>
      <button class="item-remove" onclick="removeFlipItem(${accountIndex}, ${flipIndex}, '${listType}', '${escapeHtml(itemId)}')">×</button>
    </div>
  `;
}

function searchFlipItems(accountIndex, flipIndex, listType, query) {
  const resultsDiv = document.getElementById(`flip-${listType}-results-${accountIndex}-${flipIndex}`);
  
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    return;
  }

  console.log(`🔍 Searching for "${query}" in ${skyblockItems.length} items`);

  const lowerQuery = query.toLowerCase();
  
  // Filter and score matches
  const matches = skyblockItems
    .filter(item => item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery))
    .map(item => {
      const nameLower = item.name.toLowerCase();
      const idLower = item.id.toLowerCase();
      let score = 0;
      
      // Exact match gets highest priority
      if (nameLower === lowerQuery || idLower === lowerQuery) {
        score = 1000;
      }
      // Starts with query gets high priority
      else if (nameLower.startsWith(lowerQuery) || idLower.startsWith(lowerQuery)) {
        score = 500;
      }
      // Contains query as whole word gets medium priority
      else if (nameLower.includes(' ' + lowerQuery + ' ') || nameLower.startsWith(lowerQuery + ' ') || nameLower.endsWith(' ' + lowerQuery)) {
        score = 250;
      }
      // Contains query anywhere gets low priority
      else {
        score = 100;
      }
      
      // Bonus for shorter names (more specific)
      score += Math.max(0, 100 - item.name.length);
      
      // Penalty for "Minion" in name
      if (nameLower.includes('minion')) {
        score -= 50;
      }
      
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(result => result.item);

  console.log(`📋 Found ${matches.length} matches`);

  if (matches.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">No items found</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = matches.map(item => `
    <div class="search-result-item" onclick="addFlipItem(${accountIndex}, ${flipIndex}, '${listType}', '${escapeHtml(item.id)}')">
      <img src="${getItemImageUrl(item)}" alt="${escapeHtml(item.name)}" class="result-icon" 
        onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/stone.png'"/>
      <div class="result-info">
        <div class="result-name">${escapeHtml(item.name)}</div>
        <div class="result-id">${escapeHtml(item.id)}</div>
      </div>
    </div>
  `).join('');
  
  resultsDiv.style.display = 'block';
}

async function addFlipItem(accountIndex, flipIndex, listType, itemId) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const list = listType === 'whitelist' ? 'whitelist' : 'blacklistContaining';
  if (!flip[list]) flip[list] = [];
  
  if (flip[list].includes(itemId)) {
    showToast('Item already in list', 'info');
    return;
  }
  
  flip[list].push(itemId);
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      document.getElementById(`flip-${listType}-search-${accountIndex}-${flipIndex}`).value = '';
      document.getElementById(`flip-${listType}-results-${accountIndex}-${flipIndex}`).innerHTML = '';
      document.getElementById(`flip-${listType}-results-${accountIndex}-${flipIndex}`).style.display = 'none';
      
      const itemsContainer = document.getElementById(`flip-${listType}-items-${accountIndex}-${flipIndex}`);
      if (itemsContainer) {
        itemsContainer.innerHTML += renderFlipItemCard(itemId, accountIndex, flipIndex, listType);
      }
      
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      showToast('✅ Item added', 'success');
    } else {
      showToast('❌ Failed to add item', 'error');
    }
  } catch (error) {
    console.error('Error adding item:', error);
    showToast('❌ Failed to add item', 'error');
  }
}

async function removeFlipItem(accountIndex, flipIndex, listType, itemId) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const list = listType === 'whitelist' ? 'whitelist' : 'blacklistContaining';
  if (!flip[list]) return;
  
  flip[list] = flip[list].filter(id => id !== itemId);
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      const itemsContainer = document.getElementById(`flip-${listType}-items-${accountIndex}-${flipIndex}`);
      if (itemsContainer) {
        itemsContainer.innerHTML = updated.flipConfigs[flipIndex][list].map(id => 
          renderFlipItemCard(id, accountIndex, flipIndex, listType)
        ).join('');
      }
      
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      showToast('✅ Item removed', 'success');
    } else {
      showToast('❌ Failed to remove item', 'error');
    }
  } catch (error) {
    console.error('Error removing item:', error);
    showToast('❌ Failed to remove item', 'error');
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


async function updateProxyConfig(accountIndex, field, value) {
  try {
    const account = globalConfig.accounts[accountIndex];
    if (!account) {
      showToast('Account not found', 'error');
      return;
    }

    // Initialize proxy object if it doesn't exist
    if (!account.proxy) {
      account.proxy = {
        host: '',
        port: 0,
        type: 5, // SOCKS5
        username: '',
        password: ''
      };
    }

    // Update the specific field
    account.proxy[field] = value;

    // Send to server
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });

    if (!res.ok) throw new Error('Failed to update proxy config');

    const updated = await res.json();
    
    // Update local account
    globalConfig.accounts[accountIndex] = updated;
    showToast('Proxy configuration updated', 'success');
  } catch (error) {
    console.error('Proxy config update error:', error);
    showToast('Failed to update proxy configuration', 'error');
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

      <div class="mini-chart-card" onclick="toggleChartExpand(${index}, 'moneyflow')" id="moneyflow-chart-card-${index}">
        <div class="mini-chart-header">
          <h4>💸 Money Flow</h4>
          <span class="expand-icon">⛶</span>
        </div>
        <div class="chart-container mini" id="moneyflow-chart-container-${index}">
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
      
      // Don't show tooltip for offline bots
      
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
      stopBotIntervals(index);
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
    loadBotData(accountIndex, true);
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
    loadBotStats(accountIndex, isUpdate),
    loadMoneyFlowChart(accountIndex, isUpdate) // 🔥 NEW
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
    containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💰</p><p>No profit data available yet.</p></div>';
    document.getElementById(`global-total-profit-${accountIndex}`).textContent = '0';
    document.getElementById(`global-avg-profit-${accountIndex}`).textContent = '0';
    document.getElementById(`global-total-flips-${accountIndex}`).textContent = '0';
    document.getElementById(`global-coins-hour-${accountIndex}`).textContent = '0';
    document.getElementById(`global-best-flip-${accountIndex}`).textContent = '0';
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
    containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💰</p><p>No purse data available yet.</p></div>';
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
    
    // Actualizar el estado de los botones después de la acción
    setTimeout(() => {
      updateBotStatus(accountIndex);
    }, 500);
    
  } catch (error) {
    console.error(`Error ${action} bot:`, error);
    showToast(`Failed to ${action} bot: ${error.message}`, 'error');
  }
}

// ==================== UI HELPERS ====================
function toggleConfigSection(headerElement) {
  const section = headerElement.closest('.config-section');
  section.classList.toggle('collapsed');
}

// Toggle bot option sections with animation
function toggleBotOption(accountIndex, optionName, enabled) {
  const contentElement = document.getElementById(`${optionName}-${accountIndex}`);
  if (!contentElement) return;
  
  if (enabled) {
    contentElement.classList.add('active');
  } else {
    contentElement.classList.remove('active');
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
    containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💰</p><p>No data yet</p></div>';
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

// ==================== MONEY FLOW CHART ====================
async function loadMoneyFlowChart(accountIndex, isUpdate = false) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;

  try {
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/moneyflow?limit=100`, {
      method: 'GET',
      headers: { 'x-password': password }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    renderMoneyFlowChart(accountIndex, data, isUpdate);
  } catch (error) {
    if (!isUpdate) {
      console.error(`❌ Error loading money flow data:`, error);
      const containerEl = document.getElementById(`moneyflow-chart-container-${accountIndex}`);
      if (containerEl) containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💸</p><p>No data yet</p></div>';
    }
  }
}

function renderMoneyFlowChart(accountIndex, moneyFlowData, isUpdate = false) {
  const containerEl = document.getElementById(`moneyflow-chart-container-${accountIndex}`);
  if (!containerEl) return;

  if (!moneyFlowData.transactions || moneyFlowData.transactions.length === 0) {
    containerEl.innerHTML = '<div class="chart-empty"><p class="chart-icon">💸</p><p>No transactions yet</p></div>';
    return;
  }

  const transactions = moneyFlowData.transactions;
  
  // Build cumulative money spent over time
  let totalSpent = 0;
  const labels = [];
  const values = [];
  
  transactions.forEach((tx, idx) => {
    totalSpent += tx.amount;
    labels.push(new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    values.push(totalSpent);
  });

  if (!document.getElementById(`moneyflow-canvas-${accountIndex}`)) {
    containerEl.innerHTML = '<canvas id="moneyflow-canvas-' + accountIndex + '"></canvas>';
  }
  
  const canvas = document.getElementById(`moneyflow-canvas-${accountIndex}`);
  if (!canvas) return;

  if (moneyFlowCharts.has(accountIndex)) moneyFlowCharts.get(accountIndex).destroy();

  const ctx = canvas.getContext('2d');
  
  // 5B limit line
  const fiveBillion = 5000000000;
  
  const chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Money Spent',
          data: values,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointBackgroundColor: '#ef4444'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#ef4444',
          bodyColor: '#FFF',
          callbacks: { 
            label: (ctx) => {
              const spent = ctx.parsed.y;
              const remaining = fiveBillion - spent;
              return [
                `Spent: ${formatNumber(spent)} coins`,
                `Remaining: ${formatNumber(remaining)} coins`
              ];
            }
          }
        },
        annotation: {
          annotations: {
            line1: {
              type: 'line',
              yMin: fiveBillion,
              yMax: fiveBillion,
              borderColor: '#ef4444',
              borderWidth: 3,
              borderDash: [10, 5],
              label: {
                content: '5B Limit',
                enabled: true,
                position: 'end',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                font: {
                  size: 12,
                  weight: 'bold'
                }
              }
            }
          }
        }
      },
      scales: {
        x: { 
          grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
          ticks: { 
            color: '#AAA',
            maxRotation: 45,
            minRotation: 0
          } 
        },
        y: { 
          grid: { color: 'rgba(255, 255, 255, 0.1)' }, 
          ticks: { 
            color: '#AAA', 
            callback: (value) => formatNumber(value)
          },
          suggestedMax: Math.max(...values, fiveBillion) * 1.1 // Show 10% above max or 5B
        }
      }
    }
  });
  
  moneyFlowCharts.set(accountIndex, chart);
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
    dailyRest: { enabled: false, workHours: 8 }
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
              onchange="updateConfig(${index}, 'restSchedule.shortBreaks.workDuration', parseInt(this.value))"/>
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
              onchange="updateConfig(${index}, 'restSchedule.shortBreaks.breakDuration', parseInt(this.value))"/>
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
            onchange="updateConfig(${index}, 'restSchedule.dailyRest.workHours', parseInt(this.value))"/>
          <div class="slider-value" id="daily-${index}">${restSchedule.dailyRest.workHours}h</div>
          <div class="slider-labels">
            <span>1 hour</span>
            <span>23 hours</span>
          </div>
        </div>
      </div>
    </div>

    <div class="config-divider"></div>

    <h4 class="config-subtitle">Proxy Configuration</h4>
    ${renderProxyConfig(account.proxy || {}, index)}
  `;
}

// ==================== LIST EDITOR MODAL ====================
function openListEditorModal(accountIndex, listType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;

  const list = listType === 'whitelist' ? (account.flips.whitelist || []) : (account.flips.blacklistContaining || []);
  const title = listType === 'whitelist' ? 'Whitelist Editor' : 'Blacklist Editor';
  const color = listType === 'whitelist' ? '#00ff88' : '#fbbf24';
  
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
          <span class="modal-icon ${listType}">${listType === 'whitelist' ? '+' : '−'}</span>
          <h3>${title}</h3>
        </div>
        <button class="modal-close" onclick="closeListEditorModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="item-editor">
          <div class="search-container">
            <input type="text" class="item-search" id="${listType}-search-${accountIndex}"
              placeholder="Search items..." oninput="searchItems(${accountIndex}, '${listType}', this.value)" autocomplete="off"/>
            <div class="flip-search-results" id="${listType}-results-${accountIndex}"></div>
          </div>
          <div class="items-grid" id="${listType}-items-${accountIndex}">
            ${list.map(itemId => renderItemCard(itemId, accountIndex, listType)).join('')}
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

function searchItems(accountIndex, listType, query) {
  const resultsDiv = document.getElementById(`${listType}-results-${accountIndex}`);
  
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    return;
  }

  console.log(`🔍 Searching for "${query}" in ${skyblockItems.length} items`);

  const lowerQuery = query.toLowerCase();
  
  // Filter and score matches
  const matches = skyblockItems
    .filter(item => item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery))
    .map(item => {
      const nameLower = item.name.toLowerCase();
      const idLower = item.id.toLowerCase();
      let score = 0;
      
      // Exact match gets highest priority
      if (nameLower === lowerQuery || idLower === lowerQuery) {
        score = 1000;
      }
      // Starts with query gets high priority
      else if (nameLower.startsWith(lowerQuery) || idLower.startsWith(lowerQuery)) {
        score = 500;
      }
      // Contains query as whole word gets medium priority
      else if (nameLower.includes(' ' + lowerQuery + ' ') || nameLower.startsWith(lowerQuery + ' ') || nameLower.endsWith(' ' + lowerQuery)) {
        score = 250;
      }
      // Contains query anywhere gets low priority
      else {
        score = 100;
      }
      
      // Bonus for shorter names (more specific)
      score += Math.max(0, 100 - item.name.length);
      
      // Penalty for "Minion" in name
      if (nameLower.includes('minion')) {
        score -= 50;
      }
      
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(result => result.item);

  console.log(`📋 Found ${matches.length} matches`);

  if (matches.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">No items found</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = matches.map(item => `
    <div class="search-result-item" onclick="addItemToList(${accountIndex}, '${listType}', '${escapeHtml(item.id)}')">
      <img src="${getItemImageUrl(item)}" alt="${escapeHtml(item.name)}" class="result-icon" 
        onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png'"/>
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
            <h3>🧠 Task Queue</h3>
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
          <div class="legend-item">
            <div class="legend-color" style="background: #14b8a6;"></div>
            <span>NPC Buy</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #06b6d4;"></div>
            <span>NPC Sell</span>
          </div>
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
          <div class="legend-item">
            <div class="legend-color" style="background: #0ea5e9;"></div>
            <span>Short Break</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #6366f1;"></div>
            <span>Daily Rest</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background: #dc2626;"></div>
            <span>Reset</span>
          </div>
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
  if (starfields.has(accountIndex)) {
    cancelAnimationFrame(starfields.get(accountIndex));
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
    bpmClass = 'alive';
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
  
  // If current task changed or cleared, and there was a previous current task, mark it as completed
  if (brainState.previousTaskId && 
      (!data.currentTask?.id || brainState.previousTaskId !== data.currentTask.id)) {
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
      status: data.currentTask.completed ? 'completed' : 'current',
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
  if (typeUpper.includes('NPCBUY')) return '#14b8a6'; // Teal (NPC Buy)
  if (typeUpper.includes('NPCSELL')) return '#06b6d4'; // Cyan (NPC Sell)
  if (typeUpper.includes('BUY') && !typeUpper.includes('RELIST')) return '#fb923c'; // Naranja (comprar)
  if (typeUpper.includes('RELIST')) return '#a855f7'; // Morado (cualquier relist)
  if (typeUpper.includes('CLAIM')) return '#fbbf24'; // Dorado
  if (typeUpper.includes('SELL') && !typeUpper.includes('RELIST')) return '#22c55e'; // Verde
  if (typeUpper.includes('CHECK')) return '#8b5cf6'; // Púrpura para check
  
  // 🔥 NEW: Break/Rest/Reset colors
  if (typeUpper.includes('DAILYREST')) return '#6366f1'; // Indigo para daily rest
  if (typeUpper.includes('SHORTBREAK')) return '#0ea5e9'; // Sky blue para short break
  if (typeUpper.includes('RESET')) return '#dc2626'; // Rojo intenso para reset (prioridad máxima)
  if (typeUpper.includes('FINISH')) return '#ef4444'; // Rojo
  
  return '#8b8b8b'; // Gris por defecto
}

function getTaskIcon(taskType, isCurrent, isCompleted) {
  
  if (isCurrent) return '⟳';
  if (isCompleted) return '✓';
  
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
        const rect = document.getElementById(`brain-nodes-${index}`).getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        
        renderBrainCanvas(canvas);
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

async function deleteFlip(accountIndex, flipIndex) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  if (!confirm('Are you sure you want to delete this flip configuration?')) {
    return;
  }
  
  account.flipConfigs.splice(flipIndex, 1);
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      closeFlipEditModal();
      
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      showToast('✅ Flip deleted successfully', 'success');
    } else {
      showToast('❌ Failed to delete flip', 'error');
    }
  } catch (error) {
    console.error('Error deleting flip:', error);
    showToast('❌ Failed to delete flip', 'error');
  }
}











// ==================== MODULAR FLIP SYSTEM ====================

function renderFlipperConfigSection(account, index) {
  const flips = account.flipConfigs || [];
  
  return `
    <div class="flips-container">
      <div class="add-flip-btn" onclick="openAddFlipModal(${index})">
        <div class="add-flip-icon">+</div>
        <div class="add-flip-text">Add Flip</div>
      </div>
      ${flips.map((flip, flipIndex) => renderFlipCard(account, index, flip, flipIndex)).join('')}
    </div>
  `;
}

function renderFlipCard(account, accountIndex, flip, flipIndex) {
  const flipType = flip.type || 'SELL_ORDER';
  
  const typeColors = {
    'SELL_ORDER': '#00ff88',
    'KAT': '#fbbf24',
    'FORGE': '#ef4444',
    'NPC': '#3b82f6',
    'CRAFT': '#a855f7'
  };
  
  const typeLabels = {
    'SELL_ORDER': 'Sell Order',
    'KAT': 'Kat Flip',
    'FORGE': 'Forge Flip',
    'NPC': 'NPC Flip',
    'CRAFT': 'Craft Flip'
  };
  
  const typeIcons = {
    'SELL_ORDER': `<svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-2.44.85-2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>`,
    'KAT': `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
    'FORGE': `<svg viewBox="0 0 24 24"><path d="M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>`,
    'NPC': `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`,
    'CRAFT': `<svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>`
  };
  
  const color = typeColors[flipType] || '#888';
  const label = typeLabels[flipType] || flipType;
  const icon = typeIcons[flipType] || typeIcons['SELL_ORDER'];
  

  // For NPC flips, use item image if available

  let headerIcon = icon;

  if (flipType === 'NPC' && flip.item) {

    const item = skyblockItems.find(i => i.id === flip.item);

    if (item) {

      const imageUrl = getItemImageUrl(item);

      const material = (item.material || 'stone').toLowerCase().split(':')[0];

      const blockFallback = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/block/${material}.png`;

      headerIcon = `<img src="${imageUrl}" alt="${escapeHtml(item.name)}" style="width: 20px; height: 20px; image-rendering: pixelated;" onerror="this.onerror=null; this.src='${blockFallback}'"/>`;

    }

  }
  
  // For NPC flips, show different stats
  let statsHTML;
  if (flipType === 'NPC') {
    const itemName = flip.item || 'Not set';
    const forceSellAfter = flip.forceSellAfter || 1;
    
    statsHTML = `
      <div class="flip-stat">
        <span class="flip-stat-label">Item</span>
        <span class="flip-stat-value">${escapeHtml(itemName)}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Force Sell</span>
        <span class="flip-stat-value">${forceSellAfter} min</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Status</span>
        <span class="flip-stat-value ${flip.enabled ? 'positive' : 'warning'}">${flip.enabled ? 'Enabled' : 'Disabled'}</span>
      </div>
    `;
  } else {
    const whitelistCount = flip.whitelist?.length || 0;
    const blacklistCount = flip.blacklistContaining?.length || 0;
    const maxFlips = flip.maxFlips || 0;
    const budget = flip.budget || 0;
    
    statsHTML = `
      <div class="flip-stat">
        <span class="flip-stat-label">Whitelist</span>
        <span class="flip-stat-value positive">${whitelistCount}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Blacklist</span>
        <span class="flip-stat-value warning">${blacklistCount}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Max Flips</span>
        <span class="flip-stat-value">${maxFlips}</span>
      </div>
      <div class="flip-stat">
        <span class="flip-stat-label">Budget</span>
        <span class="flip-stat-value">${formatNumber(budget)}</span>
      </div>
    `;
  }
  
  // For NPC flips, don't show whitelist/blacklist buttons
  let footerHTML;
  if (flipType === 'NPC') {
    footerHTML = `
      <div class="flip-card-footer" style="padding: 16px; text-align: center; color: rgba(255,255,255,0.6);">
        <span>Click to configure</span>
      </div>
    `;
  } else {
    const whitelistCount = flip.whitelist?.length || 0;
    const blacklistCount = flip.blacklistContaining?.length || 0;
    
    footerHTML = `
      <div class="flip-card-footer">
        <button class="flip-footer-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'whitelist')">
          <div class="list-btn-icon">
            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </div>
          <div class="list-btn-content">
            <div class="list-btn-label">Whitelist</div>
            <div class="list-btn-count">${whitelistCount} items</div>
          </div>
        </button>
        <button class="flip-footer-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'blacklistContaining')">
          <div class="list-btn-icon">
            <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: currentColor;">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </div>
          <div class="list-btn-content">
            <div class="list-btn-label">Blacklist</div>
            <div class="list-btn-count">${blacklistCount} items</div>
          </div>
        </button>
      </div>
    `;
  }
  
  return `
    <div class="flip-card" data-flip-index="${flipIndex}" onclick="openFlipEditModal(${accountIndex}, ${flipIndex})">
      <div class="flip-card-header">
        <div class="flip-card-title">
          <div class="flip-type-icon">${headerIcon}</div>
          <h3>${label}</h3>
        </div>
        <div class="flip-type-badge" style="background: ${color}; color: #000;">
          ACTIVE
        </div>
      </div>
      
      <div class="flip-card-body">
        ${statsHTML}
      </div>
      
      ${footerHTML}
    </div>
  `;
}

// Add Flip Modal
function openAddFlipModal(accountIndex) {
  const modal = document.createElement('div');
  modal.className = 'flip-modal';
  modal.id = 'add-flip-modal';
  
  modal.innerHTML = `
    <div class="flip-modal-content">
      <div class="flip-modal-header">
        <h2 class="flip-modal-title">
          <svg viewBox="0 0 24 24" style="width: 28px; height: 28px; fill: #9b6ff7;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Add New Flip
        </h2>
        <button class="flip-modal-close" onclick="closeAddFlipModal()">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 6.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="flip-modal-body">
        <div class="flip-type-selector">
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'SELL_ORDER')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-2.44.85-2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>
            </div>
            <div class="flip-type-option-label">Sell Order</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'KAT')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            </div>
            <div class="flip-type-option-label">Kat Flip</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'FORGE')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M12.5 6.9c1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-.53.12-1.03.3-1.48.54l1.47 1.47c.41-.17.91-.27 1.51-.27zM5.33 4.06L4.06 5.33 7.5 8.77c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/></svg>
            </div>
            <div class="flip-type-option-label">Forge Flip</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'NPC')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <div class="flip-type-option-label">NPC Flip</div>
          </div>
          
          <div class="flip-type-option" onclick="selectNewFlipType(${accountIndex}, 'CRAFT')">
            <div class="flip-type-option-icon">
              <svg viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
            </div>
            <div class="flip-type-option-label">Craft Flip</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.style.opacity = '1', 10);
}

function closeAddFlipModal() {
  const modal = document.getElementById('add-flip-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }
}

async function selectNewFlipType(accountIndex, flipType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account) return;
  
  if (!account.flipConfigs) account.flipConfigs = [];
  
  let newFlip;
  
  if (flipType === 'NPC') {
    newFlip = {
      type: flipType,
      enabled: true,
      item: "",
      forceSellAfter: 1
    };
  } else {
    newFlip = {
      type: flipType,
      enabled: true,
      maxFlips: 5,
      budget: 10000000,
      minProfit: 100000,
      whitelist: [],
      blacklistContaining: []
    };
  }
  
  account.flipConfigs.push(newFlip);
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      closeAddFlipModal();
      showToast('✅ Flip created successfully', 'success');
    } else {
      showToast('❌ Failed to create flip', 'error');
    }
  } catch (error) {
    console.error('Error creating flip:', error);
    showToast('❌ Failed to create flip', 'error');
  }
}

// Edit Flip Modal
function openFlipEditModal(accountIndex, flipIndex) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const flipType = flip.type || 'SELL_ORDER';
  
  const modal = document.createElement('div');
  modal.className = 'flip-modal';
  modal.id = 'edit-flip-modal';
  
  modal.innerHTML = `
    <div class="flip-modal-content">
      <div class="flip-modal-header">
        <div style="flex: 1;">
          <h2 class="flip-modal-title">Configure Flip</h2>
          <p style="color: rgba(255, 255, 255, 0.5); font-size: 13px; margin: 4px 0 0 0;">${flipType.replace('_', ' ')}</p>
        </div>
        <button class="flip-modal-close" onclick="closeFlipEditModal()">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 6.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="flip-modal-body">
        <div style="padding: 24px 32px;">
          <!-- Enable Toggle at Top -->
          <div class="flip-enable-section">
            <div class="flip-enable-info">
              <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; fill: currentColor;">
                <path d="M17,7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7M17,15A3,3 0 0,1 14,12A3,3 0 0,1 17,9A3,3 0 0,1 20,12A3,3 0 0,1 17,15Z"/>
              </svg>
              <div>
                <span class="flip-enable-label">Flip Status</span>
                <span class="flip-enable-desc">Enable or disable this flip configuration</span>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" ${flip.enabled ? 'checked' : ''} 
                onchange="updateConfig(${accountIndex}, 'flipConfigs.${flipIndex}.enabled', this.checked)"/>
              <span class="toggle-slider"></span>
            </label>
          </div>

          ${renderFlipConfigFields(flip, accountIndex, flipIndex)}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.style.opacity = '1', 10);
  
  // Setup NPC item selector event listener AFTER modal is added to DOM
  if (flipType === 'NPC') {
    setTimeout(() => {
      const selector = document.getElementById(`npc-item-display-${accountIndex}-${flipIndex}`);
      const searchInput = document.getElementById(`npc-item-search-${accountIndex}-${flipIndex}`);
      
      if (selector && searchInput) {
        selector.addEventListener('click', function() {
          if (searchInput.style.display === 'none' || searchInput.style.display === '') {
            searchInput.style.display = 'block';
            searchInput.focus();
            searchInput.value = '';
          } else {
            searchInput.style.display = 'none';
            document.getElementById(`npc-item-results-${accountIndex}-${flipIndex}`).style.display = 'none';
          }
        });
        
        // Setup search input
        searchInput.addEventListener('input', function() {
          searchNPCItem(accountIndex, flipIndex, this.value);
        });
      }
    }, 100);
  }
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFlipEditModal();
  });
}

function closeFlipEditModal() {
  const modal = document.getElementById('edit-flip-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }
}

function renderFlipConfigFields(flip, accountIndex, flipIndex) {
  const flipType = flip.type || 'SELL_ORDER';
  
  // NPC Flip specific configuration
  if (flipType === 'NPC') {
    const currentItem = flip.item || '';
    let itemDisplay = 'Not set';
    let itemImageUrl = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png';
    
    if (currentItem) {
      const item = skyblockItems.find(i => i.id === currentItem);
      if (item) {
        itemDisplay = item.name;
        itemImageUrl = getItemImageUrl(item);
      } else {
        itemDisplay = currentItem;
      }
    }
    
    return `
      <!-- Configuration Parameters for NPC Flip -->
      <div class="config-params-section">
        <div class="section-title-bar">
          <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #3b82f6;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          <span>NPC Flip Configuration</span>
        </div>
        
        <!-- Item Selector -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 8px; color: #fff; font-size: 14px; font-weight: 600;">Item to Sell</label>
          <div style="position: relative;">
            <div id="npc-item-display-${accountIndex}-${flipIndex}" class="npc-item-selector" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(12, 24, 42, 0.6); border: 1px solid rgba(129, 62, 242, 0.3); border-radius: 8px; cursor: pointer;">
              <img src="${itemImageUrl}" alt="${escapeHtml(itemDisplay)}" style="width: 32px; height: 32px; image-rendering: pixelated;" 
                onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/barrier.png'"/>
              <div style="flex: 1;">
                <div style="color: #fff; font-weight: 500;">${escapeHtml(itemDisplay)}</div>
                ${currentItem ? `<div style="color: rgba(255,255,255,0.5); font-size: 12px;">${escapeHtml(currentItem)}</div>` : ''}
              </div>
              <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: rgba(255,255,255,0.5);">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <input 
              type="text" 
              class="config-input" 
              placeholder="Search for an item..."
              id="npc-item-search-${accountIndex}-${flipIndex}"
              style="width: 100%; margin-top: 8px; display: none;"
            />
            <div class="flip-search-results" id="npc-item-results-${accountIndex}-${flipIndex}" style="display: none;"></div>
          </div>
        </div>
        
        <div class="config-sliders-grid">
          <div class="slider-card">
            <div class="slider-card-header">
              <span class="slider-label">Force Sell After</span>
              <span class="slider-current-value" id="flip-forceSellAfter-${accountIndex}-${flipIndex}">${flip.forceSellAfter || 1} min</span>
            </div>
            <div class="slider-track-wrapper">
              <input type="range" class="modern-slider" 
                style="--slider-color: #3b82f6;"
                min="1" max="10" step="1" value="${flip.forceSellAfter || 1}"
                oninput="updateSliderValue(this, 'flip-forceSellAfter-${accountIndex}-${flipIndex}', ' min')"
                onchange="updateNPCFlipConfigAndRefresh(${accountIndex}, ${flipIndex}, 'forceSellAfter', parseInt(this.value))"/>
              <div class="slider-range-labels">
                <span>1 min</span>
                <span>10 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="config-actions" style="margin-top: 32px;">
        <button class="btn btn-danger" onclick="deleteFlip(${accountIndex}, ${flipIndex})">
          <svg viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          Delete Flip
        </button>
        <button class="btn btn-primary" onclick="closeFlipEditModal()">
          <svg viewBox="0 0 24 24">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
          Save Changes
        </button>
      </div>
    `;
  }
  
  // Sell Order Flip configuration (original)
  const whitelistCount = flip.whitelist?.length || 0;
  const blacklistCount = flip.blacklistContaining?.length || 0;
  
  const configs = [
    { key: 'maxBuyPrice', label: 'Max Buy Price', min: 100000, max: 50000000, step: 100000, unit: ' coins', minLabel: '100K', maxLabel: '50M', color: '#9b6ff7', value: flip.maxBuyPrice || 0 },
    { key: 'minProfit', label: 'Min Profit', min: 1000, max: 1000000, step: 1000, unit: ' coins', minLabel: '1K', maxLabel: '1M', color: '#8b5cf6', value: flip.minProfit || 0 },
    { key: 'minVolume', label: 'Min Volume', min: 1, max: 100000, step: 1, unit: ' sales/day', minLabel: '1', maxLabel: '100K', color: '#7c3aed', value: flip.minVolume || 0 },
    { key: 'maxFlips', label: 'Max Flips', min: 1, max: 20, step: 1, unit: '', minLabel: '1', maxLabel: '20', color: '#6d28d9', value: flip.maxFlips || 0 },
    { key: 'maxRelist', label: 'Max Relist', min: 1, max: 10, step: 1, unit: '', minLabel: '1', maxLabel: '10', color: '#5b21b6', value: flip.maxRelist || 0 },
    { key: 'maxBuyRelist', label: 'Max Buy Relist', min: 1, max: 10, step: 1, unit: '', minLabel: '1', maxLabel: '10', color: '#4c1d95', value: flip.maxBuyRelist || 0 },
    { key: 'minOrder', label: 'Min Order', min: 1, max: 1000, step: 1, unit: ' items', minLabel: '1', maxLabel: '1K', color: '#813ef2', value: flip.minOrder || 0 },
    { key: 'maxOrder', label: 'Max Order', min: 10, max: 10000, step: 10, unit: ' items', minLabel: '10', maxLabel: '10K', color: '#9b6ff7', value: flip.maxOrder || 0 },
    { key: 'minSpread', label: 'Min Spread', min: 0, max: 100, step: 1, unit: '%', minLabel: '0%', maxLabel: '100%', color: '#a78bfa', value: flip.minSpread || 0 }
  ];
  
  return `
    <!-- Configuration Parameters -->
    <div class="config-params-section">
      <div class="section-title-bar">
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #9b6ff7;">
          <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.32-.61-.32l-2.21 0c-.12 0-.49.18-.5 2v14c0 2.08 1.56 3.21 3.91 3.91l3.51 3.51c-.34.48-1.05.91-2.42.91-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c.96-.18 1.82-.55 2.45-1.12l2.22 2.22 1.27-1.27L5.33 4.06z"/>
        </svg>
        <span>Flip Parameters</span>
      </div>
      <div class="config-sliders-grid">
        ${configs.map(cfg => `
          <div class="slider-card">
            <div class="slider-card-header">
              <span class="slider-label">${cfg.label}</span>
              <span class="slider-current-value" id="flip-${cfg.key}-${accountIndex}-${flipIndex}">${formatNumber(cfg.value)}${cfg.unit}</span>
            </div>
            <div class="slider-track-wrapper">
              <input type="range" class="modern-slider" 
                style="--slider-color: ${cfg.color};"
                min="${cfg.min}" max="${cfg.max}" step="${cfg.step}" value="${cfg.value}"
                oninput="updateSliderValue(this, 'flip-${cfg.key}-${accountIndex}-${flipIndex}', '${cfg.unit}')"
                onchange="updateConfig(${accountIndex}, 'flipConfigs.${flipIndex}.${cfg.key}', parseInt(this.value))"/>
              <div class="slider-range-labels">
                <span>${cfg.minLabel}</span>
                <span>${cfg.maxLabel}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
      
    <!-- Whitelist & Blacklist -->
    <div class="config-params-section" style="margin-top: 32px;">
      <div class="section-title-bar">
        <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; fill: #9b6ff7;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <span>Item Filters</span>
      </div>
      <div class="list-buttons-container">
        <button class="modern-list-btn whitelist-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'whitelist')">
          <div class="list-btn-content">
            <svg viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <div class="list-btn-text">
              <span class="list-btn-title">Whitelist</span>
              <span class="list-btn-count">${whitelistCount} items</span>
            </div>
          </div>
          <svg viewBox="0 0 24 24" class="list-btn-arrow">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
        
        <button class="modern-list-btn blacklist-btn" onclick="event.stopPropagation(); openFlipListEditor(${accountIndex}, ${flipIndex}, 'blacklistContaining')">
          <div class="list-btn-content">
            <svg viewBox="0 0 24 24">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
            <div class="list-btn-text">
              <span class="list-btn-title">Blacklist</span>
              <span class="list-btn-count">${blacklistCount} items</span>
            </div>
          </div>
          <svg viewBox="0 0 24 24" class="list-btn-arrow">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="config-actions" style="margin-top: 32px;">
      <button class="btn btn-danger" onclick="deleteFlip(${accountIndex}, ${flipIndex})">
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
        Delete Flip
      </button>
      <button class="btn btn-primary" onclick="closeFlipEditModal()">
        <svg viewBox="0 0 24 24">
          <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
        </svg>
        Save Changes
      </button>
    </div>
  `;
}

// Whitelist/Blacklist Editor
function openFlipListEditor(accountIndex, flipIndex, listType) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const list = listType === 'whitelist' ? flip.whitelist : flip.blacklistContaining;
  const title = listType === 'whitelist' ? 'Whitelist Items' : 'Blacklist Items';
  const color = listType === 'whitelist' ? '#00ff88' : '#fbbf24';
  
  const modal = document.createElement('div');
  modal.className = 'flip-modal';
  modal.id = 'flip-list-editor-modal';
  
  modal.innerHTML = `
    <div class="flip-modal-content">
      <div class="flip-modal-header">
        <h2 class="flip-modal-title" style="color: ${color};">${title}</h2>
        <button class="flip-modal-close" onclick="closeFlipListEditor()">
          <svg viewBox="0 0 24 24">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 6.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="flip-modal-body">
        <div class="flip-list-editor" style="padding: 32px;">
          <div class="search-section" style="margin-bottom: 24px; position: relative;">
            <input 
              type="text" 
              class="config-input" 
              placeholder="Search items..."
              id="flip-${listType}-search-${accountIndex}-${flipIndex}"
              oninput="searchFlipItems(${accountIndex}, ${flipIndex}, '${listType}', this.value)"
              style="width: 100%;"
            />
            <div class="flip-search-results" id="flip-${listType}-results-${accountIndex}-${flipIndex}"></div>
          </div>
          <div class="items-grid" id="flip-${listType}-items-${accountIndex}-${flipIndex}">
            ${list.map(itemId => renderFlipItemCard(itemId, accountIndex, flipIndex, listType)).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => modal.style.opacity = '1', 10);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeFlipListEditor();
  });
}

function closeFlipListEditor() {
  const modal = document.getElementById('flip-list-editor-modal');
  if (modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.remove(), 300);
  }
}

function renderFlipItemCard(itemId, accountIndex, flipIndex, listType) {
  const item = skyblockItems.find(i => i.id === itemId);
  const itemName = item ? item.name : itemId;
  const imageUrl = item ? getItemImageUrl(item) : 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/stone.png';
  
  // Block fallback URL
  const material = item ? (item.material || 'stone').toLowerCase().split(':')[0] : 'stone';
  const blockFallback = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/block/${material}.png`;
  
  return `
    <div class="item-card ${listType}">
      <img src="${imageUrl}" alt="${escapeHtml(itemName)}" class="item-icon" 
        onerror="this.onerror=null; this.src='${blockFallback}'"/>
      <div class="item-info">
        <div class="item-name">${escapeHtml(itemName)}</div>
        <div class="item-id">${escapeHtml(itemId)}</div>
      </div>
      <button class="item-remove" onclick="removeFlipItem(${accountIndex}, ${flipIndex}, '${listType}', '${escapeHtml(itemId)}')">×</button>
    </div>
  `;
}

function searchFlipItems(accountIndex, flipIndex, listType, query) {
  const resultsDiv = document.getElementById(`flip-${listType}-results-${accountIndex}-${flipIndex}`);
  
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    return;
  }

  console.log(`🔍 Searching for "${query}" in ${skyblockItems.length} items`);

  const lowerQuery = query.toLowerCase();
  
  // Filter and score matches
  const matches = skyblockItems
    .filter(item => item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery))
    .map(item => {
      const nameLower = item.name.toLowerCase();
      const idLower = item.id.toLowerCase();
      let score = 0;
      
      // Exact match gets highest priority
      if (nameLower === lowerQuery || idLower === lowerQuery) {
        score = 1000;
      }
      // Starts with query gets high priority
      else if (nameLower.startsWith(lowerQuery) || idLower.startsWith(lowerQuery)) {
        score = 500;
      }
      // Contains query as whole word gets medium priority
      else if (nameLower.includes(' ' + lowerQuery + ' ') || nameLower.startsWith(lowerQuery + ' ') || nameLower.endsWith(' ' + lowerQuery)) {
        score = 250;
      }
      // Contains query anywhere gets low priority
      else {
        score = 100;
      }
      
      // Bonus for shorter names (more specific)
      score += Math.max(0, 100 - item.name.length);
      
      // Penalty for "Minion" in name
      if (nameLower.includes('minion')) {
        score -= 50;
      }
      
      return { item, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(result => result.item);

  console.log(`📋 Found ${matches.length} matches`);

  if (matches.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">No items found</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = matches.map(item => `
    <div class="search-result-item" onclick="addFlipItem(${accountIndex}, ${flipIndex}, '${listType}', '${escapeHtml(item.id)}')">
      <img src="${getItemImageUrl(item)}" alt="${escapeHtml(item.name)}" class="result-icon" 
        onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.19/assets/minecraft/textures/item/stone.png'"/>
      <div class="result-info">
        <div class="result-name">${escapeHtml(item.name)}</div>
        <div class="result-id">${escapeHtml(item.id)}</div>
      </div>
    </div>
  `).join('');
  
  resultsDiv.style.display = 'block';
}

async function addFlipItem(accountIndex, flipIndex, listType, itemId) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const list = listType === 'whitelist' ? 'whitelist' : 'blacklistContaining';
  if (!flip[list]) flip[list] = [];
  
  if (flip[list].includes(itemId)) {
    showToast('Item already in list', 'info');
    return;
  }
  
  flip[list].push(itemId);
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      document.getElementById(`flip-${listType}-search-${accountIndex}-${flipIndex}`).value = '';
      document.getElementById(`flip-${listType}-results-${accountIndex}-${flipIndex}`).innerHTML = '';
      document.getElementById(`flip-${listType}-results-${accountIndex}-${flipIndex}`).style.display = 'none';
      
      const itemsContainer = document.getElementById(`flip-${listType}-items-${accountIndex}-${flipIndex}`);
      if (itemsContainer) {
        itemsContainer.innerHTML += renderFlipItemCard(itemId, accountIndex, flipIndex, listType);
      }
      
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      showToast('✅ Item added', 'success');
    } else {
      showToast('❌ Failed to add item', 'error');
    }
  } catch (error) {
    console.error('Error adding item:', error);
    showToast('❌ Failed to add item', 'error');
  }
}

async function removeFlipItem(accountIndex, flipIndex, listType, itemId) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  const list = listType === 'whitelist' ? 'whitelist' : 'blacklistContaining';
  if (!flip[list]) return;
  
  flip[list] = flip[list].filter(id => id !== itemId);
  
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'x-password': password
      },
      body: JSON.stringify(account)
    });
    
    if (res.ok) {
      const updated = await res.json();
      globalConfig.accounts[accountIndex] = updated;
      
      const itemsContainer = document.getElementById(`flip-${listType}-items-${accountIndex}-${flipIndex}`);
      if (itemsContainer) {
        itemsContainer.innerHTML = updated.flipConfigs[flipIndex][list].map(id => 
          renderFlipItemCard(id, accountIndex, flipIndex, listType)
        ).join('');
      }
      
      const section = document.getElementById(`flipper-config-${accountIndex}`);
      if (section) {
        section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
      }
      
      showToast('✅ Item removed', 'success');
    } else {
      showToast('❌ Failed to remove item', 'error');
    }
  } catch (error) {
    console.error('Error removing item:', error);
    showToast('❌ Failed to remove item', 'error');
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






















