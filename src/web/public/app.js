







// Elements
const form = document.getElementById('passwordForm');
const errorDiv = document.getElementById('error');
const loginForm = document.getElementById('loginForm');
const dashboard = document.getElementById('dashboard');
const passwordInput = document.getElementById('password');
const tabsHeader = document.getElementById('tabsHeader');
const tabsContent = document.getElementById('tabsContent');

const API_URL = window.location.origin;

let currentConfig = null;
let currentPassword = null;
let currentTab = 0;
let expandedBots = new Set();
let skyblockItems = []; // Cache de items de Skyblock

// Event Listeners
form.addEventListener('submit', handleLogin);
passwordInput.focus();

// Cargar items de Skyblock al inicio
loadSkyblockItems();

// Load Skyblock Items
async function loadSkyblockItems() {
  try {
    const res = await fetch('/api/hypixel/items');
    const data = await res.json();
    skyblockItems = data.items || [];
    console.log(`✅ Loaded ${skyblockItems.length} Skyblock items`);
    console.log('📋 First 5 items:', skyblockItems.slice(0, 5).map(i => ({ id: i.id, name: i.name, material: i.material })));
  } catch (error) {
    console.error('Error loading Skyblock items:', error);
  }
}

// Handle Login
async function handleLogin(e) {
  e.preventDefault();
  const password = passwordInput.value;

  const submitBtn = form.querySelector('.btn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading"></span>';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });

    const data = await res.json();

    if (data.success) {
      currentPassword = password;
      currentConfig = data.config;
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

// Show Error Message
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.add('show');
  setTimeout(() => errorDiv.classList.remove('show'), 3000);
}

// Show Dashboard
function showDashboard(config) {
  loginForm.style.display = 'none';
  dashboard.classList.add('show');

  renderDashboard(config);
  startAutoReload();
}

// Render Dashboard completo
function renderDashboard(config) {
  const webhookSection = document.getElementById('webhookSection');
  const tabsContainer = document.querySelector('.tabs-container');
  
  // Renderizar webhook
  renderWebhook(config.discordWebhook);
  
  // Limpiar contenido de tabs y mostrar bots
  tabsContainer.innerHTML = `
    <div class="stats-bar">
      ${renderStatsBar(config.accounts)}
    </div>
    <div class="bots-grid">
      ${config.accounts.map((account, index) => renderBotCard(account, index)).join('')}
    </div>
  `;
}

// Render Stats Bar
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

// Render Bot Card con cabeza de Minecraft
function renderBotCard(account, index) {
  const isExpanded = expandedBots.has(index);
  
  return `
    <div class="bot-card ${isExpanded ? 'expanded' : ''}" id="bot-${index}">
      <div class="bot-header" onclick="toggleBotCard(${index})">
        <div class="bot-avatar">
          <img 
            src="https://mc-heads.net/head/${escapeHtml(account.username)}/64" 
            alt="${escapeHtml(account.username)}"
            onerror="this.src='https://minotar.net/avatar/${escapeHtml(account.username)}/64'"
          />
          <div class="bot-status-indicator ${account.enabled ? 'online' : 'offline'}"></div>
        </div>
        
        <div class="bot-info">
          <div class="bot-name">${escapeHtml(account.username)}</div>
          <div class="bot-stats">
            <div class="bot-stat">
              STATUS: <span class="bot-stat-value">${account.enabled ? '● ONLINE' : '○ OFFLINE'}</span>
            </div>
            <div class="bot-stat">
              FLIPS: <span class="bot-stat-value">${account.flips?.maxFlips || 0}</span>
            </div>
            <div class="bot-stat">
              ITEMS: <span class="bot-stat-value">${account.flips?.whitelist?.length || 0}</span>
            </div>
          </div>
        </div>

        <div class="bot-controls" onclick="event.stopPropagation()">
          <button class="bot-btn start" onclick="startBot(${index})">▶</button>
          <button class="bot-btn stop" onclick="stopBot(${index})">■</button>
          <button class="bot-btn restart" onclick="restartBot(${index})">↻</button>
        </div>

        <div class="bot-expand">▼</div>
      </div>

      <div class="bot-details">
        <div class="bot-details-content">
          ${renderBotDetails(account, index)}
        </div>
      </div>
    </div>
  `;
}

