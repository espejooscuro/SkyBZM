import { useState } from 'react';

function ForgeFlipConfig({ bot, updateBot }) {
  const [enabled, setEnabled] = useState(bot.flips?.forge?.enabled || false);
  const [items, setItems] = useState(bot.flips?.forge?.items || [
    { name: '', materials: '', forgeTime: '', profit: '' }
  ]);
  const [minProfit, setMinProfit] = useState(bot.flips?.forge?.minProfit || 75000);
  const [maxForgeTime, setMaxForgeTime] = useState(bot.flips?.forge?.maxForgeTime || 12);

  const handleToggle = (e) => {
    const newEnabled = e.target.checked;
    setEnabled(newEnabled);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        forge: { ...bot.flips?.forge, enabled: newEnabled }
      }
    });
  };

  const handleAddItem = () => {
    setItems([...items, { name: '', materials: '', forgeTime: '', profit: '' }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        forge: { ...bot.flips?.forge, items: newItems }
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
        forge: { ...bot.flips?.forge, items: newItems }
      }
    });
  };

  const handleMinProfitChange = (e) => {
    const value = e.target.value;
    setMinProfit(value);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        forge: { ...bot.flips?.forge, minProfit: value }
      }
    });
  };

  const handleMaxForgeTimeChange = (e) => {
    const value = e.target.value;
    setMaxForgeTime(value);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        forge: { ...bot.flips?.forge, maxForgeTime: value }
      }
    });
  };

  return (
    <div className="flip-config-section fade-in">
      <div className="section-header">
        <h3>
          <i className="fas fa-fire"></i>
          Forge Flip Settings
        </h3>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={handleToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {enabled && (
        <div>
          <div className="form-grid" style={{ marginBottom: '25px' }}>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-coins"></i>
                Minimum Profit
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="75000"
                value={minProfit}
                onChange={handleMinProfitChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-clock"></i>
                Max Forge Time (hours)
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="12"
                value={maxForgeTime}
                onChange={handleMaxForgeTimeChange}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">
              <i className="fas fa-info-circle"></i>
              Forge Item Matrix (Item Name, Materials, Forge Time, Min Profit)
            </label>
          </div>

          <div className="matrix-grid">
            {items.map((item, index) => (
              <div key={index} className="matrix-row" style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 80px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Item name (e.g., REFINED_DIAMOND)"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Materials (comma separated)"
                  value={item.materials}
                  onChange={(e) => handleItemChange(index, 'materials', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Time (hrs)"
                  value={item.forgeTime}
                  onChange={(e) => handleItemChange(index, 'forgeTime', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Min profit"
                  value={item.profit}
                  onChange={(e) => handleItemChange(index, 'profit', e.target.value)}
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
            Add Forge Item
          </button>
        </div>
      )}
    </div>
  );
}

export default ForgeFlipConfig;
