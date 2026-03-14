import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Bot, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import BotCard from '@/components/BotCard';
import * as api from '@/lib/api';
import type { Account, BotStatusInfo, AppConfig } from '@/lib/api';

export default function DashboardPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [botStatuses, setBotStatuses] = useState<Record<string, BotStatusInfo>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, healthRes] = await Promise.allSettled([
        api.getConfig(),
        api.getHealth(),
      ]);

      if (configRes.status === 'fulfilled') {
        setConfig(configRes.value.config);
      }

      if (healthRes.status === 'fulfilled') {
        const statusMap: Record<string, BotStatusInfo> = {};
        healthRes.value.bots.forEach(b => { statusMap[b.username] = b; });
        setBotStatuses(statusMap);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [fetchData]);

  const accounts = config?.accounts ?? [];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-40 left-1/3 w-72 h-72 rounded-full bg-[hsl(var(--pastel-rose))]/5 blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        <div className="fixed inset-0 dot-pattern opacity-30" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 15 }}
              className="w-10 h-10 rounded-2xl pastel-gradient flex items-center justify-center shadow-md"
            >
              <Bot className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h1 className="font-display text-lg font-bold">
                Sky<span className="text-gradient">BZM</span>
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">Bazaar Flipper Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchData} className="rounded-xl w-10 h-10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            ⚠️ Connection error: {error}
          </motion.div>
        )}

        {loading && accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} className="w-12 h-12 rounded-2xl pastel-gradient flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <p className="font-display text-lg font-semibold text-muted-foreground">Loading bots...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6">
              <Bot className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">No Bots Configured</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Add accounts to your config.json to get started with bazaar flipping.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  Your Bots <span className="text-muted-foreground text-lg">({accounts.length})</span>
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage and monitor your bazaar flippers</p>
              </div>
            </div>

            <AnimatePresence>
              {accounts.map((account, i) => (
                <motion.div
                  key={account.username}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <BotCard
                    account={account}
                    botStatus={botStatuses[account.username] ?? null}
                    onRefresh={fetchData}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center">
          <p className="text-xs text-muted-foreground font-mono">
            SkyBZM Dashboard · Hypixel Skyblock Bazaar Flipper
          </p>
        </div>
      </footer>
    </div>
  );
}
