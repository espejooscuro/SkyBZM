import axios from 'axios';

const API_BASE = '/api';

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default client;

// API Methods
export const api = {
  // Health check
  health: () => client.get('/health'),
  
  // Bots
  getBots: () => client.get('/bots'),
  getBot: (username) => client.get(`/bots/${username}`),
  startBot: (username) => client.post(`/bots/${username}/start`),
  stopBot: (username) => client.post(`/bots/${username}/stop`),
  restartBot: (username) => client.post(`/bots/${username}/restart`),
  
  // Bot data
  getBotActivity: (username, limit = 20) => client.get(`/bots/${username}/activity`, { params: { limit } }),
  getBotProfits: (username, limit = 50) => client.get(`/bots/${username}/profits`, { params: { limit } }),
  getBotMoneyFlow: (username, limit = 100) => client.get(`/bots/${username}/money-flow`, { params: { limit } }),
  
  // Configuration
  getConfig: () => client.get('/config'),
  updateConfig: (config) => client.put('/config', config),
  updateBotConfig: (username, updates) => client.put(`/bots/${username}/config`, updates)
};
