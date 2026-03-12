import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';

/**
 * Hook for fetching bots data with auto-refresh
 */
export function useBots(refreshInterval = 2000) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchBots = useCallback(async () => {
    try {
      const response = await api.getBots();
      setBots(response.data.bots || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching bots:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBots();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchBots, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchBots, refreshInterval]);

  return { bots, loading, error, refetch: fetchBots };
}

/**
 * Hook for fetching single bot data
 */
export function useBot(username, refreshInterval = 2000) {
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchBot = useCallback(async () => {
    if (!username) return;
    
    try {
      const response = await api.getBot(username);
      setBot(response.data.bot);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching bot ${username}:`, err);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchBot();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchBot, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchBot, refreshInterval]);

  return { bot, loading, error, refetch: fetchBot };
}

/**
 * Hook for bot activity logs
 */
export function useBotActivity(username, limit = 20, refreshInterval = 3000) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchLogs = useCallback(async () => {
    if (!username) return;
    
    try {
      const response = await api.getBotActivity(username, limit);
      setLogs(response.data.logs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching activity for ${username}:`, err);
    } finally {
      setLoading(false);
    }
  }, [username, limit]);

  useEffect(() => {
    fetchLogs();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchLogs, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLogs, refreshInterval]);

  return { logs, loading, error, refetch: fetchLogs };
}

/**
 * Hook for bot profit history
 */
export function useBotProfits(username, limit = 50, refreshInterval = 3000) {
  const [profits, setProfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchProfits = useCallback(async () => {
    if (!username) return;
    
    try {
      const response = await api.getBotProfits(username, limit);
      setProfits(response.data.profits || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching profits for ${username}:`, err);
    } finally {
      setLoading(false);
    }
  }, [username, limit]);

  useEffect(() => {
    fetchProfits();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchProfits, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchProfits, refreshInterval]);

  return { profits, loading, error, refetch: fetchProfits };
}

/**
 * Hook for bot money flow
 */
export function useBotMoneyFlow(username, limit = 100, refreshInterval = 3000) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchMoneyFlow = useCallback(async () => {
    if (!username) return;
    
    try {
      const response = await api.getBotMoneyFlow(username, limit);
      setTransactions(response.data.transactions || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(`Error fetching money flow for ${username}:`, err);
    } finally {
      setLoading(false);
    }
  }, [username, limit]);

  useEffect(() => {
    fetchMoneyFlow();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchMoneyFlow, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchMoneyFlow, refreshInterval]);

  return { transactions, loading, error, refetch: fetchMoneyFlow };
}

/**
 * Hook for configuration
 */
export function useConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await api.getConfig();
      setConfig(response.data.config);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      await api.updateConfig(newConfig);
      setConfig(newConfig);
      return { success: true };
    } catch (err) {
      console.error('Error updating config:', err);
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { config, loading, error, updateConfig, refetch: fetchConfig };
}

/**
 * Hook for bot control actions
 */
export function useBotControl(username) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startBot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.startBot(username);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [username]);

  const stopBot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.stopBot(username);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [username]);

  const restartBot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.restartBot(username);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, [username]);

  return { startBot, stopBot, restartBot, loading, error };
}
