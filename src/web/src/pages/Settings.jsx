import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowLeft,
  Sun,
  Moon,
  Save,
  Globe,
  Bell,
  Shield,
  Database
} from 'lucide-react';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    apiUrl: 'https://sky.coflnet.com',
    apiKey: '',
    webhookUrl: '',
    notifications: {
      enabled: false,
      onProfit: true,
      onError: true
    },
    debug: false,
    autoReconnect: true
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.config) {
        setConfig(prev => ({ ...prev, ...data.config }));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching config:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error('Error saving config:', error);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animated-bg">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
        </div>
        <div className="relative z-10 text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-t-transparent mb-4" 
            style={{ borderColor: 'var(--accent-purple) transparent transparent transparent' }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="px-8 py-6 backdrop-blur-lg bg-white/30 dark:bg-black/30 border-b border-white/20">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link 
                to="/"
                className="w-12 h-12 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform"
                style={{ 
                  background: 'var(--bg-card)',
                  boxShadow: '0 4px 12px var(--shadow)'
                }}
              >
                <ArrowLeft className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
              </Link>
              
              <div>
                <h1 className="text-2xl font-bold gradient-text">Global Settings</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Configure application-wide settings
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 rounded-xl flex items-center gap-2 font-medium hover:scale-105 transition-transform disabled:opacity-50"
                style={{ 
                  background: saving ? 'var(--success)' : 'var(--accent-purple)',
                  color: 'white',
                  boxShadow: '0 4px 12px var(--shadow)'
                }}
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saved!' : 'Save Settings'}
              </button>
              
              <button
                onClick={toggleTheme}
                className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                style={{ 
                  background: 'var(--bg-card)',
                  boxShadow: '0 4px 12px var(--shadow)'
                }}
              >
                {theme === 'light' ? (
                  <Moon className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                ) : (
                  <Sun className="w-6 h-6" style={{ color: 'var(--text-primary)' }} />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Settings Content */}
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* API Settings */}
            <div 
              className="p-6 rounded-2xl"
              style={{ 
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--shadow)'
              }}
            >
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Globe className="w-5 h-5" />
                API Configuration
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    API URL
                  </label>
                  <input
                    type="text"
                    value={config.apiUrl || ''}
                    onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                    placeholder="https://sky.coflnet.com"
                    className="w-full px-4 py-3 rounded-xl border-2"
                    style={{ 
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    API Key (optional)
                  </label>
                  <input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="••••••••••••••••"
                    className="w-full px-4 py-3 rounded-xl border-2"
                    style={{ 
                      background: 'var(--bg-secondary)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    Auto Reconnect
                  </label>
                  <input
                    type="checkbox"
                    checked={config.autoReconnect}
                    onChange={(e) => setConfig({ ...config, autoReconnect: e.target.checked })}
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div 
              className="p-6 rounded-2xl"
              style={{ 
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--shadow)'
              }}
            >
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Bell className="w-5 h-5" />
                Notifications
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    Enable Notifications
                  </label>
                  <input
                    type="checkbox"
                    checked={config.notifications?.enabled || false}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      notifications: { ...config.notifications, enabled: e.target.checked }
                    })}
                  />
                </div>

                {config.notifications?.enabled && (
                  <>
                    <div className="flex items-center justify-between">
                      <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        Notify on Profit
                      </label>
                      <input
                        type="checkbox"
                        checked={config.notifications?.onProfit || false}
                        onChange={(e) => setConfig({ 
                          ...config, 
                          notifications: { ...config.notifications, onProfit: e.target.checked }
                        })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        Notify on Error
                      </label>
                      <input
                        type="checkbox"
                        checked={config.notifications?.onError || false}
                        onChange={(e) => setConfig({ 
                          ...config, 
                          notifications: { ...config.notifications, onError: e.target.checked }
                        })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Webhook URL (optional)
                      </label>
                      <input
                        type="text"
                        value={config.webhookUrl || ''}
                        onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="w-full px-4 py-3 rounded-xl border-2"
                        style={{ 
                          background: 'var(--bg-secondary)',
                          borderColor: 'var(--border-color)',
                          color: 'var(--text-primary)'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Advanced */}
            <div 
              className="p-6 rounded-2xl lg:col-span-2"
              style={{ 
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--shadow)'
              }}
            >
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Shield className="w-5 h-5" />
                Advanced Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Debug Mode
                    </label>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      Enable verbose logging
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.debug || false}
                    onChange={(e) => setConfig({ ...config, debug: e.target.checked })}
                  />
                </div>

                <div 
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Database className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      Application Info
                    </span>
                  </div>
                  <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                    <p>Version: 1.0.0</p>
                    <p>Theme: {theme === 'light' ? 'Light Mode' : 'Dark Mode'}</p>
                    <p>Server: Running</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
