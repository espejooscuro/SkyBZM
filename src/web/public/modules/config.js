
/* ============================================
   CONFIGURATION AND STATE MANAGEMENT
   ============================================ */

import { formatNumber } from './utils.js';

// Global State
export let globalConfig = null;
export let password = null;
export let expandedBots = new Set();
export let activeBotSections = new Map();
export let skyblockItems = [];
export let updateIntervals = new Map();
export let botCharts = new Map();
export let purseCharts = new Map();
export let cumulativeCharts = new Map();
export let expandedChart = new Map();

export function setPassword(pwd) {
  password = pwd;
}

export function setGlobalConfig(config) {
  globalConfig = config;
}

export function clearState() {
  password = null;
  globalConfig = null;
  botCharts.clear();
  purseCharts.clear();
  cumulativeCharts.clear();
  expandedBots.clear();
  activeBotSections.clear();
}

// ==================== DATA LOADING ====================
export async function loadSkyblockItems() {
  try {
    const res = await fetch('https://api.hypixel.net/resources/skyblock/items');
    const data = await res.json();
    skyblockItems = data.items || [];
    console.log(`✅ Loaded ${skyblockItems.length} Skyblock items`);
  } catch (error) {
    console.error('Error loading Skyblock items:', error);
  }
}

// ==================== CONFIG UPDATE FUNCTIONS ====================
export async function updateConfig(accountIndex, field, value) {
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

export async function updateRestSchedule(accountIndex, field, value) {
  try {
    const config = globalConfig.accounts[accountIndex];
    const keys = field.split('.');
    let target = config.restSchedule;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!target[keys[i]]) target[keys[i]] = {};
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

// ==================== SLIDER FUNCTIONS ====================
export function updateActiveHoursSlider(accountIndex, value) {
  const slider = document.getElementById(`active-hours-slider-${accountIndex}`);
  const valueEl = document.getElementById(`active-hours-value-${accountIndex}`);
  
  if (!slider || !valueEl) return;
  
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  const progress = ((value - min) / (max - min)) * 100;
  
  slider.style.setProperty('--slider-progress', `${progress}%`);
  valueEl.textContent = `${value}h`;
  
  // Update description with rest hours
  const description = slider.closest('.bot-config-row').querySelector('.bot-config-description');
  if (description) {
    const restHours = 24 - parseInt(value);
    description.textContent = `Hours active per day (rest: ${restHours}h). Lower is safer.`;
  }
}

export function updateSliderValue(slider, elementId, unit = '') {
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

export function initializeAllSliders(accounts) {
  accounts.forEach((account, index) => {
    // Initialize all sliders for this account
    document.querySelectorAll(`#bot-${index} .slider`).forEach(slider => {
      const elementId = slider.getAttribute('oninput')?.match(/['"]([^'"]+)['"]/)?.[1];
      if (elementId) {
        updateSliderValue(slider, elementId);
      }
    });
  });
}

export function toggleConfigSection(header) {
  const section = header.closest('.config-section');
  if (!section) return;
  
  const content = section.querySelector('.config-section-content');
  const expandIcon = section.querySelector('.config-expand');
  
  if (!content || !expandIcon) return;
  
  const isCollapsed = content.style.maxHeight === '0px' || !content.style.maxHeight;
  
  if (isCollapsed) {
    content.style.maxHeight = content.scrollHeight + 'px';
    expandIcon.style.transform = 'rotate(180deg)';
  } else {
    content.style.maxHeight = '0px';
    expandIcon.style.transform = 'rotate(0deg)';
  }
}

// Make functions globally available
window.updateConfig = updateConfig;
window.updateRestSchedule = updateRestSchedule;
window.toggleConfigSection = toggleConfigSection;
window.updateSliderValue = updateSliderValue;
window.updateActiveHoursSlider = updateActiveHoursSlider;

