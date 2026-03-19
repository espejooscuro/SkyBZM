import React, { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ShoppingCart, Tag, Sparkles, Hammer, Grid3X3, Package, ChevronDown, ChevronUp } from 'lucide-react';
import type { FlipConfig, CraftSlot } from '@/lib/api';
import { toast } from 'sonner';
import ItemSearchInput from './ItemSearchInput';

interface FlipsPanelProps {
  flipConfigs: FlipConfig[];
  onUpdate: (flips: FlipConfig[]) => void;
}

const FlipsPanel: React.FC<FlipsPanelProps> = ({ flipConfigs: initialFlips, onUpdate: onUpdateFlips }) => {
  const [flipConfigs, setFlipConfigs] = useState<FlipConfig[]>(initialFlips ?? []);
  const [expandedFlips, setExpandedFlips] = useState<Set<number>>(new Set()); // Start with all collapsed

  // Sync with parent when initialFlips changes (but don't cause unnecessary re-renders)
  React.useEffect(() => {
    setFlipConfigs(initialFlips ?? []);
  }, [initialFlips]);

  const toggleFlipExpanded = useCallback((index: number) => {
    setExpandedFlips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const FLIP_TYPES = [
    { value: 'sell_order' as const, label: 'Sell Order', icon: ShoppingCart, colorClass: 'bg-primary/15 text-primary' },
    { value: 'npc' as const, label: 'NPC Flip', icon: Tag, colorClass: 'bg-accent/15 text-accent' },
    { value: 'kat' as const, label: 'Kat Flip', icon: Sparkles, colorClass: 'bg-[hsl(var(--pastel-rose))]/15 text-[hsl(var(--pastel-rose))]' },
    { value: 'forge' as const, label: 'Forge Flip', icon: Hammer, colorClass: 'bg-[hsl(var(--pastel-peach))]/15 text-[hsl(var(--pastel-peach))]' },
    { value: 'craft' as const, label: 'Craft Flip', icon: Grid3X3, colorClass: 'bg-[hsl(var(--pastel-sky))]/15 text-[hsl(var(--pastel-sky))]' },
  ];

  function emptyGrid(): CraftSlot[][] {
    return Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({ item: '', count: 1 })));
  }

  function newFlipConfig(type: FlipConfig['type']): FlipConfig {
    const base: FlipConfig = { type, enabled: true };
    switch (type) {
      case 'sell_order': return { ...base, maxBuyPrice: 1000000, minProfit: 10000, minVolume: 10, maxFlips: 5, maxRelist: 3, maxBuyRelist: 3, minOrder: 1, maxOrder: 64, minSpread: 5, whitelist: [], blacklistContaining: [] };
      case 'npc': return { ...base, item: '', quantity: 1, forceSellAfter: 5, minSpread: 10 };
      case 'kat': return { ...base, pet: '', useKatFlower: false };
      case 'forge': return { ...base, item: '' };
      case 'craft': return { ...base, craftGrid: emptyGrid(), instasell: false, craftItemType: 'bz' };
    }
  }

  const addFlip = useCallback((type: FlipConfig['type']) => {
    const newFlips = [...flipConfigs, newFlipConfig(type)];
    setFlipConfigs(newFlips);
    setExpandedFlips(prev => new Set([...prev, newFlips.length - 1]));
    onUpdateFlips(newFlips);
    toast.success(`${FLIP_TYPES.find(f => f.value === type)?.label} added!`);
  }, [flipConfigs, onUpdateFlips]);

  const updateFlip = useCallback((index: number, config: FlipConfig) => {
    setFlipConfigs(prev => {
      const newFlips = [...prev];
      newFlips[index] = config;
      onUpdateFlips(newFlips);
      return newFlips;
    });
  }, [onUpdateFlips]);

  const removeFlip = useCallback((index: number) => {
    setFlipConfigs(prev => {
      const newFlips = prev.filter((_, i) => i !== index);
      onUpdateFlips(newFlips);
      toast.info('Flip removed');
      return newFlips;
    });
  }, [onUpdateFlips]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FLIP_TYPES.map(ft => (
          <Button key={ft.value} variant="outline" size="sm" onClick={() => addFlip(ft.value)} className="rounded-xl text-xs gap-1.5 hover:bg-secondary border-border/50">
            <ft.icon className="w-3.5 h-3.5" />
            {ft.label}
          </Button>
        ))}
      </div>

      {flipConfigs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary flex items-center justify-center">
            <Plus className="w-8 h-8 opacity-40" />
          </div>
          <p className="text-sm font-medium">No flips configured</p>
          <p className="text-xs mt-1 text-muted-foreground/70">Add a flip type above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flipConfigs.map((config, index) => (
            <FlipCard
              key={`flip-${index}`}
              config={config}
              index={index}
              isExpanded={expandedFlips.has(index)}
              onToggle={toggleFlipExpanded}
              onUpdate={updateFlip}
              onRemove={removeFlip}
              flipTypes={FLIP_TYPES}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente FlipCard memoizado para evitar re-renders
interface FlipCardProps {
  config: FlipConfig;
  index: number;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  onUpdate: (index: number, config: FlipConfig) => void;
  onRemove: (index: number) => void;
  flipTypes: any[];
}

const FlipCard = memo(({ config, index, isExpanded, onToggle, onUpdate, onRemove, flipTypes }: FlipCardProps) => {
  const meta = flipTypes.find(f => f.value === config.type) ?? flipTypes[0];
  
  const handleToggle = useCallback(() => {
    onToggle(index);
  }, [index, onToggle]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(index);
  }, [index, onRemove]);

  const handleEnabledChange = useCallback((v: boolean) => {
    onUpdate(index, { ...config, enabled: v });
  }, [index, config, onUpdate]);

  const handleConfigChange = useCallback((c: FlipConfig) => {
    onUpdate(index, c);
  }, [index, onUpdate]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ delay: index * 0.05 }} 
      className="rounded-2xl border border-border/50 bg-card"
      style={{ 
        overflow: isExpanded ? 'visible' : 'hidden',
        zIndex: isExpanded ? 10 : 1,
        position: 'relative'
      }}
    >
      {/* Header - Always visible */}
      <div 
        className="flex items-center justify-between p-4 border-b border-border/30 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl ${meta.colorClass} flex items-center justify-center`}>
            <meta.icon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-display text-sm font-semibold">{meta.label}</span>
            {config.type === 'npc' && config.item && (
              <p className="text-xs text-muted-foreground mt-0.5">Item: {config.item}</p>
            )}
            {config.type === 'kat' && config.pet && (
              <p className="text-xs text-muted-foreground mt-0.5">Pet: {config.pet}</p>
            )}
            {config.type === 'forge' && config.item && (
              <p className="text-xs text-muted-foreground mt-0.5">Item: {config.item}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={config.enabled ?? true} 
            onCheckedChange={handleEnabledChange} 
            onClick={(e) => e.stopPropagation()}
          />
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRemove} 
            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      
      {/* Config - Collapsible */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'visible' }}
          >
            <div className="p-4" style={{ overflow: 'visible' }}>
              {renderConfig(config, handleConfigChange)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

FlipCard.displayName = 'FlipCard';

// Funciones de renderizado de configuración (memoizadas)
function renderConfig(config: FlipConfig, onChange: (c: FlipConfig) => void) {
  switch (config.type) {
    case 'sell_order': return <SellOrderConfig config={config} onChange={onChange} />;
    case 'npc': return <NPCConfig config={config} onChange={onChange} />;
    case 'kat': return <KatConfig config={config} onChange={onChange} />;
    case 'forge': return <ForgeConfig config={config} onChange={onChange} />;
    case 'craft': return <CraftConfig config={config} onChange={onChange} />;
    default: return null;
  }
}

const SellOrderConfig = memo(({ config, onChange }: { config: FlipConfig; onChange: (c: FlipConfig) => void }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        { key: 'maxBuyPrice', label: 'Max Buy Price' },
        { key: 'minProfit', label: 'Min Profit' },
        { key: 'minVolume', label: 'Min Volume' },
        { key: 'maxFlips', label: 'Max Flips' },
        { key: 'maxRelist', label: 'Max Relist' },
        { key: 'maxBuyRelist', label: 'Max Buy Relist' },
        { key: 'minOrder', label: 'Min Order' },
        { key: 'maxOrder', label: 'Max Order' },
      ].map(f => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{f.label}</Label>
          <Input type="number" value={(config as any)[f.key] ?? 0} onChange={e => onChange({ ...config, [f.key]: +e.target.value })} className="h-9 rounded-xl text-sm" />
        </div>
      ))}
      <div className="col-span-2 space-y-2">
        <Label className="text-xs text-muted-foreground">Min Spread: {config.minSpread ?? 0}%</Label>
        <Slider value={[config.minSpread ?? 0]} onValueChange={([v]) => onChange({ ...config, minSpread: v })} min={0} max={50} step={1} />
      </div>
    </div>
  );
});

SellOrderConfig.displayName = 'SellOrderConfig';

const NPCConfig = memo(({ config, onChange }: { config: FlipConfig; onChange: (c: FlipConfig) => void }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Item</Label>
        <ItemSearchInput 
          value={config.item ?? ''} 
          onChange={(itemId) => onChange({ ...config, item: itemId })} 
          placeholder="e.g. ENCHANTED_DIAMOND" 
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quantity: {config.quantity ?? 1}</Label>
        <Slider value={[config.quantity ?? 1]} onValueChange={([v]) => onChange({ ...config, quantity: v })} min={1} max={71000} step={1} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Force Sell After: {config.forceSellAfter ?? 5} min</Label>
        <Slider value={[config.forceSellAfter ?? 5]} onValueChange={([v]) => onChange({ ...config, forceSellAfter: v })} min={1} max={10} step={1} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Min Spread: {config.minSpread ?? 0}%</Label>
        <Slider value={[config.minSpread ?? 0]} onValueChange={([v]) => onChange({ ...config, minSpread: v })} min={0} max={50} step={1} />
      </div>
    </div>
  );
});

