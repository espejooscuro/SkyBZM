import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, Activity, TrendingUp, Users, Zap } from 'lucide-react';
import { useBots } from '../utils/hooks';
import { BotCard } from '../components/BotCard';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/Button';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { bots, loading, error, refetch } = useBots();

  const connectedBots = bots.filter(b => b.state === 'connected').length;
  const totalBots = bots.length;

  const handleRefresh = () => {
    refetch();
  };

  const handleSettings = () => {
    navigate('/settings');
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">
              <span className="text-gradient">SkyBZM</span> Dashboard
            </h1>
            <p className="dashboard-subtitle">
              Manage your Hypixel Skyblock bazaar flipping bots
            </p>
          </div>
          
          <div className="dashboard-actions">
            <Button
              variant="ghost"
              icon={<RefreshCw size={18} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              icon={<Settings size={18} />}
              onClick={handleSettings}
            >
              Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Stats Overview */}
        <div className="stats-grid">
          <StatCard
            title="Total Bots"
            value={totalBots}
            icon={<Users size={24} />}
            color="primary"
            loading={loading}
          />
          <StatCard
            title="Connected"
            value={connectedBots}
            icon={<Activity size={24} />}
            color="success"
            loading={loading}
          />
          <StatCard
            title="Active Flips"
            value="Coming Soon"
            icon={<Zap size={24} />}
            color="warning"
            loading={loading}
          />
          <StatCard
            title="Total Profit"
            value="Coming Soon"
            icon={<TrendingUp size={24} />}
            color="info"
            loading={loading}
          />
        </div>

        {/* Bots Grid */}
        <div className="bots-section">
          <div className="section-header">
            <h2 className="section-title">Your Bots</h2>
            <span className="section-subtitle">
              {connectedBots} of {totalBots} online
            </span>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="spinner animate-spin"></div>
              <p>Loading bots...</p>
            </div>
          )}

          {error && (
            <div className="error-container">
              <p className="error-message">Error loading bots: {error}</p>
              <Button variant="primary" onClick={refetch}>
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && bots.length === 0 && (
            <div className="empty-state">
              <Users size={64} className="empty-icon" />
              <h3>No Bots Found</h3>
              <p>Add bots in the configuration file to get started</p>
              <Button variant="primary" onClick={handleSettings}>
                Go to Settings
              </Button>
            </div>
          )}

          {!loading && !error && bots.length > 0 && (
            <div className="bots-grid">
              {bots.map((bot) => (
                <BotCard key={bot.username} bot={bot} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
