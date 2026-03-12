import { useState } from 'react';

function NPCFlipConfig({ bot, updateBot }) {
  const [enabled, setEnabled] = useState(bot.flips?.npc?.enabled || false);
  const [items, setItems] = useState(bot.flips?.npc?.items || [
    { name: '', buyPrice: '', sellPrice: '' }
  ]);

  const handleToggle = (e) => {
    const newEnabled = e.target.checked;
    setEnabled(newEnabled);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        npc: { ...bot.flips?.npc, enabled: newEnabled }
      }
    });
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', buyPrice: '', sellPrice: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        npc: { ...bot.flips?.npc, items: newItems }
      }
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        npc: { ...bot.flips?.npc, items: newItems }
      }
    });
  };

  return (
    <div className="flip-config-section fade-in">
      <div className="section-header">
        <h3>
          <i className="fas fa-store"></i>
          NPC Flip Settings
        </h3>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={handleToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {enabled && (
        <div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">
              <i className="fas fa-info-circle"></i>
              Item Matrix (Item Name, Buy Price, Sell Price)
            </label>
          </div>

          <div className="matrix-grid">
            {items.map((item, index) => (
              <div key={index} className="matrix-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Item name (e.g., IRON_INGOT)"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Buy price"
                  value={item.buyPrice}
                  onChange={(e) => handleItemChange(index, 'buyPrice', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Sell price"
                  value={item.sellPrice}
                  onChange={(e) => handleItemChange(index, 'sellPrice', e.target.value)}
                />
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length === 1}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>

          <button className="add-btn" onClick={handleAddItem}>
            <i className="fas fa-plus"></i>
            Add Item
          </button>
        </div>
      )}
    </div>
  );
}

export default NPCFlipConfig;
