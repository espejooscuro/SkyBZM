import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { BotStatusInfo, ActivityLog, ProfitEntry, MoneyFlowEntry } from '@/lib/api';

interface BotData {
  status: BotStatusInfo | null;
  logs: ActivityLog[];
  profits: ProfitEntry[];
  moneyFlow: MoneyFlowEntry[];
  loading: boolean;
  error: string | null;
}

export function useBotData(username: string, enabled: boolean, interval = 8000) {
  const [data, setData] = useState<BotData>({
    status: null, logs: [], profits: [], moneyFlow: [],
    loading: true, error: null,
  });

  const fetchData = useCallback(async () => {
    if (!enabled || !username) return;
    try {
      const [statusRes, logsRes, profitsRes, flowRes] = await Promise.allSettled([
        api.getBotStatus(username),
        api.getBotActivity(username, 50),
        api.getBotProfits(username, 100),
        api.getBotMoneyFlow(username, 200),
      ]);
      setData({
        status: statusRes.status === 'fulfilled' ? statusRes.value.bot : null,
        logs: logsRes.status === 'fulfilled' ? logsRes.value.logs : [],
        profits: profitsRes.status === 'fulfilled' ? profitsRes.value.profits : [],
        moneyFlow: flowRes.status === 'fulfilled' ? flowRes.value.transactions : [],
        loading: false, error: null,
      });
    } catch (err: any) {
      setData(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, [username, enabled]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, interval);
    return () => clearInterval(id);
  }, [fetchData, interval]);

  return { ...data, refetch: fetchData };
}
