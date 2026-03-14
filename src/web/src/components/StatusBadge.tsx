import { motion } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  connected: boolean;
  state: string;
}

export default function StatusBadge({ connected, state }: StatusBadgeProps) {
  const config = connected
    ? { label: 'Online', color: 'bg-accent/15 text-accent border-accent/30', dot: 'bg-accent' }
    : state === 'connecting'
    ? { label: 'Connecting', color: 'bg-[hsl(var(--pastel-lemon))]/15 text-[hsl(var(--pastel-lemon))] border-[hsl(var(--pastel-lemon))]/30', dot: 'bg-[hsl(var(--pastel-lemon))]' }
    : { label: 'Offline', color: 'bg-destructive/15 text-destructive border-destructive/30', dot: 'bg-destructive' };

  return (
    <motion.div
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-display font-semibold border ${config.color}`}
    >
      {state === 'connecting' ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${config.dot} ${connected ? 'animate-pulse' : ''}`} />
      )}
      {config.label}
    </motion.div>
  );
}