// Render detalles del bot
function renderBotDetails(account, index) {
  return `
    <div class="bot-details-grid">
      <!-- Columna izquierda: Configuración -->
      <div class="bot-config-column">
        <!-- Configuración General -->
        <div class="config-section">
          <h3>⚙️ General Config</h3>
          <div class="config-grid">
            <div class="config-item">
              <label class="config-label">Username</label>
              <div class="config-value">${escapeHtml(account.username)}</div>
            </div>
            <div class="config-item">
              <label class="config-label">Status</label>
              <div class="config-value">${account.enabled ? '✓ ENABLED' : '✗ DISABLED'}</div>
            </div>
          </div>
        </div>

        <!-- Configuración de Proxy -->
        <div class="config-section">
          <h3>🌐 Proxy Config</h3>
          ${renderProxyConfig(account.proxy, index)}
        </div>

        <!-- Configuración de Flips con Sliders -->
        <div class="config-section">
          <h3>💰 Flip Config</h3>
          ${renderFlipConfig(account.flips, index)}
        </div>

        <!-- Whitelist Editor -->
        <div class="config-section">
          <h3>✅ Whitelist Editor</h3>
          ${renderWhitelistEditor(account.flips, index)}
        </div>

        <!-- Blacklist Editor -->
        <div class="config-section">
          <h3>❌ Blacklist Editor</h3>
          ${renderBlacklistEditor(account.flips, index)}
        </div>
      </div>

      <!-- Columna derecha: Gráfico de Estadísticas -->
      <div class="bot-stats-column">
        ${renderStatsChart(account, index)}
      </div>
    </div>
  `;
}

// Render Proxy Config
function renderProxyConfig(proxy, index) {
  if (!proxy) {
    return '<div class="config-item"><div class="config-value">No proxy configured</div></div>';
  }

  return `
    <div class="config-grid">
      <div class="config-item">
        <label class="config-label">Host</label>
        <input 
          type="text" 
          class="config-value editable" 
          value="${escapeHtml(proxy.host)}"
          onchange="updateConfig(${index}, 'proxy.host', this.value)"
        />
      </div>
      <div class="config-item">
        <label class="config-label">Port</label>
        <input 
          type="number" 
          class="config-value editable" 
          value="${proxy.port}"
          onchange="updateConfig(${index}, 'proxy.port', parseInt(this.value))"
        />
      </div>
      <div class="config-item">
        <label class="config-label">Type</label>
        <div class="config-value">SOCKS${proxy.type}</div>
      </div>
      ${proxy.username ? `
      <div class="config-item">
        <label class="config-label">Username</label>
        <input 
          type="text" 
          class="config-value editable" 
          value="${escapeHtml(proxy.username)}"
          onchange="updateConfig(${index}, 'proxy.username', this.value)"
        />
      </div>` : ''}
    </div>
  `;
}

