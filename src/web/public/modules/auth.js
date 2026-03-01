
/* ============================================
   AUTHENTICATION MODULE
   ============================================ */

import { setPassword, setGlobalConfig, clearState } from './config.js';
import { showError } from './utils.js';
import { showDashboard } from './render.js';
import { stopGlobalPolling } from './polling.js';

// ==================== AUTH ====================
export async function handleLogin(e) {
  e.preventDefault();
  const form = document.getElementById('passwordForm');
  const passwordInput = document.getElementById('password');
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
      setPassword(pwd);
      setGlobalConfig(data.config);
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

export function logout() {
  const loginForm = document.getElementById('loginForm');
  const dashboard = document.getElementById('dashboard');
  
  clearState();
  stopGlobalPolling();
  loginForm.classList.remove('hidden');
  dashboard.classList.remove('show');
}

// Setup event listeners
export function initAuth() {
  const form = document.getElementById('passwordForm');
  const passwordInput = document.getElementById('password');
  
  if (form && passwordInput) {
    form.addEventListener('submit', handleLogin);
    passwordInput.focus();
    console.log('✅ Auth initialized successfully');
  } else {
    console.error('❌ Auth elements not found');
  }
}

// Make logout globally available
window.logout = logout;

