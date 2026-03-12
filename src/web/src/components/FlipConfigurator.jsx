import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const FlipConfigurator = ({ type, flip, index, onUpdate, onRemove }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div 
      className="card rounded-2xl overflow-hidden animate-slide-in"
      style={{ 
        background: 'var(--bg-card)',
        boxShadow: '0 8px 24px var(--shadow)'
      }}
    >
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        style={{ background: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {type.toUpperCase()} Flip #{index + 1}
          </span>
          {type === 'npc' && flip.item && (
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              ({flip.item})
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-2 rounded-lg hover:scale-110 transition-transform"
            style={{ background: 'var(--error)' }}
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
          
          {expanded ? (
            <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          ) : (
            <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-6">
          {type === 'npc' && <NPCFlipConfig flip={flip} onUpdate={onUpdate} />}
          {type === 'kat' && <KatFlipConfig flip={flip} onUpdate={onUpdate} />}
          {type === 'craft' && <CraftFlipConfig flip={flip} onUpdate={onUpdate} />}
          {type === 'forge' && <ForgeFlipConfig flip={flip} onUpdate={onUpdate} />}
        </div>
      )}
    </div>
  );
};

// NPC Flip Configuration
const NPCFlipConfig = ({ flip, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Item Name
        </label>
        <input
          type="text"
          value={flip.item || ''}
          onChange={(e) => onUpdate({ item: e.target.value })}
          placeholder="e.g., ENCHANTED_DIAMOND"
          className="w-full px-4 py-3 rounded-xl border-2"
          style={{ 
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      <div>
        <label className="block font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Min Spread: {(flip.minSpread || 0).toLocaleString()} coins
        </label>
        <input
          type="range"
          min="100000"
          max="50000000"
          step="100000"
          value={flip.minSpread || 1000000}
          onChange={(e) => onUpdate({ minSpread: parseInt(e.target.value) })}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          <span>100K</span>
          <span>50M</span>
        </div>
      </div>

      <div>
        <label className="block font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
          Force Sell After: {flip.forceSellAfter || 0} seconds
        </label>
        <input
          type="range"
          min="60"
          max="7200"
          step="60"
          value={flip.forceSellAfter || 3600}
          onChange={(e) => onUpdate({ forceSellAfter: parseInt(e.target.value) })}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          <span>1 min</span>
          <span>2 hours</span>
        </div>
      </div>
    </div>
  );
};

// Kat Flip Configuration
const KatFlipConfig = ({ flip, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Pet
        </label>
        <select
          value={flip.pet || ''}
          onChange={(e) => onUpdate({ pet: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border-2"
          style={{ 
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        >
          <option value="">Select a pet...</option>
          <option value="COMMON">Common</option>
          <option value="UNCOMMON">Uncommon</option>
          <option value="RARE">Rare</option>
          <option value="EPIC">Epic</option>
          <option value="LEGENDARY">Legendary</option>
          <option value="MYTHIC">Mythic</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <label className="block font-medium" style={{ color: 'var(--text-primary)' }}>
            Use Kat Flower
          </label>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Enable to use Kat Flower for upgrading
          </p>
        </div>
        <input
          type="checkbox"
          checked={flip.useKatFlower || false}
          onChange={(e) => onUpdate({ useKatFlower: e.target.checked })}
        />
      </div>
    </div>
  );
};

// Craft Flip Configuration
const CraftFlipConfig = ({ flip, onUpdate }) => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  const recipe = flip.recipe || Array(9).fill(null).map(() => ({ item: '', amount: 0 }));

  const updateSlot = (slotIndex, updates) => {
    const newRecipe = [...recipe];
    newRecipe[slotIndex] = { ...newRecipe[slotIndex], ...updates };
    onUpdate({ recipe: newRecipe });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
          Crafting Recipe (3x3)
        </label>
        
        {/* 3x3 Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
          {recipe.map((slot, index) => (
            <button
              key={index}
              onClick={() => setSelectedSlot(selectedSlot === index ? null : index)}
              className="aspect-square rounded-xl border-2 p-2 flex flex-col items-center justify-center gap-1 transition-all hover:scale-105"
              style={{
                background: selectedSlot === index ? 'var(--accent-purple)' : 'var(--bg-secondary)',
                borderColor: slot.item ? 'var(--accent-green)' : 'var(--border-color)',
                color: selectedSlot === index ? 'white' : 'var(--text-primary)'
              }}
            >
              {slot.item ? (
                <>
                  <span className="text-xs font-bold truncate w-full text-center">
                    {slot.item}
                  </span>
                  <span className="text-xs opacity-80">
                    x{slot.amount}
                  </span>
                </>
              ) : (
                <span className="text-2xl opacity-30">+</span>
              )}
            </button>
          ))}
        </div>

        {/* Slot Editor */}
        {selectedSlot !== null && (
          <div 
            className="p-4 rounded-xl space-y-4 animate-slide-in"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <h4 className="font-bold" style={{ color: 'var(--text-primary)' }}>
              Editing Slot {selectedSlot + 1}
            </h4>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Item
              </label>
              <input
                type="text"
                value={recipe[selectedSlot].item || ''}
                onChange={(e) => updateSlot(selectedSlot, { item: e.target.value })}
                placeholder="e.g., ENCHANTED_DIAMOND"
                className="w-full px-3 py-2 rounded-lg border-2"
                style={{ 
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Amount: {recipe[selectedSlot].amount || 0}
              </label>
              <input
                type="range"
                min="0"
                max="64"
                value={recipe[selectedSlot].amount || 0}
                onChange={(e) => updateSlot(selectedSlot, { amount: parseInt(e.target.value) })}
              />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                <span>0</span>
                <span>64</span>
              </div>
            </div>

            <button
              onClick={() => updateSlot(selectedSlot, { item: '', amount: 0 })}
              className="w-full py-2 rounded-lg font-medium hover:scale-105 transition-transform"
              style={{ 
                background: 'var(--error)',
                color: 'white'
              }}
            >
              Clear Slot
            </button>
          </div>
        )}
      </div>

      <div>
        <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Output Item
        </label>
        <input
          type="text"
          value={flip.output || ''}
          onChange={(e) => onUpdate({ output: e.target.value })}
          placeholder="e.g., ENCHANTED_DIAMOND_BLOCK"
          className="w-full px-4 py-3 rounded-xl border-2"
          style={{ 
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
      </div>
    </div>
  );
};

// Forge Flip Configuration
const ForgeFlipConfig = ({ flip, onUpdate }) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Item to Forge
        </label>
        <input
          type="text"
          value={flip.item || ''}
          onChange={(e) => onUpdate({ item: e.target.value })}
          placeholder="e.g., REFRACTION"
          className="w-full px-4 py-3 rounded-xl border-2"
          style={{ 
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)'
          }}
        />
        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
          Enter the item ID that you want to forge in the Dwarven Mines
        </p>
      </div>
    </div>
  );
};

export default FlipConfigurator;