// Render Flip Config con Sliders
function renderFlipConfig(flips, index) {
  return `
    <div class="config-grid">
      <!-- Max Buy Price -->
      <div class="config-item">
        <label class="config-label">Max Buy Price</label>
        <div class="slider-container">
          <input 
            type="range" 
            class="slider" 
            min="100000" 
            max="50000000" 
            step="100000"
            value="${flips.maxBuyPrice}"
            oninput="updateSliderValue(this, 'maxBuyPrice-${index}')"
            onchange="updateConfig(${index}, 'flips.maxBuyPrice', parseInt(this.value))"
          />
          <div class="slider-value" id="maxBuyPrice-${index}">${formatNumber(flips.maxBuyPrice)} coins</div>
          <div class="slider-labels">
            <span>100K</span>
            <span>50M</span>
          </div>
        </div>
      </div>

      <!-- Min Profit -->
      <div class="config-item">
        <label class="config-label">Min Profit</label>
        <div class="slider-container">
          <input 
            type="range" 
            class="slider" 
            min="1000" 
            max="1000000" 
            step="1000"
            value="${flips.minProfit}"
            oninput="updateSliderValue(this, 'minProfit-${index}')"
            onchange="updateConfig(${index}, 'flips.minProfit', parseInt(this.value))"
          />
          <div class="slider-value" id="minProfit-${index}">${formatNumber(flips.minProfit)} coins</div>
          <div class="slider-labels">
            <span>1K</span>
            <span>1M</span>
          </div>
        </div>
      </div>

      <!-- Min Volume -->
      <div class="config-item">
        <label class="config-label">Min Volume</label>
        <div class="slider-container">
          <input 
            type="range" 
            class="slider" 
            min="10" 
            max="10000" 
            step="10"
            value="${flips.minVolume}"
            oninput="updateSliderValue(this, 'minVolume-${index}')"
            onchange="updateConfig(${index}, 'flips.minVolume', parseInt(this.value))"
          />
          <div class="slider-value" id="minVolume-${index}">${formatNumber(flips.minVolume)} sales/day</div>
          <div class="slider-labels">
            <span>10</span>
            <span>10K</span>
          </div>
        </div>
      </div>

      <!-- Max Flips -->
      <div class="config-item">
        <label class="config-label">Max Flips</label>
        <div class="slider-container">
          <input 
            type="range" 
            class="slider" 
            min="1" 
            max="20" 
            step="1"
            value="${flips.maxFlips}"
            oninput="updateSliderValue(this, 'maxFlips-${index}')"
            onchange="updateConfig(${index}, 'flips.maxFlips', parseInt(this.value))"
          />
          <div class="slider-value" id="maxFlips-${index}">${flips.maxFlips}</div>
          <div class="slider-labels">
            <span>1</span>
            <span>20</span>
          </div>
        </div>
      </div>

      <!-- Max Relist -->
      <div class="config-item">
        <label class="config-label">Max Relist</label>
        <div class="slider-container">
          <input 
            type="range" 
            class="slider" 
            min="1" 
            max="10" 
            step="1"
            value="${flips.maxRelist}"
            oninput="updateSliderValue(this, 'maxRelist-${index}')"
            onchange="updateConfig(${index}, 'flips.maxRelist', parseInt(this.value))"
          />
          <div class="slider-value" id="maxRelist-${index}">${flips.maxRelist}</div>
          <div class="slider-labels">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Render Whitelist Editor
function renderWhitelistEditor(flips, index) {
  const whitelist = flips.whitelist || [];
  
  return `
    <div class="item-editor">
      <!-- Search Bar con Autocompletado -->
      <div class="search-container">
        <input 
          type="text" 
          class="item-search" 
          id="whitelist-search-${index}"
          placeholder="Search items..."
          oninput="searchItems(${index}, 'whitelist', this.value)"
          autocomplete="off"
        />
        <div class="search-results" id="whitelist-results-${index}"></div>
      </div>

      <!-- Lista de Items -->
      <div class="items-grid" id="whitelist-items-${index}">
        ${whitelist.map(itemId => renderItemCard(itemId, index, 'whitelist')).join('')}
      </div>
    </div>
  `;
}

// Render Blacklist Editor
function renderBlacklistEditor(flips, index) {
  const blacklist = flips.blacklistContaining || [];
  
  return `
    <div class="item-editor">
      <!-- Search Bar con Autocompletado -->
      <div class="search-container">
        <input 
          type="text" 
          class="item-search" 
          id="blacklist-search-${index}"
          placeholder="Search items..."
          oninput="searchItems(${index}, 'blacklist', this.value)"
          autocomplete="off"
        />
        <div class="search-results" id="blacklist-results-${index}"></div>
      </div>

      <!-- Lista de Items -->
      <div class="items-grid" id="blacklist-items-${index}">
        ${blacklist.map(itemId => renderItemCard(itemId, index, 'blacklist')).join('')}
      </div>
    </div>
  `;
}

// Render Stats Chart
function renderStatsChart(account, index) {
  return `
    <div class="stats-chart-card">
      <h3>📊 Earnings Stats</h3>
      
      <!-- Resumen de estadísticas -->
      <div class="stats-chart-summary" id="stats-summary-${index}">
        <div class="stat-mini-card">
          <div class="label">Total Gain</div>
          <div class="value">Loading...</div>
        </div>
        <div class="stat-mini-card">
          <div class="label">Coins/Hour</div>
          <div class="value">Loading...</div>
        </div>
        <div class="stat-mini-card">
          <div class="label">Total Time</div>
          <div class="value">Loading...</div>
        </div>
        <div class="stat-mini-card">
          <div class="label">Current Purse</div>
          <div class="value">Loading...</div>
        </div>
      </div>

      <!-- Chart Container -->
      <div class="chart-container" id="chart-container-${index}">
        <div class="chart-loading">
          <div class="loading"></div>
          <p>Loading chart data...</p>
        </div>
      </div>

      <!-- Info del gráfico -->
      <div class="chart-info">
        <div class="chart-info-item">
          <div class="chart-info-dot start"></div>
          <span>Start Purse</span>
        </div>
        <div class="chart-info-item">
          <div class="chart-info-dot current"></div>
          <span>Current Purse</span>
        </div>
      </div>
    </div>
  `;
}

// Render Item Card
function renderItemCard(itemId, accountIndex, listType) {
  const item = skyblockItems.find(i => i.id === itemId);
  
  // Debug logging
  if (!item) {
    console.warn(`⚠️ Item not found in skyblockItems: "${itemId}"`);
    console.log(`🔍 Total items loaded: ${skyblockItems.length}`);
    console.log(`🔍 Searching for similar items...`);
    const similar = skyblockItems.filter(i => i.id.includes(itemId) || itemId.includes(i.id)).slice(0, 3);
    if (similar.length > 0) {
      console.log(`📦 Similar items found:`, similar.map(i => i.id));
    }
  } else {
    console.log(`✅ Found item: ${item.name} (${item.id}) - Material: ${item.material}`);
  }
  
  const itemName = item ? item.name : itemId;
  const material = item ? item.material : 'STONE';
  
  // Determinar URL de la imagen del item
  const imageUrl = item ? getItemImageUrl(item) : 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/block/stone.png';
  
  console.log(`🖼️ Image URL for ${itemId}: ${imageUrl}`);
  
  return `
    <div class="item-card ${listType}">
      <img src="${imageUrl}" alt="${escapeHtml(itemName)}" class="item-icon" onerror="this.src='https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/block/stone.png'; console.error('Failed to load image:', '${imageUrl}')"/>
      <div class="item-info">
        <div class="item-name">${escapeHtml(itemName)}</div>
        <div class="item-id">${escapeHtml(itemId)}</div>
      </div>
      <button class="item-remove" onclick="removeItem(${accountIndex}, '${listType}', '${escapeHtml(itemId)}')">✖</button>
    </div>
  `;
}

// Get Item Image URL
function getItemImageUrl(item) {
  if (!item) {
    console.warn('⚠️ getItemImageUrl called with null/undefined item');
    return 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/item/barrier.png';
  }
  
  // Si tiene skin (skull item), decodificar el Base64 para obtener la textura real
  if (item.skin && item.skin.value) {
    try {
      // Decodificar el Base64
      const decoded = atob(item.skin.value);
      const skinData = JSON.parse(decoded);
      
      // Extraer la URL de la textura
      if (skinData.textures && skinData.textures.SKIN && skinData.textures.SKIN.url) {
        const textureUrl = skinData.textures.SKIN.url;
        console.log(`🎭 Found skull texture: ${textureUrl}`);
        
        // La URL viene como: http://textures.minecraft.net/texture/HASH
        // Podemos usar esta URL directamente o convertirla a un servicio de renderizado
        // Para obtener una vista 3D de la cabeza, usamos mc-heads.net con el hash
        const textureHash = textureUrl.split('/').pop();
        return `https://mc-heads.net/head/${textureHash}/32`;
      }
    } catch (error) {
      console.warn('⚠️ Failed to decode skin data:', error);
    }
  }
  
  // Leer el material del item
  let material = (item.material || 'STONE').toLowerCase();
  
  console.log(`🔍 Processing material: "${item.material}" -> "${material}"`);
  
  // Mapeo de materiales especiales de Minecraft
  const materialMap = {
    // Herramientas de madera
    'wood_hoe': 'wooden_hoe',
    'wood_sword': 'wooden_sword',
    'wood_axe': 'wooden_axe',
    'wood_pickaxe': 'wooden_pickaxe',
    'wood_shovel': 'wooden_shovel',
    // Herramientas de oro
    'gold_hoe': 'golden_hoe',
    'gold_sword': 'golden_sword',
    'gold_axe': 'golden_axe',
    'gold_pickaxe': 'golden_pickaxe',
    'gold_shovel': 'golden_shovel',
    // Armadura de oro
    'gold_helmet': 'golden_helmet',
    'gold_chestplate': 'golden_chestplate',
    'gold_leggings': 'golden_leggings',
    'gold_boots': 'golden_boots',
    // Armadura de cuero
    'leather_helmet': 'leather_helmet',
    'leather_chestplate': 'leather_chestplate',
    'leather_leggings': 'leather_leggings',
    'leather_boots': 'leather_boots',
    // Herramientas de hierro
    'iron_hoe': 'iron_hoe',
    'iron_sword': 'iron_sword',
    'iron_axe': 'iron_axe',
    'iron_pickaxe': 'iron_pickaxe',
    'iron_shovel': 'iron_shovel',
    // Herramientas de diamante
    'diamond_hoe': 'diamond_hoe',
    'diamond_sword': 'diamond_sword',
    'diamond_axe': 'diamond_axe',
    'diamond_pickaxe': 'diamond_pickaxe',
    'diamond_shovel': 'diamond_shovel',
    // Herramientas de netherite
    'netherite_hoe': 'netherite_hoe',
    'netherite_sword': 'netherite_sword',
    'netherite_axe': 'netherite_axe',
    'netherite_pickaxe': 'netherite_pickaxe',
    'netherite_shovel': 'netherite_shovel',
    // Otros items comunes
    'skull_item': 'player_head',
    'name_tag': 'name_tag',
    'compass': 'compass',
    'stick': 'stick',
    'bone': 'bone',
    'ender_pearl': 'ender_pearl',
    'blaze_rod': 'blaze_rod',
    'ghast_tear': 'ghast_tear',
    'nether_star': 'nether_star',
    'slime_ball': 'slime_ball',
    'magma_cream': 'magma_cream',
    'clay_ball': 'clay_ball',
    'paper': 'paper',
    'book': 'book',
    'enchanted_book': 'enchanted_book',
    'cookie': 'cookie',
    'wheat': 'wheat',
    'carrot': 'carrot',
    'potato': 'potato',
    'sugar_cane': 'sugar_cane',
    'cactus': 'cactus'
  };
  
  // Si existe un mapeo específico, usarlo
  if (materialMap[material]) {
    console.log(`✅ Material mapped: "${material}" -> "${materialMap[material]}"`);
    material = materialMap[material];
  }
  
  // Detectar si es un bloque o un item
  const blockMaterials = [
    'stone', 'cobblestone', 'dirt', 'grass_block', 'sand', 'gravel', 
    'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
    'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks',
    'glass', 'glowstone', 'obsidian', 'bedrock', 'netherrack', 'end_stone',
    'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'emerald_ore', 'lapis_ore', 'redstone_ore',
    'coal_block', 'iron_block', 'gold_block', 'diamond_block', 'emerald_block', 'lapis_block', 'redstone_block',
    'tnt', 'sponge', 'bookshelf', 'crafting_table', 'furnace', 'chest', 'ender_chest',
    'white_wool', 'orange_wool', 'magenta_wool', 'light_blue_wool', 'yellow_wool', 'lime_wool',
    'pink_wool', 'gray_wool', 'light_gray_wool', 'cyan_wool', 'purple_wool', 'blue_wool',
    'brown_wool', 'green_wool', 'red_wool', 'black_wool',
    'terracotta', 'clay', 'pumpkin', 'melon',
    'bamboo', 'kelp', 'sea_pickle', 'coral_block', 'prismarine'
  ];
  
  const textureType = blockMaterials.includes(material) ? 'block' : 'item';
  
  const finalUrl = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/21w20a/assets/minecraft/textures/${textureType}/${material}.png`;
  console.log(`🖼️ Final URL: ${finalUrl}`);
  
  return finalUrl;
}

// Search Items (Autocompletado)
function searchItems(accountIndex, listType, query) {
  const resultsDiv = document.getElementById(`${listType}-results-${accountIndex}`);
  
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    return;
  }

  const lowerQuery = query.toLowerCase();
  const matches = skyblockItems
    .filter(item => 
      item.name.toLowerCase().includes(lowerQuery) || 
      item.id.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10); // Limitar a 10 resultados

  if (matches.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">No items found</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = matches.map(item => `
    <div class="search-result-item" onclick="addItemToList(${accountIndex}, '${listType}', '${escapeHtml(item.id)}')">
      <img src="${getItemImageUrl(item)}" alt="${escapeHtml(item.name)}" class="result-icon" onerror="this.src='https://mcasset.cloud/21w20a/assets/minecraft/textures/item/stone.png'"/>
      <div class="result-info">
        <div class="result-name">${escapeHtml(item.name)}</div>
        <div class="result-id">${escapeHtml(item.id)}</div>
      </div>
    </div>
  `).join('');
  
  resultsDiv.style.display = 'block';
}

// Add Item to List
async function addItemToList(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    
    const res = await fetch(`/api/account/${accountIndex}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-password': currentPassword
      },
      body: JSON.stringify({ itemId })
    });

    const data = await res.json();
    
    if (data.success) {
      // Limpiar búsqueda
      document.getElementById(`${listType}-search-${accountIndex}`).value = '';
      document.getElementById(`${listType}-results-${accountIndex}`).innerHTML = '';
      document.getElementById(`${listType}-results-${accountIndex}`).style.display = 'none';
      
      // Actualizar la lista visualmente
      const itemsContainer = document.getElementById(`${listType}-items-${accountIndex}`);
      itemsContainer.innerHTML += renderItemCard(itemId, accountIndex, listType);
      
      console.log(`✅ Item added to ${listType}:`, itemId);
    } else {
      showError(data.error || 'Error adding item');
    }
  } catch (error) {
    console.error('Error adding item:', error);
    showError('Error adding item');
  }
}

