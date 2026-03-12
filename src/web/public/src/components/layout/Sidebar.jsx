import './Sidebar.css';

const menuItems = [
  { id: 'control', label: 'Bot Control', icon: '🎮' },
  { id: 'stats', label: 'Statistics', icon: '📊' },
  { id: 'general', label: 'General', icon: '⚙️' },
  { id: 'proxy', label: 'Proxy', icon: '🌐' },
  { id: 'flips', label: 'Flips', icon: '💰' },
];

export function Sidebar({ activeSection, setActiveSection }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">💎</span>
          <span className="sidebar-logo-text">SkyBZM</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${activeSection === item.id ? 'sidebar-item-active' : ''}`}
            onClick={() => setActiveSection(item.id)}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-text">
          <span>v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
