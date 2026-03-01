
/* ============================================
   ITEMS MODULE - Whitelist/Blacklist Management
   ============================================ */

import { globalConfig, password, skyblockItems } from './config.js';
import { escapeHtml, showToast } from './utils.js';

const API_URL = window.location.origin;

// ==================== ITEM RENDERING ====================
export function renderItemCard(itemId, accountIndex, listType, isModal = false) {
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

export function getItemImageUrl(item) {
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

// ==================== ITEM SEARCH ====================
export function searchItems(accountIndex, listType, query) {
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

export async function addItemToList(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    showToast(`Adding to ${listType}...`, 'info');
    
    const res = await fetch(`${API_URL}/api/account/${accountIndex}/${endpoint}`, {
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

export async function removeItem(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    showToast(`Removing from ${listType}...`, 'info');
    
    const res = await fetch(`${API_URL}/api/account/${accountIndex}/${endpoint}/${encodeURIComponent(itemId)}`, {
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

// ==================== MODAL FUNCTIONS ====================
export function searchItemsModal(accountIndex, listType, query) {
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

async function addItemToListModal(accountIndex, listType, itemId) {
  try {
    const endpoint = listType === 'whitelist' ? 'whitelist' : 'blacklist';
    showToast(`Adding to ${listType}...`, 'info');
    
    const res = await fetch(`${API_URL}/api/account/${accountIndex}/${endpoint}`, {
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
    
    const res = await fetch(`${API_URL}/api/account/${accountIndex}/${endpoint}/${encodeURIComponent(itemId)}`, {
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

// Make functions globally available
window.searchItems = searchItems;
window.addItemToList = addItemToList;
window.removeItem = removeItem;
window.searchItemsModal = searchItemsModal;
window.addItemToListModal = addItemToListModal;
window.removeItemModal = removeItemModal;