// Remove Item from List
async function removeItem(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    
    const res = await fetch(`/api/account/${accountIndex}/${endpoint}/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
      headers: {
        'x-password': currentPassword
      }
    });

    const data = await res.json();
    
    if (data.success) {
      // Remover el elemento visualmente
      const itemsContainer = document.getElementById(`${listType}-items-${accountIndex}`);
      itemsContainer.innerHTML = data[endpoint].map(id => renderItemCard(id, accountIndex, listType)).join('');
      
      console.log(`✅ Item removed from ${listType}:`, itemId);
    } else {
      showError(data.error || 'Error removing item');
    }
  } catch (error) {
    console.error('Error removing item:', error);
    showError('Error removing item');
  }
}

// Toggle Bot Card Expansion
function toggleBotCard(index) {
  const card = document.getElementById(`bot-${index}`);
  
  if (expandedBots.has(index)) {
    expandedBots.delete(index);
    card.classList.remove('expanded');
  } else {
    expandedBots.add(index);
    card.classList.add('expanded');
    
    // Cargar estadísticas cuando se expande la tarjeta
    loadBotStats(index);
  }
}

// Cargar estadísticas del bot desde el servidor
async function loadBotStats(accountIndex) {
  const account = currentConfig.accounts[accountIndex];
  if (!account) {
    console.error('Account not found:', accountIndex);
    return;
  }

  const username = account.username;
  console.log(`📊 Loading stats for ${username}...`);

  try {
    // Llamar al endpoint de estadísticas del servidor
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/stats`, {
      method: 'GET',
      headers: {
        'x-password': currentPassword
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Stats loaded for ${username}:`, data);

    // Renderizar el gráfico con los datos
    renderChart(accountIndex, data);
    
    // 🔥 Auto-refresh cada 5 segundos si la tarjeta está expandida
    setTimeout(() => {
      if (expandedBots.has(accountIndex)) {
        loadBotStats(accountIndex);
      }
    }, 5000);
  } catch (error) {
    console.error(`❌ Error loading stats for ${username}:`, error);
    showChartError(accountIndex, 'Failed to load stats');
  }
}

// Renderizar el gráfico con los datos
function renderChart(accountIndex, statsData) {
  const containerEl = document.getElementById(`chart-container-${accountIndex}`);
  const summaryEl = document.getElementById(`stats-summary-${accountIndex}`);
  
  if (!containerEl || !summaryEl) {
    console.error('Chart elements not found');
    return;
  }

  // Si no hay datos de historial, mostrar mensaje
  if (!statsData.purseHistory || statsData.purseHistory.length === 0) {
    containerEl.innerHTML = `
      <div class="chart-empty">
        <p>💰</p>
        <p>No stats data available yet.</p>
        <p>Start the bot to begin collecting data.</p>
      </div>
    `;
    
    summaryEl.innerHTML = `
      <div class="stat-mini-card">
        <div class="label">Total Gain</div>
        <div class="value neutral">0</div>
      </div>
      <div class="stat-mini-card">
        <div class="label">Coins/Hour</div>
        <div class="value neutral">0</div>
      </div>
      <div class="stat-mini-card">
        <div class="label">Total Time</div>
        <div class="value neutral">0h 0m</div>
      </div>
      <div class="stat-mini-card">
        <div class="label">Current Purse</div>
        <div class="value neutral">0</div>
      </div>
    `;
    return;
  }

  // Procesar datos para el gráfico
  const history = statsData.purseHistory;
  const labels = history.map(point => {
    const date = new Date(point.timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  });
  const values = history.map(point => point.purse);

  // Calcular estadísticas
  const first = history[0];
  const last = history[history.length - 1];
  const totalGain = last.purse - first.purse;
  const totalSeconds = last.runtime - first.runtime;
  const totalHours = totalSeconds / 3600;
  const coinsPerHour = totalHours > 0 ? totalGain / totalHours : 0;

  // Formatear tiempo
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const timeFormatted = `${hours}h ${minutes}m`;

  // Actualizar resumen
  summaryEl.innerHTML = `
    <div class="stat-mini-card">
      <div class="label">Total Gain</div>
      <div class="value ${totalGain >= 0 ? '' : 'negative'}">${formatNumber(totalGain)}</div>
    </div>
    <div class="stat-mini-card">
      <div class="label">Coins/Hour</div>
      <div class="value">${formatNumber(coinsPerHour)}</div>
    </div>
    <div class="stat-mini-card">
      <div class="label">Total Time</div>
      <div class="value neutral">${timeFormatted}</div>
    </div>
    <div class="stat-mini-card">
      <div class="label">Current Purse</div>
      <div class="value">${formatNumber(last.purse)}</div>
    </div>
  `;

  // Crear canvas para el gráfico
  containerEl.innerHTML = '<canvas id="chart-canvas-' + accountIndex + '"></canvas>';
  const canvas = document.getElementById(`chart-canvas-${accountIndex}`);
  
  if (!canvas) {
    console.error('Canvas not created');
    return;
  }

  // Destruir gráfico anterior si existe
  const chartId = `chart-${accountIndex}`;
  if (window[chartId]) {
    window[chartId].destroy();
  }

  // Crear nuevo gráfico
  const ctx = canvas.getContext('2d');
  window[chartId] = new Chart(ctx, {
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
        pointRadius: 0,
        pointHoverRadius: 0,
        pointBackgroundColor: 'transparent',
        pointBorderColor: 'transparent'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1C1C1C',
          titleColor: '#FFD700',
          bodyColor: '#FFF',
          borderColor: '#000',
          borderWidth: 2,
          padding: 12,
          displayColors: false,
          titleFont: {
            family: 'Press Start 2P',
            size: 8
          },
          bodyFont: {
            family: 'Press Start 2P',
            size: 8
          },
          callbacks: {
            label: function(context) {
              return 'Purse: ' + formatNumber(context.parsed.y);
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            borderColor: '#000',
            borderWidth: 2
          },
          ticks: {
            color: '#AAA',
            font: {
              family: 'Press Start 2P',
              size: 6
            },
            maxRotation: 45,
            minRotation: 45
          }
        },
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)',
            borderColor: '#000',
            borderWidth: 2
          },
          ticks: {
            color: '#AAA',
            font: {
              family: 'Press Start 2P',
              size: 6
            },
            callback: function(value) {
              return formatNumber(value);
            }
          }
        }
      }
    }
  });

  console.log(`✅ Chart rendered for account ${accountIndex}`);
}

// Mostrar error en el gráfico
function showChartError(accountIndex, message) {
  const containerEl = document.getElementById(`chart-container-${accountIndex}`);
  const summaryEl = document.getElementById(`stats-summary-${accountIndex}`);
  
  if (containerEl) {
    containerEl.innerHTML = `
      <div class="chart-empty">
        <p>⚠️</p>
        <p>${escapeHtml(message)}</p>
        <p>Please try again later.</p>
      </div>
    `;
  }
  
  if (summaryEl) {
    summaryEl.innerHTML = `
      <div class="stat-mini-card">
        <div class="label">Total Gain</div>
        <div class="value neutral">N/A</div>
      </div>
      <div class="stat-mini-card">
        <div class="label">Coins/Hour</div>
        <div class="value neutral">N/A</div>
      </div>
      <div class="stat-mini-card">
        <div class="label">Total Time</div>
        <div class="value neutral">N/A</div>
      </div>
      <div class="stat-mini-card">
        <div class="label">Current Purse</div>
        <div class="value neutral">N/A</div>
      </div>
    `;
  }
}

// Update Slider Value Display
function updateSliderValue(slider, elementId) {
  const value = parseInt(slider.value);
  const element = document.getElementById(elementId);
  
  if (elementId.includes('maxBuyPrice') || elementId.includes('minProfit')) {
    element.textContent = formatNumber(value) + ' coins';
  } else if (elementId.includes('minVolume')) {
    element.textContent = formatNumber(value) + ' sales/day';
  } else {
    element.textContent = value;
  }
}

// Update Config
async function updateConfig(accountIndex, path, value) {
  try {
    const res = await fetch(`/api/account/${accountIndex}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-password': currentPassword
      },
      body: JSON.stringify({ path, value })
    });

    const data = await res.json();
    
    if (data.success) {
      currentConfig = data.config;
      console.log(`✅ Config updated: ${path} = ${value}`);
    } else {
      showError(data.error || 'Error updating config');
    }
  } catch (error) {
    console.error('Error updating config:', error);
    showError('Error updating config');
  }
}

