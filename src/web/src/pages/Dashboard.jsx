import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  Sun, 
  Moon, 
  Bot, 
  Activity, 
  TrendingUp, 
  Coins,
  Play,
  Pause,
  RotateCw,
  Settings as SettingsIcon,
  ChevronRight
} from 'lucide-react';

const Dashboard = () => {
  const { theme, toggleTheme } = useTheme();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProfit: 0,
    activeFlips: 0,
    totalFlips: 0
  });

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBots = async () => {
    try {
      const res = await fetch('/api/bots');
      const data = await res.json();
      
      // Safely handle response
      const botsList = Array.isArray(data.bots) ? data.bots : [];
      setBots(botsList);
      
      // Calculate stats with safe defaults
      const totalProfit = botsList.reduce((acc, bot) => {
        return acc + (bot?.stats?.profit || 0);
      }, 0);
      
      const activeFlips = botsList.filter(bot => bot?.status === 'running').length;
      
      const totalFlips = botsList.reduce((acc, bot) => {
        return acc + (bot?.stats?.totalFlips || 0);
      }, 0);
      
      setStats({ totalProfit, activeFlips, totalFlips });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching bots:', error);
      setBots([]);
      setStats({ totalProfit: 0, activeFlips: 0, totalFlips: 0 });
      setLoading(false);
    }
  };

  const handleBotAction = async (username, action) => {
    try {
      await fetch(`/api/bots/${username}/${action}`, { method: 'POST' });
      fetchBots();
    } catch (error) {
      console.error(`Error ${action} bot:`, error);
    }
  };

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
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">SkyBZM Dashboard</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Manage your flipping bots
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link 
                to="/settings"
                className="px-4 py-2 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform"
                style={{ 
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 4px 12px var(--shadow)'
                }}
              >
                <SettingsIcon className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </Link>
              
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

        {/* Stats Cards */}
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Profit */}
            <div 
              className="card p-6 rounded-2xl animate-slide-in"
              style={{ 
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--shadow)',
                animationDelay: '0.1s'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5" style={{ color: 'var(--success)' }} />
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Total Profit
              </h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.totalProfit.toLocaleString()}
              </p>
            </div>

            {/* Active Bots */}
            <div 
              className="card p-6 rounded-2xl animate-slide-in"
              style={{ 
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--shadow)',
                animationDelay: '0.2s'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Active Bots
              </h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.activeFlips} / {bots.length}
              </p>
            </div>

            {/* Total Flips */}
            <div 
              className="card p-6 rounded-2xl animate-slide-in"
              style={{ 
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--shadow)',
                animationDelay: '0.3s'
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <RotateCw className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                Total Flips
              </h3>
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.totalFlips.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Bots Grid */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Your Bots
            </h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {bots.length} bot{bots.length !== 1 ? 's' : ''} configured
            </span>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" 
                style={{ borderColor: 'var(--accent-purple) transparent transparent transparent' }}
              ></div>
              <p className="mt-4" style={{ color: 'var(--text-muted)' }}>Loading bots...</p>
            </div>
          ) : bots.length === 0 ? (
            <div 
              className="text-center py-20 rounded-2xl"
              style={{ 
                background: 'var(--bg-card)',
                boxShadow: '0 8px 24px var(--shadow)'
              }}
            >
              <Bot className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                No bots configured
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                Add bots in the config.json file to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bots.map((bot, index) => (
                <BotCard 
                  key={bot.username} 
                  bot={bot} 
                  onAction={handleBotAction}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BotCard = ({ bot, onAction, index }) => {
  const isRunning = bot.status === 'running';
  
  return (
    <div 
      className="card p-6 rounded-2xl animate-slide-in"
      style={{ 
        background: 'var(--bg-card)',
        boxShadow: '0 8px 24px var(--shadow)',
        animationDelay: `${index * 0.1}s`
      }}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div 
            className={`w-3 h-3 rounded-full ${isRunning ? 'animate-pulse' : ''}`}
            style={{ 
              background: isRunning ? 'var(--success)' : 'var(--text-muted)' 
            }}
          ></div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <Link 
          to={`/bot/${bot.username}`}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
        </Link>
      </div>

      {/* Bot Name */}
      <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
        {bot.username}
      </h3>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Profit</span>
          <span className="text-sm font-bold" style={{ color: 'var(--success)' }}>
            +{(bot.stats?.profit || 0).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Flips</span>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {(bot.stats?.totalFlips || 0).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Win Rate</span>
          <span className="text-sm font-bold" style={{ color: 'var(--info)' }}>
            {bot.stats?.winRate || 0}%
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {!isRunning ? (
          <button
            onClick={() => onAction(bot.username, 'start')}
            className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 font-medium hover:scale-105 transition-transform"
            style={{ 
              background: 'var(--success)',
              color: 'white'
            }}
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        ) : (
          <>
            <button
              onClick={() => onAction(bot.username, 'stop')}
              className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 font-medium hover:scale-105 transition-transform"
              style={{ 
                background: 'var(--error)',
                color: 'white'
              }}
            >
              <Pause className="w-4 h-4" />
              Stop
            </button>
            <button
              onClick={() => onAction(bot.username, 'restart')}
              className="px-3 py-2 rounded-xl flex items-center justify-center hover:scale-105 transition-transform"
              style={{ 
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)'
              }}
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

