const { useState, useEffect, useCallback } = React;

// Item Selector Modal Component
function ItemSelectorModal({ isOpen, onClose, onSelect, title = "Select Item" }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [items] = useState([
    'ENCHANTED_DIAMOND', 'ENCHANTED_GOLD', 'ENCHANTED_IRON',
    'ENCHANTED_EMERALD', 'ENCHANTED_COAL', 'ENCHANTED_REDSTONE',
    'WHEAT', 'CARROT', 'POTATO', 'SUGAR_CANE', 'MELON', 'PUMPKIN',
    'COBBLESTONE', 'STONE', 'WOOD', 'GLASS', 'SAND', 'GRAVEL',
    'EPIC_PET', 'LEGENDARY_PET', 'RARE_PET', 'COMMON_PET'
  ]);

  const filteredItems = items.filter(item =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '30px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        animation: 'slideUp 0.3s ease'
      }}>
        <h3 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: '600' }}>{title}</h3>
        <input
          type="text"
          placeholder="Search items..."
          className="form-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ marginBottom: '20px' }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
          {filteredItems.map(item => (
            <button
              key={item}
              className="btn"
              onClick={() => {
                onSelect(item);
                onClose();
              }}
              style={{
                padding: '15px 10px',
                fontSize: '11px',
                background: 'linear-gradient(135deg, #a4d8ff, #b8a4ff)',
                wordBreak: 'break-word',
                height: 'auto',
                minHeight: '50px'
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <button
          className="btn btn-danger"
          onClick={onClose}
          style={{ marginTop: '20px', width: '100%' }}
        >
          <i className="fas fa-times"></i> Cancel
        </button>
      </div>
    </div>
  );
}

// Crafting Grid Component
function CraftingGrid({ config, onChange }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showCountInput, setShowCountInput] = useState(false);
  const [tempCount, setTempCount] = useState(1);

  const grid = config.grid || Array(9).fill(null);

  const handleSlotClick = (index) => {
    setSelectedSlot(index);
    if (grid[index]) {
      setShowCountInput(true);
      setTempCount(grid[index].count || 1);
    } else {
      setShowItemSelector(true);
    }
  };

  const handleItemSelect = (item) => {
    const newGrid = [...grid];
    newGrid[selectedSlot] = { item, count: 1 };
    onChange({ ...config, grid: newGrid });
    setShowCountInput(true);
    setTempCount(1);
  };

  const handleCountSave = () => {
    const newGrid = [...grid];
    if (newGrid[selectedSlot]) {
      newGrid[selectedSlot].count = Math.max(1, Math.min(64, parseInt(tempCount) || 1));
      onChange({ ...config, grid: newGrid });
    }
    setShowCountInput(false);
    setSelectedSlot(null);
  };

  const handleRemoveSlot = (index, e) => {
    e.stopPropagation();
    const newGrid = [...grid];
    newGrid[index] = null;
    onChange({ ...config, grid: newGrid });
  };

  return (
    <div>
      <div className="crafting-grid">
        {grid.map((slot, index) => (
          <div
            key={index}
            className={`crafting-slot ${slot ? 'filled' : ''}`}
            onClick={() => handleSlotClick(index)}
          >
            {slot ? (
              <div>
                <button
                  className="slot-remove"
                  onClick={(e) => handleRemoveSlot(index, e)}
                >
                  <i className="fas fa-times"></i>
                </button>
                <div className="slot-item">{slot.item}</div>
                <div className="slot-count">x{slot.count}</div>
              </div>
            ) : (
              <i className="fas fa-plus" style={{ fontSize: '20px', color: 'var(--pastel-purple)' }}></i>
            )}
          </div>
        ))}
      </div>

      <ItemSelectorModal
        isOpen={showItemSelector}
        onClose={() => {
          setShowItemSelector(false);
          setSelectedSlot(null);
        }}
        onSelect={handleItemSelect}
        title="Select Crafting Item"
      />

      {showCountInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ marginBottom: '20px' }}>Set Item Count</h3>
            <input
              type="number"
              min="1"
              max="64"
              className="form-input"
              value={tempCount}
              onChange={(e) => setTempCount(e.target.value)}
              style={{ marginBottom: '20px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleCountSave} style={{ flex: 1 }}>
                <i className="fas fa-check"></i> Save
              </button>
              <button className="btn btn-danger" onClick={() => {
                setShowCountInput(false);
                setSelectedSlot(null);
              }} style={{ flex: 1 }}>
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// NPC Flip Config Component
function NPCFlipConfig({ config, onChange }) {
  const [showItemSelector, setShowItemSelector] = useState(false);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">
          <i className="fas fa-chart-line"></i> Minimum Spread
        </label>
        <input
          type="number"
          className="form-input"
          value={config.minSpread || 0}
          onChange={(e) => onChange({ ...config, minSpread: parseFloat(e.target.value) })}
          placeholder="e.g., 100000"
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          <i className="fas fa-box"></i> Item
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            value={config.item || ''}
            readOnly
            placeholder="Click to select item"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowItemSelector(true)}
          >
            <i className="fas fa-search"></i> Select
          </button>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <i className="fas fa-clock"></i> Force Sell After (seconds)
        </label>
        <input
          type="number"
          className="form-input"
          value={config.forceSellAfter || 0}
          onChange={(e) => onChange({ ...config, forceSellAfter: parseInt(e.target.value) })}
          placeholder="e.g., 60"
        />
      </div>

      <ItemSelectorModal
        isOpen={showItemSelector}
        onClose={() => setShowItemSelector(false)}
        onSelect={(item) => onChange({ ...config, item })}
        title="Select NPC Flip Item"
      />
    </div>
  );
}

// Kat Flip Config Component
function KatFlipConfig({ config, onChange }) {
  const [showItemSelector, setShowItemSelector] = useState(false);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">
          <i className="fas fa-cat"></i> Use Kat Flower
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div
            className={`toggle-switch ${config.useKatFlower ? 'active' : ''}`}
            onClick={() => onChange({ ...config, useKatFlower: !config.useKatFlower })}
          />
          <span style={{ fontWeight: '600', color: config.useKatFlower ? 'var(--pastel-green)' : 'var(--text-secondary)' }}>
            {config.useKatFlower ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <i className="fas fa-paw"></i> Pet
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            value={config.pet || ''}
            readOnly
            placeholder="Click to select pet"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowItemSelector(true)}
          >
            <i className="fas fa-search"></i> Select
          </button>
        </div>
      </div>

      <ItemSelectorModal
        isOpen={showItemSelector}
        onClose={() => setShowItemSelector(false)}
        onSelect={(item) => onChange({ ...config, pet: item })}
        title="Select Pet"
      />
    </div>
  );
}

// Forge Flip Config Component
function ForgeFlipConfig({ config, onChange }) {
  const [showItemSelector, setShowItemSelector] = useState(false);

  return (
    <div>
      <div className="form-group">
        <label className="form-label">
          <i className="fas fa-hammer"></i> Item to Forge
        </label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            value={config.item || ''}
            readOnly
            placeholder="Click to select item"
            style={{ flex: 1 }}
          />
          <button
            className="btn btn-primary"
            onClick={() => setShowItemSelector(true)}
          >
            <i className="fas fa-search"></i> Select
          </button>
        </div>
      </div>

      <ItemSelectorModal
        isOpen={showItemSelector}
        onClose={() => setShowItemSelector(false)}
        onSelect={(item) => onChange({ ...config, item })}
        title="Select Forge Item"
      />
    </div>
  );
}

// Main App Component
function App() {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [activeTab, setActiveTab] = useState('control');

  // Load bots from server
  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        setBots(data.bots || []);
        if (data.bots && data.bots.length > 0) {
          setSelectedBot(data.bots[0].id);
        }
      })
      .catch(err => console.error('Error loading bots:', err));
  }, []);

  const currentBot = bots.find(b => b.id === selectedBot);

  const handleAddBot = () => {
    const name = prompt('Enter bot name:');
    if (name) {
      fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
        .then(res => res.json())
        .then(data => {
          setBots([...bots, data.bot]);
          setSelectedBot(data.bot.id);
        });
    }
  };

  const handleBotAction = (action) => {
    fetch(`/api/bots/${selectedBot}/${action}`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        // Refresh bot data
        const updatedBots = bots.map(b =>
          b.id === selectedBot ? { ...b, status: data.status } : b
        );
        setBots(updatedBots);
      });
  };

  const handleConfigUpdate = (section, config) => {
    fetch(`/api/bots/${selectedBot}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, config })
    })
      .then(res => res.json())
      .then(data => {
        const updatedBots = bots.map(b =>
          b.id === selectedBot ? { ...b, config: data.config } : b
        );
        setBots(updatedBots);
      });
  };

  if (!currentBot) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ fontSize: '60px' }}>
          <i className="fas fa-robot"></i>
        </div>
        <h2 style={{ fontSize: '28px', fontWeight: '600', color: 'white' }}>No Bots Found</h2>
        <button className="btn btn-primary" onClick={handleAddBot}>
          <i className="fas fa-plus"></i> Add Your First Bot
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1><i className="fas fa-robot"></i> SkyBZM</h1>
          <p>Hypixel Flip Manager</p>
        </div>
        <div className="bot-list">
          {bots.map(bot => (
            <button
              key={bot.id}
              className={`bot-item ${selectedBot === bot.id ? 'active' : ''}`}
              onClick={() => setSelectedBot(bot.id)}
            >
              <div className="bot-icon">
                <i className="fas fa-robot"></i>
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div>{bot.name}</div>
                <div style={{ fontSize: '11px', opacity: 0.8 }}>
                  {bot.status || 'offline'}
                </div>
              </div>
            </button>
          ))}
        </div>
        <button className="add-bot-btn" onClick={handleAddBot}>
          <i className="fas fa-plus"></i> Add New Bot
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Tabs */}
        <div className="card">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'control' ? 'active' : ''}`}
              onClick={() => setActiveTab('control')}
            >
              <i className="fas fa-gamepad"></i> Control
            </button>
            <button
              className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <i className="fas fa-chart-bar"></i> Statistics
            </button>
            <button
              className={`tab ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              <i className="fas fa-cog"></i> Configuration
            </button>
            <button
              className={`tab ${activeTab === 'flips' ? 'active' : ''}`}
              onClick={() => setActiveTab('flips')}
            >
              <i className="fas fa-exchange-alt"></i> Flips
            </button>
          </div>
        </div>

        {/* Control Tab */}
        {activeTab === 'control' && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon">
                <i className="fas fa-gamepad"></i>
              </div>
              <div>
                <div className="card-title">Bot Control</div>
                <span className={`status-badge ${currentBot.status === 'running' ? 'online' : 'offline'}`}>
                  <i className="fas fa-circle"></i>
                  {currentBot.status || 'offline'}
                </span>
              </div>
            </div>
            <div className="control-panel">
              <button
                className="btn btn-success"
                onClick={() => handleBotAction('start')}
                disabled={currentBot.status === 'running'}
              >
                <i className="fas fa-play"></i> Start Bot
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleBotAction('stop')}
                disabled={currentBot.status !== 'running'}
              >
                <i className="fas fa-stop"></i> Stop Bot
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleBotAction('restart')}
              >
                <i className="fas fa-redo"></i> Restart Bot
              </button>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--pastel-blue), var(--pastel-green))' }}>
                <i className="fas fa-chart-bar"></i>
              </div>
              <div className="card-title">Statistics</div>
            </div>
            <div className="stats-grid">
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--pastel-purple), var(--pastel-pink))' }}>
                <div className="stat-label">Total Profit</div>
                <div className="stat-value">
                  <i className="fas fa-coins"></i>
                  {currentBot.stats?.totalProfit || 0}
                </div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--pastel-blue), var(--pastel-purple))' }}>
                <div className="stat-label">Flips Completed</div>
                <div className="stat-value">
                  <i className="fas fa-exchange-alt"></i>
                  {currentBot.stats?.flipsCompleted || 0}
                </div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--pastel-green), var(--pastel-blue))' }}>
                <div className="stat-label">Success Rate</div>
                <div className="stat-value">
                  <i className="fas fa-percentage"></i>
                  {currentBot.stats?.successRate || 0}%
                </div>
              </div>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, var(--pastel-yellow), var(--pastel-orange))' }}>
                <div className="stat-label">Uptime</div>
                <div className="stat-value">
                  <i className="fas fa-clock"></i>
                  {currentBot.stats?.uptime || '0h'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="card">
            <div className="card-header">
              <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--pastel-orange), var(--pastel-red))' }}>
                <i className="fas fa-cog"></i>
              </div>
              <div className="card-title">General Configuration</div>
            </div>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-user"></i> Minecraft Username
              </label>
              <input
                type="text"
                className="form-input"
                value={currentBot.config?.username || ''}
                onChange={(e) => handleConfigUpdate('general', { ...currentBot.config, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-server"></i> Proxy
              </label>
              <input
                type="text"
                className="form-input"
                value={currentBot.config?.proxy || ''}
                onChange={(e) => handleConfigUpdate('general', { ...currentBot.config, proxy: e.target.value })}
                placeholder="host:port"
              />
            </div>
            <button className="btn btn-primary">
              <i className="fas fa-save"></i> Save Configuration
            </button>
          </div>
        )}

        {/* Flips Tab */}
        {activeTab === 'flips' && (
          <div>
            {/* NPC Flip */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--pastel-green), var(--pastel-blue))' }}>
                  <i className="fas fa-user-tie"></i>
                </div>
                <div className="card-title">NPC Flip Configuration</div>
              </div>
              <NPCFlipConfig
                config={currentBot.config?.npcFlip || {}}
                onChange={(config) => handleConfigUpdate('npcFlip', config)}
              />
            </div>

            {/* Kat Flip */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--pastel-pink), var(--pastel-purple))' }}>
                  <i className="fas fa-cat"></i>
                </div>
                <div className="card-title">Kat Flip Configuration</div>
              </div>
              <KatFlipConfig
                config={currentBot.config?.katFlip || {}}
                onChange={(config) => handleConfigUpdate('katFlip', config)}
              />
            </div>

            {/* Craft Flip */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--pastel-yellow), var(--pastel-orange))' }}>
                  <i className="fas fa-hammer"></i>
                </div>
                <div className="card-title">Craft Flip Configuration</div>
              </div>
              <CraftingGrid
                config={currentBot.config?.craftFlip || {}}
                onChange={(config) => handleConfigUpdate('craftFlip', config)}
              />
            </div>

            {/* Forge Flip */}
            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'linear-gradient(135deg, var(--pastel-red), var(--pastel-orange))' }}>
                  <i className="fas fa-fire"></i>
                </div>
                <div className="card-title">Forge Flip Configuration</div>
              </div>
              <ForgeFlipConfig
                config={currentBot.config?.forgeFlip || {}}
                onChange={(config) => handleConfigUpdate('forgeFlip', config)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Render App
ReactDOM.render(<App />, document.getElementById('root'));