// Render Webhook
function renderWebhook(webhook) {
  const webhookEl = document.getElementById('webhook');
  if (!webhook || webhook.trim() === '') {
    webhookEl.textContent = 'Not configured';
    webhookEl.classList.add('empty');
  } else {
    const webhookShort = webhook.length > 60 
      ? webhook.substring(0, 60) + '...' 
      : webhook;
    webhookEl.textContent = webhookShort;
    webhookEl.title = webhook;
    webhookEl.classList.remove('empty');
  }
}

// Logout
function logout() {
  currentPassword = null;
  dashboard.classList.remove('show');
  loginForm.style.display = 'block';
  passwordInput.value = '';
  passwordInput.focus();
  stopAutoReload();
  currentConfig = null;
  currentTab = 0;
  expandedBots.clear();
}

// Utility Functions
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString('en-US');
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-reload config every 30 seconds
let autoReloadInterval = null;

function startAutoReload() {
  autoReloadInterval = setInterval(async () => {
    if (!currentPassword) return;

    try {
      const res = await fetch('/api/config', {
        headers: { 'x-password': currentPassword }
      });

      const data = await res.json();
      if (data.success) {
        currentConfig = data.config;
        renderDashboard(data.config);
      }
    } catch (error) {
      console.error('Auto-reload error:', error);
    }
  }, 30000);
}

