import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Coins, Activity, Clock, Target } from 'lucide-react';

const StatsPanel = ({ username }) => {
  const [stats, setStats] = useState({
    totalProfit: 0,
    totalFlips: 0,
    successRate: 0,
    avgProfit: 0,
    bestFlip: 0,
    worstFlip: 0,
    uptime: 0,
    flipsPerHour: 0
  });
  const [profitHistory, setProfitHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [username]);

  const fetchStats = async () => {
    try {
      const [botRes, profitsRes] = await Promise.all([
        fetch(`/api/bots/${username}`),
        fetch(`/api/bots/${username}/profits?limit=100`)
      ]);
      
      const botData = await botRes.json();
      const profitsData = await profitsRes.json();
      
      // Safely set stats with defaults
      setStats({
        totalProfit: botData?.bot?.stats?.totalProfit || 0,
        totalFlips: botData?.bot?.stats?.totalFlips || 0,
        successRate: botData?.bot?.stats?.successRate || 0,
        avgProfit: botData?.bot?.stats?.avgProfit || 0,
        bestFlip: botData?.bot?.stats?.bestFlip || 0,
        worstFlip: botData?.bot?.stats?.worstFlip || 0,
        uptime: botData?.bot?.stats?.uptime || 0,
        flipsPerHour: botData?.bot?.stats?.flipsPerHour || 0
      });
      
      // Safely set profit history
      setProfitHistory(Array.isArray(profitsData?.profits) ? profitsData.profits : []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalProfit: 0,
        totalFlips: 0,
        successRate: 0,
        avgProfit: 0,
        bestFlip: 0,
        worstFlip: 0,
        uptime: 0,
        flipsPerHour: 0
      });
      setProfitHistory([]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" 
          style={{ borderColor: 'var(--accent-purple) transparent transparent transparent' }}
        ></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Coins}
          label="Total Profit"
          value={stats.totalProfit?.toLocaleString() || '0'}
          color="var(--success)"
          gradient="from-green-400 to-emerald-400"
        />
        
        <StatCard
          icon={Activity}
          label="Total Flips"
          value={stats.totalFlips?.toLocaleString() || '0'}
          color="var(--info)"
          gradient="from-blue-400 to-cyan-400"
        />
        
        <StatCard
          icon={Target}
          label="Success Rate"
          value={`${stats.successRate || 0}%`}
          color="var(--accent-purple)"
          gradient="from-purple-400 to-pink-400"
        />
        
        <StatCard
          icon={TrendingUp}
          label="Avg Profit"
          value={stats.avgProfit?.toLocaleString() || '0'}
          color="var(--accent-orange)"
          gradient="from-orange-400 to-yellow-400"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div 
          className="p-6 rounded-2xl"
          style={{ 
            background: 'var(--bg-card)',
            boxShadow: '0 8px 24px var(--shadow)'
          }}
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <TrendingUp className="w-5 h-5" />
            Performance Metrics
          </h3>
          
          <div className="space-y-4">
            <MetricRow 
              label="Best Flip" 
              value={`+${stats.bestFlip?.toLocaleString() || 0}`}
              positive
            />
            <MetricRow 
              label="Worst Flip" 
              value={`${stats.worstFlip?.toLocaleString() || 0}`}
              positive={stats.worstFlip >= 0}
            />
            <MetricRow 
              label="Flips/Hour" 
              value={stats.flipsPerHour?.toFixed(1) || '0'}
            />
            <MetricRow 
              label="Uptime" 
              value={formatUptime(stats.uptime || 0)}
            />
          </div>
        </div>

        <div 
          className="p-6 rounded-2xl"
          style={{ 
            background: 'var(--bg-card)',
            boxShadow: '0 8px 24px var(--shadow)'
          }}
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Clock className="w-5 h-5" />
            Recent Flips
          </h3>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {profitHistory.slice(0, 10).map((flip, index) => (
              <div 
                key={index}
                className="flex justify-between items-center p-3 rounded-xl"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {flip.item || 'Unknown Item'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(flip.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <span 
                  className="px-3 py-1 rounded-lg text-sm font-bold"
                  style={{ 
                    background: flip.profit > 0 ? 'var(--success)' : 'var(--error)',
                    color: 'white'
                  }}
                >
                  {flip.profit > 0 ? '+' : ''}{flip.profit?.toLocaleString() || 0}
                </span>
              </div>
            ))}

            {profitHistory.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                No flips recorded yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Profit Chart (Simple) */}
      <div 
        className="p-6 rounded-2xl"
        style={{ 
          background: 'var(--bg-card)',
          boxShadow: '0 8px 24px var(--shadow)'
        }}
      >
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          Profit Timeline
        </h3>
        
        <div className="h-48 flex items-end gap-2">
          {profitHistory.slice(0, 50).map((flip, index) => {
            const maxProfit = Math.max(...profitHistory.map(f => Math.abs(f.profit || 0)));
            const height = Math.abs(flip.profit || 0) / maxProfit * 100;
            const isPositive = flip.profit > 0;
            
            return (
              <div
                key={index}
                className="flex-1 rounded-t-lg transition-all hover:opacity-80 cursor-pointer"
                style={{
                  height: `${height}%`,
                  minHeight: '4px',
                  background: isPositive ? 'var(--success)' : 'var(--error)'
                }}
                title={`${flip.item}: ${flip.profit > 0 ? '+' : ''}${flip.profit?.toLocaleString()}`}
              />
            );
          })}

          {profitHistory.length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No data available
              </p>
            </div>
          )}
        </div>

        {profitHistory.length > 0 && (
          <div className="flex justify-between mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Oldest</span>
            <span>Latest</span>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, gradient }) => {
  return (
    <div 
      className="card p-6 rounded-2xl animate-slide-in"
      style={{ 
        background: 'var(--bg-card)',
        boxShadow: '0 8px 24px var(--shadow)'
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div 
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
      </h3>
      <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  );
};

const MetricRow = ({ label, value, positive }) => {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span 
        className="text-sm font-bold"
        style={{ 
          color: positive === undefined ? 'var(--text-primary)' : 
                 positive ? 'var(--success)' : 'var(--error)'
        }}
      >
        {value}
      </span>
    </div>
  );
};

const formatUptime = (seconds) => {
  if (!seconds) return '0h 0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  
  return `${hours}h ${minutes}m`;
};

export default StatsPanel;

