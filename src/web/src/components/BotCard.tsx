import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Square, RotateCw, BarChart3, ListPlus, Activity, Settings2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import StatsPanel from '@/components/StatsPanel';
import FlipsPanel from '@/components/FlipsPanel';
import LogsPanel from '@/components/LogsPanel';
import ConfigPanel from '@/components/ConfigPanel';
import { useBotData } from '@/hooks/useBotData';
import * as api from '@/lib/api';
import type { Account, BotStatusInfo, FlipConfig } from '@/lib/api';
import { toast } from 'sonner';

interface BotCardProps {
  account: Account;
  botStatus: BotStatusInfo | null;
  onRefresh: () => void;
}

export default function BotCard({ account, botStatus, onRefresh }: BotCardProps) {
  const [actionLoading, setActionLoading] = useState('');
  const [localAccount, setLocalAccount] = useState<Account>(account);
  const { logs, profits, moneyFlow, flipActions, purseHistory } = useBotData(account.username, true);

  const isConnected = botStatus?.connected || false;
  const state = botStatus?.state || 'disconnected';

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(action);
    try {
      const fn = action === 'start' ? api.startBot : action === 'stop' ? api.stopBot : api.restartBot;
      const res = await fn(account.username);
      toast.success(res.message || `Bot ${action}ed`);
      setTimeout(onRefresh, 1500);
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} bot`);
    } finally {
      setActionLoading('');
    }
  };

  const saveConfig = async () => {
    try {
      await api.updateBotConfig(account.username, localAccount);
      toast.success('Configuration saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    }
  };

  const handleFlipUpdate = (configs: FlipConfig[]) => {
    setLocalAccount(prev => ({ ...prev, flipConfigs: configs }));
  };

  const handleConfigUpdate = (updates: Partial<Account>) => {
    setLocalAccount(prev => ({ ...prev, ...updates }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pastel-card pastel-card-hover overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 5 }}
              className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center border border-border/50 overflow-hidden shadow-sm"
            >
              <img
                src={`https://mc-heads.net/avatar/${account.username}/56`}
                alt={account.username}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </motion.div>
            <div>
              <h2 className="font-display text-xl font-bold">{account.username}</h2>
              <div className="flex items-center gap-3 mt-1.5">
                <StatusBadge connected={isConnected} state={state} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isConnected ? (
              <Button size="sm" onClick={() => handleAction('start')} disabled={!!actionLoading} className="bg-accent text-accent-foreground hover:bg-accent/80 font-display text-xs rounded-xl px-4">
                {actionLoading === 'start' ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span className="ml-1.5">Start</span>
              </Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => handleAction('restart')} disabled={!!actionLoading} className="text-[hsl(var(--pastel-peach))] hover:bg-[hsl(var(--pastel-peach))]/10 rounded-xl">
                  <RotateCw className={`w-4 h-4 ${actionLoading === 'restart' ? 'animate-spin' : ''}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleAction('stop')} disabled={!!actionLoading} className="text-destructive hover:bg-destructive/10 rounded-xl">
                  <Square className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={saveConfig} className="rounded-xl text-xs gap-1">
              <Save className="w-3.5 h-3.5" />
              Save
            </Button>
          </div>
        </div>

        {isConnected && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'State', value: state, color: 'text-accent', bg: 'bg-accent/8' },
              { label: 'Profits', value: `${profits.length}`, color: 'text-primary', bg: 'bg-primary/8' },
              { label: 'Logs', value: `${logs.length}`, color: 'text-[hsl(var(--pastel-sky))]', bg: 'bg-[hsl(var(--pastel-sky))]/8' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-xl p-3.5 text-center border border-border/30`}>
                <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                <p className={`font-mono text-base font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="w-full justify-start bg-secondary/40 rounded-none border-b border-border/30 h-12 px-3 gap-1">
          {[
            { value: 'stats', label: 'Stats', icon: BarChart3 },
            { value: 'flips', label: 'Flips', icon: ListPlus },
            { value: 'logs', label: 'Logs', icon: Activity },
            { value: 'config', label: 'Config', icon: Settings2 },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="font-display text-xs rounded-xl data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm gap-1.5 px-3">
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="p-6">
          <TabsContent value="stats" className="mt-0">
            <StatsPanel 
              profits={profits} 
              moneyFlow={moneyFlow} 
              flipActions={flipActions}
              purseHistory={purseHistory}
              purse={botStatus?.purse} 
            />
          </TabsContent>
          <TabsContent value="flips" className="mt-0">
            <FlipsPanel flipConfigs={localAccount.flipConfigs ?? []} onUpdate={handleFlipUpdate} />
          </TabsContent>
          <TabsContent value="logs" className="mt-0">
            <LogsPanel logs={logs} />
          </TabsContent>
          <TabsContent value="config" className="mt-0">
            <ConfigPanel account={localAccount} onUpdate={handleConfigUpdate} />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}