function stopAutoReload() {
  if (autoReloadInterval) {
    clearInterval(autoReloadInterval);
    autoReloadInterval = null;
  }
}

// Cerrar resultados de búsqueda al hacer click fuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container')) {
    document.querySelectorAll('.search-results').forEach(div => {
      div.style.display = 'none';
    });
  }
});

// ==================== BOT CONTROL FUNCTIONS ====================

async function startBot(accountIndex) {
  const account = currentConfig.accounts[accountIndex];
  if (!account) {
    showToast('❌ Bot not found', 'error');
    return;
  }
  
  const username = account.username;
  
  try {
    showToast(`🚀 Starting bot: ${username}...`, 'info');
    
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-password': currentPassword
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast(`✅ ${result.message}`, 'success');
      // Refresh account status after 2 seconds
      setTimeout(async () => {
        const res = await fetch('/api/config', {
          headers: { 'x-password': currentPassword }
        });
        const data = await res.json();
        if (data.success) {
          currentConfig = data.config;
          renderDashboard(data.config);
        }
      }, 2000);
    } else {
      showToast(`❌ ${result.message || result.error}`, 'error');
    }
  } catch (error) {
    console.error('Error starting bot:', error);
    showToast(`❌ Failed to start bot: ${error.message}`, 'error');
  }
}

