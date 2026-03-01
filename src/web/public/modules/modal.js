/* ============================================
   MODAL MODULE - List Editor Modal
   ============================================ */

import { globalConfig } from './config.js';
import { renderItemCard } from './items.js';
import { escapeHtml } from './utils.js';

// ==================== LIST EDITOR MODAL ====================
export function openListEditorModal(accountIndex, listType) {
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

export function closeListEditorModal() {
  const modal = document.getElementById('list-editor-modal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

// Make functions globally available
window.openListEditorModal = openListEditorModal;
window.closeListEditorModal = closeListEditorModal;
