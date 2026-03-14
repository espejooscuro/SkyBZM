





// API client matching SkyBZM server endpoints
const API_BASE = import.meta.env.VITE_API_URL || '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

// === Types ===

export interface CraftSlot {
  item?: string;
  count?: number;
}

export interface FlipConfig {
  id?: string;
  type: 'sell_order' | 'npc' | 'kat' | 'forge' | 'craft';
  name?: string;
  enabled?: boolean;
  // Sell Order
  maxBuyPrice?: number;
  minProfit?: number;
  minVolume?: number;
  maxFlips?: number;
  maxRelist?: number;
  maxBuyRelist?: number;
  minOrder?: number;
  maxOrder?: number;
  minSpread?: number;
  whitelist?: string[];
  blacklistContaining?: string[];
  // NPC
  item?: string;
  quantity?: number;
  forceSellAfter?: number; // minutes
  // Kat
  pet?: string;
  useKatFlower?: boolean;
  // Forge
  // just item
  // Craft
  craftGrid?: CraftSlot[][];
  craftedItem?: string;
  instasell?: boolean;
  instacraft?: boolean;
  craftItemType?: 'ah' | 'bz';
  config?: Record<string, any>;
}

export interface RestSchedule {
  shortBreaks?: { enabled: boolean; workDuration: number; breakDuration: number };
  dailyRest?: { enabled: boolean; workDuration: number };
}

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export interface BoosterCookie {
  enabled: boolean;
  useWhenTimeLeft: number; // hours, 0-96 (4 days)
}

export interface Account {
  username: string;
  password?: string;
  enabled?: boolean;
  autoStart?: boolean;
  proxy?: ProxyConfig;
  flips?: Record<string, any>;
  flipConfigs?: FlipConfig[];
  restSchedule?: RestSchedule;
  boosterCookie?: BoosterCookie;
}

export interface AppConfig {
  webPassword?: string;
  discordWebhook?: string;
  accounts: Account[];
  restSchedule?: RestSchedule;
}

export interface BotStatusInfo {
  username: string;
  connected: boolean;
  state: 'connected' | 'connecting' | 'disconnected';
  exists?: boolean;
  health?: {
    lastHeartbeat?: number;
    lastActivity?: number;
  };
  purse?: number;
  purseHistory?: Array<{ timestamp: number; purse: number; runtime: number }>;
  totalExpenses?: number;
}

export interface ActivityLog {
  timestamp: number;
  message: string;
  level: string;
  type?: string;
}

export interface ProfitEntry {
  item: string;
  profit: number;
  buyPrice: number;
  sellPrice: number;
  timestamp: number;
  flipType?: string;
}

export interface MoneyFlowEntry {
  type: string;
  amount: number;
  item?: string;
  timestamp: number;
}

export interface FlipActionEntry {
  timestamp: number;
  type: 'npcbuy' | 'npcsell' | 'buy' | 'sell';
  item: string;
}

// === Health ===
export const getHealth = () =>
  request<{ status: string; timestamp: number; bots: BotStatusInfo[] }>('/api/health');

// === Auth ===
export const login = (password: string) =>
  request<{ success: boolean; message: string }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

// === Bots ===
export const getAllBots = () =>
  request<{ bots: BotStatusInfo[] }>('/api/bots');

export const getBotStatus = (username: string) =>
  request<{ bot: BotStatusInfo }>(`/api/bots/${username}`);

export const startBot = (username: string) =>
  request<{ success: boolean; message: string }>(`/api/bots/${username}/start`, { method: 'POST' });

export const stopBot = (username: string) =>
  request<{ success: boolean; message: string }>(`/api/bots/${username}/stop`, { method: 'POST' });

export const restartBot = (username: string) =>
  request<{ success: boolean; message: string }>(`/api/bots/${username}/restart`, { method: 'POST' });

export const getBotActivity = (username: string, limit = 30) =>
  request<{ logs: ActivityLog[] }>(`/api/bots/${username}/activity?limit=${limit}`);

export const getBotProfits = (username: string, limit = 50) =>
  request<{ profits: ProfitEntry[] }>(`/api/bots/${username}/profits?limit=${limit}`);

export const getBotMoneyFlow = (username: string, limit = 100) =>
  request<{ transactions: MoneyFlowEntry[] }>(`/api/bots/${username}/money-flow?limit=${limit}`);

export const getBotFlipActivity = (username: string, limit = 500) =>
  request<{ actions: FlipActionEntry[] }>(`/api/bots/${username}/flip-activity?limit=${limit}`);

// === Config ===
export const getConfig = () =>
  request<{ config: AppConfig }>('/api/config');

export const updateConfig = (config: AppConfig) =>
  request<{ success: boolean; message: string }>('/api/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });

export const getBotConfig = (username: string) =>
  request<{ config: Account }>(`/api/bots/${username}/config`);

export const updateBotConfig = (username: string, updates: Partial<Account>) =>
  request<{ success: boolean; message: string }>(`/api/bots/${username}/config`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });






