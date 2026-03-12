import { useState } from 'react';
import './ProxyConfig.css';

function ProxyConfig({ bot, updateBot }) {
  const [proxyEnabled, setProxyEnabled] = useState(bot.proxy?.enabled || false);
  const [proxyConfig, setProxyConfig] = useState(bot.proxy || {
    enabled: false,
    host: '',
    port: '',
    username: '',
    password: '',
    type: 'socks5'
  });

  const handleToggle = (e) => {
    const newEnabled = e.target.checked;
    setProxyEnabled(newEnabled);
    const newConfig = { ...proxyConfig, enabled: newEnabled };
    setProxyConfig(newConfig);
    updateBot(bot.id, { proxy: newConfig });
  };

  const handleChange = (field, value) => {
    const newConfig = { ...proxyConfig, [field]: value };
    setProxyConfig(newConfig);
    updateBot(bot.id, { proxy: newConfig });
  };

  return (
    <div className="proxy-config-card">
      <div className="card-header">
        <div className="card-title">
          <i className="fas fa-network-wired"></i>
          <span>Proxy Configuration</span>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={proxyEnabled} onChange={handleToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {proxyEnabled && (
        <div className="proxy-form fade-in">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-server"></i>
                Proxy Host
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="proxy.example.com"
                value={proxyConfig.host}
                onChange={(e) => handleChange('host', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-ethernet"></i>
                Proxy Port
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="1080"
                value={proxyConfig.port}
                onChange={(e) => handleChange('port', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-exchange-alt"></i>
                Proxy Type
              </label>
              <select
                className="form-select"
                value={proxyConfig.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <option value="socks5">SOCKS5</option>
                <option value="socks4">SOCKS4</option>
                <option value="http">HTTP</option>
                <option value="https">HTTPS</option>
              </select>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: '20px' }}>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-user"></i>
                Proxy Username (Optional)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Username"
                value={proxyConfig.username}
                onChange={(e) => handleChange('username', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-key"></i>
                Proxy Password (Optional)
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Password"
                value={proxyConfig.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
            </div>
          </div>

          <div className="proxy-status" style={{ marginTop: '25px' }}>
            <div className="status-indicator">
              <i className="fas fa-circle"></i>
              <span>Proxy Status: {proxyConfig.host && proxyConfig.port ? 'Configured' : 'Not Configured'}</span>
            </div>
            <button
              className="test-proxy-btn"
              onClick={() => alert('Testing proxy connection...')}
              disabled={!proxyConfig.host || !proxyConfig.port}
            >
              <i className="fas fa-vial"></i>
              Test Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProxyConfig;
