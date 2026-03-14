import { motion } from 'framer-motion';
import { Activity, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { ActivityLog } from '@/lib/api';

interface LogsPanelProps {
  logs: ActivityLog[];
}

const levelConfig: Record<string, { icon: typeof Info; color: string; bg: string }> = {
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10' },
  warn: { icon: AlertCircle, color: 'text-[hsl(var(--pastel-lemon))]', bg: 'bg-[hsl(var(--pastel-lemon))]/10' },
  error: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  success: { icon: CheckCircle, color: 'text-accent', bg: 'bg-accent/10' },
};

export default function LogsPanel({ logs }: LogsPanelProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
          <Activity className="w-8 h-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">No logs yet</p>
        <p className="text-xs mt-1 text-muted-foreground/70">Activity will appear here when the bot is running</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-[500px] overflow-y-auto scrollbar-pastel">
      {logs.slice().reverse().map((log, i) => {
        const lc = levelConfig[log.level] ?? levelConfig.info;
        const Icon = lc.icon;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.02, 0.5) }}
            className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-xs bg-secondary/30 border border-border/20 hover:bg-secondary/50 transition-colors"
          >
            <div className={`w-6 h-6 rounded-lg ${lc.bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon className={`w-3.5 h-3.5 ${lc.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-foreground/90 break-words">{log.message}</p>
              <p className="text-muted-foreground/60 mt-0.5 font-mono text-[10px]">
                {new Date(log.timestamp).toLocaleTimeString()}
                {log.type && <span className="ml-2 text-primary/60">[{log.type}]</span>}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
