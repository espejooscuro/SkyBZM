import { useState } from 'react';
import './GeneralConfig.css';

function GeneralConfig({ bot, updateBot }) {
  const [config, setConfig] = useState(bot.config || {
    username: '',
    password: '',
    server: 'hypixel.net',
    autoReconnect: true,
    reconnectDelay: 5,
    chatLog: true,
    debugMode: false
  });

  const handleChange = (field, value) => {
    const newConfig = { ...config, [field]: value };
    setConfig(newConfig);
    updateBot(bot.id, { config: newConfig });
  };

  return (
    <div className="general-config-card">
      <div className="card-header">
        <div className="card-title">
          <i className="fas fa-cog"></i>
          <span>General Configuration</span>
        </div>
      </div>

      <div className="config-grid">
        <div className="config-section">
          <h3>
            <i className="fas fa-user"></i>
            Account Settings
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-user-circle"></i>
                Username
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={config.username}
                onChange={(e) => handleChange('username', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-key"></i>
                Password
              </label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={config.password}
                onChange={(e) => handleChange('password', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-server"></i>
                Server
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="hypixel.net"
                value={config.server}
                onChange={(e) => handleChange('server', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>
            <i className="fas fa-sliders-h"></i>
            Bot Behavior
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={config.autoReconnect}
                  onChange={(e) => handleChange('autoReconnect', e.target.checked)}
                />
                <span className="checkbox-label">Auto Reconnect</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-clock"></i>
                Reconnect Delay (seconds)
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="5"
                value={config.reconnectDelay}
                onChange={(e) => handleChange('reconnectDelay', e.target.value)}
                disabled={!config.autoReconnect}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={config.chatLog}
                  onChange={(e) => handleChange('chatLog', e.target.checked)}
                />
                <span className="checkbox-label">Enable Chat Logging</span>
              </label>
            </div>

            <div className="form-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={config.debugMode}
                  onChange={(e) => handleChange('debugMode', e.target.checked)}
                />
                <span className="checkbox-label">Debug Mode</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GeneralConfig;
