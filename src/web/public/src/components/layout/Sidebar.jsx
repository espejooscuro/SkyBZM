import './Sidebar.css';

function Sidebar({ bots, selectedBot, onSelectBot, onAddBot }) {
  return (
    <div className="sidebar slide-in-left">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <i className="fas fa-robot"></i>
          <span>SkyBZM</span>
        </div>
        <div className="sidebar-subtitle">Control Panel</div>
      </div>

      <div className="sidebar-section">
        <div className="section-title">
          <i className="fas fa-server"></i>
          Your Bots
        </div>
        
        <div className="bots-list">
          {bots.map(bot => (
            <div
              key={bot.id}
              className={`bot-item ${selectedBot === bot.id ? 'active' : ''}`}
              onClick={() => onSelectBot(bot.id)}
            >
              <div className="bot-item-icon">
                <i className={`fas fa-${bot.status === 'running' ? 'circle' : 'circle'}`}></i>
              </div>
              <div className="bot-item-info">
                <div className="bot-item-name">{bot.name || `Bot ${bot.id}`}</div>
                <div className="bot-item-status">
                  <span className={`status-badge ${bot.status || 'offline'}`}>
                    {bot.status === 'running' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              {selectedBot === bot.id && (
                <div className="bot-item-indicator">
                  <i className="fas fa-chevron-right"></i>
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="add-bot-btn" onClick={onAddBot}>
          <i className="fas fa-plus"></i>
          <span>Add New Bot</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="footer-stat">
          <i className="fas fa-chart-line"></i>
          <div>
            <div className="footer-stat-label">Total Bots</div>
            <div className="footer-stat-value">{bots.length}</div>
          </div>
        </div>
        <div className="footer-stat">
          <i className="fas fa-check-circle"></i>
          <div>
            <div className="footer-stat-label">Active</div>
            <div className="footer-stat-value">
              {bots.filter(b => b.status === 'running').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