NPCConfig.displayName = 'NPCConfig';

const KatConfig = memo(({ config, onChange }: { config: FlipConfig; onChange: (c: FlipConfig) => void }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Pet</Label>
        <ItemSearchInput 
          value={config.pet ?? ''} 
          onChange={(itemId) => onChange({ ...config, pet: itemId })} 
          placeholder="e.g. GOLDEN_DRAGON" 
        />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-4 border border-border/30">
        <Label className="text-sm">Use Kat Flower</Label>
        <Switch checked={config.useKatFlower ?? false} onCheckedChange={v => onChange({ ...config, useKatFlower: v })} />
      </div>
    </div>
  );
});

KatConfig.displayName = 'KatConfig';

const ForgeConfig = memo(({ config, onChange }: { config: FlipConfig; onChange: (c: FlipConfig) => void }) => {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Item</Label>
      <ItemSearchInput 
        value={config.item ?? ''} 
        onChange={(itemId) => onChange({ ...config, item: itemId })} 
        placeholder="e.g. REFINED_DIAMOND" 
      />
    </div>
  );
});

ForgeConfig.displayName = 'ForgeConfig';

const CraftConfig = memo(({ config, onChange }: { config: FlipConfig; onChange: (c: FlipConfig) => void }) => {
  function emptyGrid(): CraftSlot[][] {
    return Array(3).fill(null).map(() => Array(3).fill(null).map(() => ({ item: '', count: 1 })));
  }
  
  const grid = config.craftGrid ?? emptyGrid();
  const updateSlot = (row: number, col: number, field: 'item' | 'count', value: string | number) => {
    const newGrid = grid.map((r, ri) => r.map((s, ci) =>
      ri === row && ci === col ? { ...s, [field]: value } : s
    ));
    onChange({ ...config, craftGrid: newGrid });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center gap-6">
        <div className="inline-block p-4 rounded-2xl bg-secondary/30 border border-border/40">
          <div className="grid grid-cols-3 gap-2">
            {grid.map((row, ri) => row.map((slot, ci) => (
              <motion.div
                key={`${ri}-${ci}`}
                whileHover={{ scale: 1.05 }}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border/60 bg-card flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 transition-colors relative"
              >
                <input type="text" value={slot.item ?? ''} onChange={e => updateSlot(ri, ci, 'item', e.target.value)} placeholder="Item" className="w-full text-center text-[10px] bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 font-mono" />
                <input type="number" value={slot.count ?? 1} onChange={e => updateSlot(ri, ci, 'count', Math.min(64, Math.max(1, +e.target.value)))} min={1} max={64} className="w-12 text-center text-xs bg-secondary/50 rounded-md border-none outline-none text-foreground font-mono" />
                {slot.item && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Package className="w-2.5 h-2.5 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.div>
            )))}
          </div>
        </div>
        
        {/* Crafted Item */}
        <div className="flex flex-col items-center gap-2">
          <Label className="text-xs text-muted-foreground">Crafted Item</Label>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-24 h-24 rounded-xl border-2 border-primary/40 bg-card flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors relative"
          >
            <input 
              type="text" 
              value={config.craftedItem ?? ''} 
              onChange={e => onChange({ ...config, craftedItem: e.target.value })} 
              placeholder="Result" 
              className="w-full text-center text-xs bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50 font-mono px-2" 
            />
            {config.craftedItem && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-accent-foreground" />
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
      
      <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-4 border border-border/30">
        <Label className="text-sm">Instasell</Label>
        <Switch checked={config.instasell ?? false} onCheckedChange={v => onChange({ ...config, instasell: v })} />
      </div>
      
      <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-4 border border-border/30">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Instacraft</Label>
          <span className="text-[10px] text-green-500 font-semibold">(VIP required)</span>
        </div>
        <Switch checked={config.instacraft ?? false} onCheckedChange={v => onChange({ ...config, instacraft: v })} />
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Item Type</Label>
        <div className="flex gap-2">
          {(['ah', 'bz'] as const).map(t => (
            <Button key={t} variant={config.craftItemType === t ? 'default' : 'outline'} size="sm" onClick={() => onChange({ ...config, craftItemType: t })} className="rounded-xl flex-1 text-xs">
              {t === 'ah' ? '🏷️ AH Item' : '📦 BZ Item'}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
});

CraftConfig.displayName = 'CraftConfig';

export default FlipsPanel;
