import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  ArrowLeft,
  Sun,
  Moon,
  Save,
  Plus,
  Trash2,
  Settings as SettingsIcon,
  TrendingUp,
  Activity,
  Coins,
  ShoppingCart,
  Sparkles,
  Hammer,
  Package
} from 'lucide-react';
import FlipConfigurator from '../components/FlipConfigurator';
import StatsPanel from '../components/StatsPanel';

const BotDetail = () => {
  const { username } = useParams();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bot, setBot] = useState(null);
  const [config, setConfig] = useState({
    enabled: true,
    autoStart: false,
    maxPurse: 100000000,
    minProfit: 1000000,
    flips: {
      npc: [],
      kat: [],
      craft: [],
      forge: []
    },
    proxy: {
      enabled: false,
      host: '',
      port: '',
      username: '',
      password: ''
    }
  });
  const [activeTab, setActiveTab] = useState('config');

  useEffect(() => {
    fetchBotData();
  }, [username]);

  const fetchBotData = async () => {
    try {
      const [botRes, configRes] = await Promise.all([
        fetch(`/api/bots/${username}`),
        fetch(`/api/bots/${username}/config`)
      ]);
      
      const botData = await botRes.json();
      const configData = await configRes.json();
      
      // Safely set bot data
      setBot(botData?.bot || null);
      
      // Safely merge config with defaults
      if (configData?.config) {
        setConfig(prev => ({
          ...prev,
          ...configData.config,
          flips: {
            npc: configData.config?.flips?.npc || [],
            kat: configData.config?.flips?.kat || [],
            craft: configData.config?.flips?.craft || [],
            forge: configData.config?.flips?.forge || []
          },
          proxy: {
            enabled: configData.config?.proxy?.enabled || false,
            host: configData.config?.proxy?.host || '',
            port: configData.config?.proxy?.port || '',
            username: configData.config?.proxy?.username || '',
            password: configData.config?.proxy?.password || ''
          }
        }));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bot data:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/bots/${username}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      // Show success feedback
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error('Error saving config:', error);
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'config', label: 'Configuration', icon: SettingsIcon },
    { id: 'flips', label: 'Flips', icon: ShoppingCart },
    { id: 'stats', label: 'Statistics', icon: TrendingUp },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

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
          <p className="text-lg font-medium" style={{ color: 'var(--text-muted)' }}>
            Loading bot configuration...
          </p>
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
                <h1 className="text-2xl font-bold gradient-text">{username}</h1>
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-2 h-2 rounded-full ${bot?.status === 'running' ? 'animate-pulse' : ''}`}
                    style={{ 
                      background: bot?.status === 'running' ? 'var(--success)' : 'var(--text-muted)' 
                    }}
                  ></div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {bot?.status === 'running' ? 'Running' : 'Stopped'}
                  </p>
                </div>
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
                {saving ? 'Saved!' : 'Save Changes'}
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-6 py-3 rounded-xl flex items-center gap-2 font-medium whitespace-nowrap transition-all"
                  style={{ 
                    background: activeTab === tab.id ? 'var(--accent-purple)' : 'var(--bg-card)',
                    color: activeTab === tab.id ? 'white' : 'var(--text-primary)',
                    boxShadow: activeTab === tab.id ? '0 8px 24px var(--shadow-lg)' : '0 4px 12px var(--shadow)',
                    transform: activeTab === tab.id ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="animate-fade-in">
            {activeTab === 'config' && (
              <ConfigPanel config={config} setConfig={setConfig} />
            )}
            {activeTab === 'flips' && (
              <FlipsPanel config={config} setConfig={setConfig} />
            )}
            {activeTab === 'stats' && (
              <StatsPanel username={username} />
            )}
            {activeTab === 'activity' && (
              <ActivityPanel username={username} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Configuration Panel
const ConfigPanel = ({ config, setConfig }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* General Settings */}
      <div 
        className="p-6 rounded-2xl"
        style={{ 
          background: 'var(--bg-card)',
          boxShadow: '0 8px 24px var(--shadow)'
        }}
      >
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <SettingsIcon className="w-5 h-5" />
          General Settings
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Bot Enabled
            </label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Auto Start
            </label>
            <input
              type="checkbox"
              checked={config.autoStart}
              onChange={(e) => setConfig({ ...config, autoStart: e.target.checked })}
            />
          </div>

          <div>
            <label className="block font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Max Purse: {config.maxPurse?.toLocaleString() || 0}
            </label>
            <input
              type="range"
              min="1000000"
              max="500000000"
              step="1000000"
              value={config.maxPurse || 100000000}
              onChange={(e) => setConfig({ ...config, maxPurse: parseInt(e.target.value) })}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>1M</span>
              <span>500M</span>
            </div>
          </div>

          <div>
            <label className="block font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Min Profit: {config.minProfit?.toLocaleString() || 0}
            </label>
            <input
              type="range"
              min="100000"
              max="50000000"
              step="100000"
              value={config.minProfit || 1000000}
              onChange={(e) => setConfig({ ...config, minProfit: parseInt(e.target.value) })}
            />
            <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              <span>100K</span>
              <span>50M</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proxy Settings */}
      <div 
        className="p-6 rounded-2xl"
        style={{ 
          background: 'var(--bg-card)',
          boxShadow: '0 8px 24px var(--shadow)'
        }}
      >
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Activity className="w-5 h-5" />
          Proxy Configuration
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <label className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Use Proxy
            </label>
            <input
              type="checkbox"
              checked={config.proxy?.enabled || false}
              onChange={(e) => setConfig({ 
                ...config, 
                proxy: { ...config.proxy, enabled: e.target.checked }
              })}
            />
          </div>

          {config.proxy?.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Host
                </label>
                <input
                  type="text"
                  value={config.proxy?.host || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    proxy: { ...config.proxy, host: e.target.value }
                  })}
                  placeholder="proxy.example.com"
                  className="w-full px-4 py-2 rounded-xl border-2"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Port
                </label>
                <input
                  type="text"
                  value={config.proxy?.port || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    proxy: { ...config.proxy, port: e.target.value }
                  })}
                  placeholder="8080"
                  className="w-full px-4 py-2 rounded-xl border-2"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Username (optional)
                </label>
                <input
                  type="text"
                  value={config.proxy?.username || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    proxy: { ...config.proxy, username: e.target.value }
                  })}
                  placeholder="proxy_user"
                  className="w-full px-4 py-2 rounded-xl border-2"
                  style={{ 
                    background: 'var(--bg-secondary)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Password (optional)
                </label>
                <input
                  type="password"
                  value={config.proxy?.password || ''}
                  onChange={(e) => setConfig({ 
                    ...config, 
                    proxy: { ...config.proxy, password: e.target.value }
                  })}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 rounded-xl border-2"
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
    </div>
  );
};

// Flips Panel
const FlipsPanel = ({ config, setConfig }) => {
  const [selectedType, setSelectedType] = useState('npc');

  const flipTypes = [
    { id: 'npc', label: 'NPC Flips', icon: Coins },
    { id: 'kat', label: 'Kat Flips', icon: Sparkles },
    { id: 'craft', label: 'Craft Flips', icon: Hammer },
    { id: 'forge', label: 'Forge Flips', icon: Package }
  ];

  const addFlip = () => {
    const newFlip = getDefaultFlip(selectedType);
    setConfig({
      ...config,
      flips: {
        ...config.flips,
        [selectedType]: [...(config.flips[selectedType] || []), newFlip]
      }
    });
  };

  const removeFlip = (index) => {
    const newFlips = [...config.flips[selectedType]];
    newFlips.splice(index, 1);
    setConfig({
      ...config,
      flips: {
        ...config.flips,
        [selectedType]: newFlips
      }
    });
  };

  const updateFlip = (index, updates) => {
    const newFlips = [...config.flips[selectedType]];
    newFlips[index] = { ...newFlips[index], ...updates };
    setConfig({
      ...config,
      flips: {
        ...config.flips,
        [selectedType]: newFlips
      }
    });
  };

  return (
    <div>
      {/* Flip Type Selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {flipTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className="p-4 rounded-2xl flex flex-col items-center gap-3 transition-all"
              style={{ 
                background: selectedType === type.id ? 'var(--accent-purple)' : 'var(--bg-card)',
                color: selectedType === type.id ? 'white' : 'var(--text-primary)',
                boxShadow: selectedType === type.id ? '0 8px 24px var(--shadow-lg)' : '0 4px 12px var(--shadow)',
                transform: selectedType === type.id ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              <Icon className="w-8 h-8" />
              <span className="font-medium">{type.label}</span>
              <span className="text-sm opacity-80">
                {config.flips[type.id]?.length || 0} configured
              </span>
            </button>
          );
        })}
      </div>

      {/* Add Flip Button */}
      <button
        onClick={addFlip}
        className="w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-medium mb-6 hover:scale-105 transition-transform"
        style={{ 
          background: 'var(--accent-green)',
          color: 'white',
          boxShadow: '0 8px 24px var(--shadow)'
        }}
      >
        <Plus className="w-5 h-5" />
        Add {flipTypes.find(t => t.id === selectedType)?.label.slice(0, -1)}
      </button>

      {/* Flips List */}
      <div className="space-y-4">
        {(config.flips[selectedType] || []).map((flip, index) => (
          <FlipConfigurator
            key={index}
            type={selectedType}
            flip={flip}
            index={index}
            onUpdate={(updates) => updateFlip(index, updates)}
            onRemove={() => removeFlip(index)}
          />
        ))}

        {(config.flips[selectedType]?.length || 0) === 0 && (
          <div 
            className="text-center py-12 rounded-2xl"
            style={{ 
              background: 'var(--bg-card)',
              boxShadow: '0 8px 24px var(--shadow)'
            }}
          >
            <ShoppingCart className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              No {flipTypes.find(t => t.id === selectedType)?.label} configured
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Click "Add" to create your first flip
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Activity Panel
const ActivityPanel = ({ username }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 5000);
    return () => clearInterval(interval);
  }, [username]);

  const fetchActivities = async () => {
    try {
      const res = await fetch(`/api/bots/${username}/activity?limit=50`);
      const data = await res.json();
      setActivities(data.logs || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  return (
    <div 
      className="p-6 rounded-2xl"
      style={{ 
        background: 'var(--bg-card)',
        boxShadow: '0 8px 24px var(--shadow)'
      }}
    >
      <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
        Recent Activity
      </h3>
      
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {activities.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No activity yet
          </p>
        ) : (
          activities.map((activity, index) => (
            <div 
              key={index}
              className="p-4 rounded-xl"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {activity.message}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
                {activity.profit && (
                  <span 
                    className="px-3 py-1 rounded-lg text-sm font-bold"
                    style={{ 
                      background: activity.profit > 0 ? 'var(--success)' : 'var(--error)',
                      color: 'white'
                    }}
                  >
                    {activity.profit > 0 ? '+' : ''}{activity.profit.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const getDefaultFlip = (type) => {
  switch (type) {
    case 'npc':
      return { item: '', minSpread: 1000000, forceSellAfter: 3600 };
    case 'kat':
      return { pet: '', useKatFlower: false };
    case 'craft':
      return { 
        recipe: Array(9).fill(null).map(() => ({ item: '', amount: 0 })),
        output: ''
      };
    case 'forge':
      return { item: '' };
    default:
      return {};
  }
};

export default BotDetail;

