/* ============================================
   NPC FLIP ADDON FUNCTIONS
   ============================================ */

// NPC Item Search
function searchNPCItem(accountIndex, flipIndex, query) {
  const resultsDiv = document.getElementById(`npc-search-results-${accountIndex}-${flipIndex}`);
  
  if (!query || query.length < 2) {
    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'none';
    return;
  }

  console.log(`🔍 [NPC] Searching for "${query}" in ${skyblockItems.length} items`);

  const lowerQuery = query.toLowerCase();
  const matches = skyblockItems
    .filter(item => item.name.toLowerCase().includes(lowerQuery) || item.id.toLowerCase().includes(lowerQuery))
    .slice(0, 10);

  console.log(`📋 [NPC] Found ${matches.length} matches`);

  if (matches.length === 0) {
    resultsDiv.innerHTML = '<div class="search-result-item">No items found</div>';
    resultsDiv.style.display = 'block';
    return;
  }

  resultsDiv.innerHTML = matches.map(item => `
    <div class="search-result-item" onclick="selectNPCItem(${accountIndex}, ${flipIndex}, '${escapeHtml(item.id)}')">
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

function selectNPCItem(accountIndex, flipIndex, itemId) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  // Encontrar el item para mostrar su nombre
  const item = skyblockItems.find(i => i.id === itemId);
  const itemName = item ? item.name : itemId;
  
  flip.npcItem = itemId;
  
  fetch(`/api/account/${accountIndex}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-password': password
    },
    body: JSON.stringify(account)
  })
  .then(res => res.json())
  .then(updated => {
    globalConfig.accounts[accountIndex] = updated;
    
    // Close modal and re-render
    closeFlipEditModal();
    
    // Update card in flipper config section
    const section = document.getElementById(`flipper-config-${accountIndex}`);
    if (section) {
      section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
    }
    
    showToast(`✅ NPC item selected: ${itemName}`, 'success');
  })
  .catch(error => {
    console.error('Error selecting NPC item:', error);
    showToast('❌ Failed to select NPC item', 'error');
  });
}

function clearNPCItem(accountIndex, flipIndex) {
  const account = globalConfig.accounts[accountIndex];
  if (!account || !account.flipConfigs) return;
  
  const flip = account.flipConfigs[flipIndex];
  if (!flip) return;
  
  flip.npcItem = '';
  
  fetch(`/api/account/${accountIndex}`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'x-password': password
    },
    body: JSON.stringify(account)
  })
  .then(res => res.json())
  .then(updated => {
    globalConfig.accounts[accountIndex] = updated;
    
    // Close modal and re-render
    closeFlipEditModal();
    
    const section = document.getElementById(`flipper-config-${accountIndex}`);
    if (section) {
      section.innerHTML = renderFlipperConfigSection(updated, accountIndex);
    }
    
    showToast('✅ NPC item cleared', 'success');
  })
  .catch(error => {
    console.error('Error clearing NPC item:', error);
    showToast('❌ Failed to clear NPC item', 'error');
  });
}

function showNPCSearchResults(accountIndex, flipIndex) {
  const input = document.getElementById(`npc-item-search-${accountIndex}-${flipIndex}`);
  if (input && input.value.length >= 2) {
    searchNPCItem(accountIndex, flipIndex, input.value);
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
      
      showToast('✅ Flip deleted', 'success');
    } else {
      showToast('❌ Failed to delete flip', 'error');
    }
  } catch (error) {
    console.error('Error deleting flip:', error);
    showToast('❌ Failed to delete flip', 'error');
  }
}
