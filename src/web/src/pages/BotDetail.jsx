import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Square, RotateCw, Activity, TrendingUp, Wallet, Clock } from 'lucide-react';
import { useBot, useBotActivity, useBotProfits, useBotControl } from '../utils/hooks';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { StatCard } from '../components/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import './BotDetail.css';

export default function BotDetail() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { bot, loading: botLoading } = useBot(username);
  const { logs, loading: logsLoading } = useBotActivity(username);
  const { profits, loading: profitsLoading } = useBotProfits(username);
  const { startBot, stopBot, restartBot, loading: controlLoading } = useBotControl(username);

  const handleBack = () => {
    navigate('/');
  };

  const isConnected = bot?.state === 'connected';

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const formatProfit = (value) => {
    if (!value) return '0';
    return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
  };

  if (botLoading) {
    return (
      <div className="bot-detail">
        <div className="loading-container">
          <div className="spinner animate-spin"></div>
          <p>Loading bot information...</p>
        </div>
      </div>
    );
  }

  if (!bot || !bot.exists) {
    return (
      <div className="bot-detail">
        <div className="error-container">
          <h2>Bot Not Found</h2>
          <p>The bot "{username}" does not exist.</p>
          <Button variant="primary" onClick={handleBack}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bot-detail">
      {/* Header */}
      <div className="bot-detail-header">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={20} />}
          onClick={handleBack}
        >
          Back
        </Button>

        <div className="bot-detail-title-section">
          <h1 className="bot-detail-title">
            <span className="text-gradient">{username}</span>
          </h1>
          <StatusBadge status={bot.state} />
        </div>

        <div className="bot-detail-actions">
          {!isConnected ? (
            <Button
              variant="success"
              icon={<Play size={18} />}
              onClick={startBot}
              loading={controlLoading}
            >
              Start Bot
            </Button>
          ) : (
            <>
              <Button
                variant="danger"
                icon={<Square size={18} />}
                onClick={stopBot}
                loading={controlLoading}
              >
                Stop
              </Button>
              <Button
                variant="warning"
                icon={<RotateCw size={18} />}
                onClick={restartBot}
                loading={controlLoading}
              >
                Restart
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          title="Active Flips"
          value={bot.health?.activeFlips || 0}
          icon={<Activity size={24} />}
          color="primary"
        />
        <StatCard
          title="Total Profit"
          value="Coming Soon"
          icon={<TrendingUp size={24} />}
          color="success"
        />
        <StatCard
          title="Purse Balance"
          value="Coming Soon"
          icon={<Wallet size={24} />}
          color="warning"
        />
        <StatCard
          title="Uptime"
          value="Coming Soon"
          icon={<Clock size={24} />}
          color="info"
        />
      </div>

      {/* Activity & Profits */}
      <div className="bot-detail-content">
        {/* Activity Logs */}
        <Card className="activity-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="activity-loading">
                <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
                <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
                <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="activity-empty">
                <Activity size={48} className="empty-icon" />
                <p>No activity yet</p>
              </div>
            ) : (
              <div className="activity-list">
                {logs.map((log, index) => (
                  <div key={index} className="activity-item animate-fade-in">
                    <div className="activity-time">{formatTime(log.timestamp)}</div>
                    <div className="activity-message">{log.message}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profit History */}
        <Card className="profits-card">
          <CardHeader>
            <CardTitle>Profit History</CardTitle>
          </CardHeader>
          <CardContent>
            {profitsLoading ? (
              <div className="profits-loading">
                <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
                <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
                <div className="shimmer" style={{ width: '100%', height: '40px', borderRadius: '8px' }}></div>
              </div>
            ) : profits.length === 0 ? (
              <div className="profits-empty">
                <TrendingUp size={48} className="empty-icon" />
                <p>No profits recorded yet</p>
              </div>
            ) : (
              <div className="profits-list">
                {profits.map((profit, index) => (
                  <div key={index} className="profit-item animate-fade-in">
                    <div className="profit-item-header">
                      <span className="profit-item-name">{profit.item || profit.itemTag}</span>
                      <span className={`profit-value ${profit.profit > 0 ? 'positive' : 'negative'}`}>
                        {formatProfit(profit.profit)} coins
                      </span>
                    </div>
                    <div className="profit-item-time">{formatTime(profit.timestamp)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
