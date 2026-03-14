import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Shield, Clock, Coffee, Cookie, Eye, EyeOff } from 'lucide-react';
import type { Account } from '@/lib/api';

interface ConfigPanelProps {
  account: Account;
  onUpdate: (updates: Partial<Account>) => void;
}

export default function ConfigPanel({ account, onUpdate }: ConfigPanelProps) {
  const [showProxyPass, setShowProxyPass] = useState(false);

  const shortBreaks = account.restSchedule?.shortBreaks ?? { enabled: false, workDuration: 60, breakDuration: 10 };
  const dailyRest = account.restSchedule?.dailyRest ?? { enabled: false, workDuration: 12 };
  const proxy = account.proxy ?? { enabled: false, host: '', port: 1080, username: '', password: '' };
  const cookie = account.boosterCookie ?? { enabled: false, useWhenTimeLeft: 24 };

  return (
    <div className="space-y-3">
      {/* Short Rest */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <Coffee className="w-4 h-4 text-accent" />
            </div>
            <span className="font-display text-sm font-semibold">Short Rest</span>
          </div>
          <Switch checked={shortBreaks.enabled} onCheckedChange={v => onUpdate({ restSchedule: { ...account.restSchedule, shortBreaks: { ...shortBreaks, enabled: v } } })} />
        </div>
        {shortBreaks.enabled && (
          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rest After: {shortBreaks.workDuration} min</Label>
              <Slider value={[shortBreaks.workDuration]} onValueChange={([v]) => onUpdate({ restSchedule: { ...account.restSchedule, shortBreaks: { ...shortBreaks, workDuration: v } } })} min={1} max={120} step={1} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rest Time: {shortBreaks.breakDuration} min</Label>
              <Slider value={[shortBreaks.breakDuration]} onValueChange={([v]) => onUpdate({ restSchedule: { ...account.restSchedule, shortBreaks: { ...shortBreaks, breakDuration: v } } })} min={1} max={30} step={1} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Long Rest */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[hsl(var(--pastel-sky))]/15 flex items-center justify-center">
              <Clock className="w-4 h-4 text-[hsl(var(--pastel-sky))]" />
            </div>
            <span className="font-display text-sm font-semibold">Long Rest</span>
          </div>
          <Switch checked={dailyRest.enabled} onCheckedChange={v => onUpdate({ restSchedule: { ...account.restSchedule, dailyRest: { ...dailyRest, enabled: v } } })} />
        </div>
        {dailyRest.enabled && (
          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Work Duration: {dailyRest.workDuration}h (Rest: {24 - dailyRest.workDuration}h)</Label>
              <Slider value={[dailyRest.workDuration]} onValueChange={([v]) => onUpdate({ restSchedule: { ...account.restSchedule, dailyRest: { ...dailyRest, workDuration: v } } })} min={0} max={24} step={1} />
            </div>
          </div>
        )}
      </motion.div>

      {/* SOCKS5 Proxy */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display text-sm font-semibold">SOCKS5 Proxy</span>
          </div>
          <Switch checked={proxy.enabled} onCheckedChange={v => onUpdate({ proxy: { ...proxy, enabled: v } })} />
        </div>
        {proxy.enabled && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Host</Label>
                <Input value={proxy.host} onChange={e => onUpdate({ proxy: { ...proxy, host: e.target.value } })} placeholder="127.0.0.1" className="h-9 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Port</Label>
                <Input type="number" value={proxy.port} onChange={e => onUpdate({ proxy: { ...proxy, port: +e.target.value } })} placeholder="1080" className="h-9 rounded-xl text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Username</Label>
                <Input value={proxy.username ?? ''} onChange={e => onUpdate({ proxy: { ...proxy, username: e.target.value } })} placeholder="optional" className="h-9 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Password</Label>
                <div className="relative">
                  <Input type={showProxyPass ? 'text' : 'password'} value={proxy.password ?? ''} onChange={e => onUpdate({ proxy: { ...proxy, password: e.target.value } })} placeholder="optional" className="h-9 rounded-xl text-sm pr-8" />
                  <button onClick={() => setShowProxyPass(!showProxyPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showProxyPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Booster Cookie */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[hsl(var(--pastel-lemon))]/15 flex items-center justify-center">
              <Cookie className="w-4 h-4 text-[hsl(var(--pastel-lemon))]" />
            </div>
            <span className="font-display text-sm font-semibold">Booster Cookie</span>
          </div>
          <Switch checked={cookie.enabled} onCheckedChange={v => onUpdate({ boosterCookie: { ...cookie, enabled: v } })} />
        </div>
        {cookie.enabled && (
          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Use cookie when {cookie.useWhenTimeLeft >= 24 ? `${Math.floor(cookie.useWhenTimeLeft / 24)}d ${cookie.useWhenTimeLeft % 24}h` : `${cookie.useWhenTimeLeft}h`} left
              </Label>
              <Slider value={[cookie.useWhenTimeLeft]} onValueChange={([v]) => onUpdate({ boosterCookie: { ...cookie, useWhenTimeLeft: v } })} min={0} max={96} step={1} />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>0h</span>
                <span>4 days</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