async function stopBot(accountIndex) {
  const account = currentConfig.accounts[accountIndex];
  if (!account) {
    showToast('❌ Bot not found', 'error');
    return;
  }
  
  const username = account.username;
  
  if (!confirm(`⚠️ Stop bot ${username}?`)) {
    return;
  }
  
  try {
    showToast(`🛑 Stopping bot: ${username}...`, 'info');
    
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/stop`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-password': currentPassword
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast(`✅ ${result.message}`, 'success');
      // Refresh account status after 1 second
      setTimeout(async () => {
        const res = await fetch('/api/config', {
          headers: { 'x-password': currentPassword }
        });
        const data = await res.json();
        if (data.success) {
          currentConfig = data.config;
          renderDashboard(data.config);
        }
      }, 1000);
    } else {
      showToast(`❌ ${result.message || result.error}`, 'error');
    }
  } catch (error) {
    console.error('Error stopping bot:', error);
    showToast(`❌ Failed to stop bot: ${error.message}`, 'error');
  }
}

async function restartBot(accountIndex) {
  const account = currentConfig.accounts[accountIndex];
  if (!account) {
    showToast('❌ Bot not found', 'error');
    return;
  }
  
  const username = account.username;
  
  if (!confirm(`🔄 Restart bot ${username}? (Will wait 5 seconds before reconnecting)`)) {
    return;
  }
  
  try {
    showToast(`🔄 Restarting bot: ${username}... (5 second delay)`, 'info');
    
    const response = await fetch(`${API_URL}/api/bot/${accountIndex}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-password': currentPassword
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      showToast(`✅ ${result.message}`, 'success');
      // Refresh account status after 6 seconds (5 second delay + 1 for connection)
      setTimeout(async () => {
        const res = await fetch('/api/config', {
          headers: { 'x-password': currentPassword }
        });
        const data = await res.json();
        if (data.success) {
          currentConfig = data.config;
          renderDashboard(data.config);
        }
      }, 6000);
    } else {
      showToast(`❌ ${result.message || result.error}`, 'error');
    }
  } catch (error) {
    console.error('Error restarting bot:', error);
    showToast(`❌ Failed to restart bot: ${error.message}`, 'error');
  }
}

// Helper function to show toast notifications
function showToast(message, type = 'info') {
  // Remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}


















