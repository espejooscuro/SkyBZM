import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Wallet, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ScatterChart, Scatter, ReferenceLine, Area, AreaChart } from 'recharts';
import type { ProfitEntry, MoneyFlowEntry } from '@/lib/api';

interface StatsPanelProps {
  profits: ProfitEntry[];
  moneyFlow: MoneyFlowEntry[];
  purse?: number;
}

const formatCoins = (n: number | null | undefined) => {
  if (n == null) return '--';
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};

export default function StatsPanel({ profits, moneyFlow, purse }: StatsPanelProps) {
  const totalProfit = profits.reduce((sum, p) => sum + p.profit, 0);
  const totalExpenses = moneyFlow.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Flip timeline data (scatter by hour)
  const flipTimelineData = useMemo(() => {
    const types = new Set(profits.map(p => p.flipType ?? 'unknown'));
    return profits.map(p => {
      const d = new Date(p.timestamp);
      return { hour: d.getHours() + d.getMinutes() / 60, type: p.flipType ?? 'unknown', profit: p.profit, item: p.item };
    });
  }, [profits]);

  // Profit over time
  const profitChartData = useMemo(() => {
    let cumulative = 0;
    return profits.map(p => {
      cumulative += p.profit;
      return { time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), profit: p.profit, cumulative };
    });
  }, [profits]);

  // Purse tracking from money flow
  const purseData = useMemo(() => {
    let balance = purse ?? 0;
    const data = moneyFlow.slice().reverse().map(t => {
      balance += t.amount;
      return { time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), balance };
    });
    return data;
  }, [moneyFlow, purse]);

  // Expenses data
  const expenseData = useMemo(() => {
    let cumExpense = 0;
    return moneyFlow.filter(t => t.amount < 0).map(t => {
      cumExpense += Math.abs(t.amount);
      return { time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), expense: cumExpense };
    });
  }, [moneyFlow]);

  if (profits.length === 0 && moneyFlow.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
          <BarChart3 className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">No data available</p>
        <p className="text-xs mt-1 text-muted-foreground/70">Start the bot to see statistics</p>
      </div>
    );
  }

  const flipTypeColors: Record<string, string> = {
    sell_order: 'hsl(252, 65%, 68%)',
    npc: 'hsl(162, 55%, 62%)',
    kat: 'hsl(340, 65%, 72%)',
    forge: 'hsl(20, 85%, 75%)',
    craft: 'hsl(200, 75%, 72%)',
    unknown: 'hsl(240, 10%, 50%)',
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Profit', value: formatCoins(totalProfit), icon: totalProfit >= 0 ? TrendingUp : TrendingDown, positive: totalProfit >= 0 },
          { label: 'Total Flips', value: `${profits.length}`, icon: BarChart3, positive: true },
          { label: 'Purse', value: formatCoins(purse), icon: Wallet, positive: true },
          { label: 'Expenses', value: formatCoins(totalExpenses), icon: DollarSign, positive: false },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-2xl border p-4 ${stat.positive ? 'bg-accent/8 border-accent/15' : 'bg-destructive/8 border-destructive/15'}`}>
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.positive ? 'text-accent' : 'text-destructive'}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`font-mono text-lg font-bold ${stat.positive ? 'text-accent' : 'text-destructive'}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Flip Timeline (scatter 0-24h) */}
      {flipTimelineData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="font-display text-sm font-semibold mb-3">⏰ Flip Activity Timeline (24h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" type="number" domain={[0, 24]} tickCount={13} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="profit" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCoins(v)} />
              <Tooltip content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-card border border-border rounded-xl p-2 text-xs shadow-lg">
                    <p className="font-mono font-bold">{d.item}</p>
                    <p className="text-muted-foreground">{d.type} · {formatCoins(d.profit)}</p>
                  </div>
                );
              }} />
              {Object.entries(flipTypeColors).map(([type, color]) => (
                <Scatter key={type} data={flipTimelineData.filter(d => d.type === type)} fill={color} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Profit chart */}
      {profitChartData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="font-display text-sm font-semibold mb-3">💰 Cumulative Profit</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={profitChartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(162, 55%, 62%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(162, 55%, 62%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCoins(v)} />
              <Tooltip formatter={(v: number) => formatCoins(v)} />
              <Area type="monotone" dataKey="cumulative" stroke="hsl(162, 55%, 62%)" fill="url(#profitGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Purse chart */}
      {purseData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="font-display text-sm font-semibold mb-3">👛 Purse Balance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={purseData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="purseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(252, 65%, 68%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(252, 65%, 68%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCoins(v)} />
              <Tooltip formatter={(v: number) => formatCoins(v)} />
              <Area type="monotone" dataKey="balance" stroke="hsl(252, 65%, 68%)" fill="url(#purseGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Expenses chart */}
      {expenseData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="rounded-2xl border border-border/50 bg-card p-4">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
            💸 Cumulative Expenses
            <span className="text-[10px] text-destructive/70 font-mono">(red line = 15B limit)</span>
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={expenseData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 65%, 68%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 65%, 68%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => formatCoins(v)} />
              <Tooltip formatter={(v: number) => formatCoins(v)} />
              <ReferenceLine y={15_000_000_000} stroke="hsl(0, 65%, 55%)" strokeDasharray="5 5" strokeWidth={2} label={{ value: '15B', fill: 'hsl(0, 65%, 55%)', fontSize: 10 }} />
              <Area type="monotone" dataKey="expense" stroke="hsl(0, 65%, 68%)" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
