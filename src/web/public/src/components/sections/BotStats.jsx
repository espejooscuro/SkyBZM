import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import './BotStats.css';

export function BotStats({ accountIndex }) {
  const { password } = useAuth();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/bot/${accountIndex}/stats`, {
        headers: { 'x-password': password }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/bot/${accountIndex}/logs?limit=50`, {
        headers: { 'x-password': password }
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs();
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 5000);
    return () => clearInterval(interval);
  }, [accountIndex, password]);

  const formatCoins = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('en-US').format(Math.floor(amount));
  };

  const formatTime = (ms) => {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="bot-stats">
      <div className="section-header">
        <h1>Statistics</h1>
        <p>Monitor your bot performance</p>
      </div>

      <div className="stats-grid">
        <Card>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(251, 113, 133, 0.1)' }}>💰</div>
            <div className="stat-info">
              <span className="stat-label">Current Purse</span>
              <span className="stat-value">{formatCoins(stats?.currentPurse)} coins</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(134, 239, 172, 0.1)' }}>📈</div>
            <div className="stat-info">
              <span className="stat-label">Total Profit</span>
              <span className="stat-value" style={{ color: stats?.currentProfit > 0 ? 'var(--accent-success)' : 'var(--accent-error)' }}>
                {stats?.currentProfit > 0 ? '+' : ''}{formatCoins(stats?.currentProfit)} coins
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(192, 132, 252, 0.1)' }}>⏱️</div>
            <div className="stat-info">
              <span className="stat-label">Coins/Hour</span>
              <span className="stat-value">{formatCoins(stats?.coinsPerHour)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(96, 165, 250, 0.1)' }}>🕐</div>
            <div className="stat-info">
              <span className="stat-label">Runtime</span>
              <span className="stat-value">{formatTime(stats?.runtime)}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="logs-card">
        <CardHeader>
          <h3>Activity Logs</h3>
        </CardHeader>
        <CardBody>
          <div className="logs-container">
            {logs.length === 0 ? (
              <div className="logs-empty">No activity logs yet</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="log-item">
                  <span className="log-time">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
