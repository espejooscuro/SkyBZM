import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, RotateCw, TrendingUp, Activity, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { StatusBadge } from './StatusBadge';
import { useBotControl } from '../utils/hooks';
import './BotCard.css';

export function BotCard({ bot }) {
  const navigate = useNavigate();
  const { startBot, stopBot, restartBot, loading } = useBotControl(bot.username);
  const [actionLoading, setActionLoading] = useState('');

  const handleStart = async (e) => {
    e.stopPropagation();
    setActionLoading('start');
    try {
      await startBot();
    } catch (error) {
      console.error('Error starting bot:', error);
    }
    setActionLoading('');
  };

  const handleStop = async (e) => {
    e.stopPropagation();
    setActionLoading('stop');
    try {
      await stopBot();
    } catch (error) {
      console.error('Error stopping bot:', error);
    }
    setActionLoading('');
  };

  const handleRestart = async (e) => {
    e.stopPropagation();
    setActionLoading('restart');
    try {
      await restartBot();
    } catch (error) {
      console.error('Error restarting bot:', error);
    }
    setActionLoading('');
  };

  const handleCardClick = () => {
    navigate(`/bot/${bot.username}`);
  };

  const isConnected = bot.state === 'connected';

  return (
    <Card className="bot-card" hover onClick={handleCardClick}>
      <CardHeader>
        <div className="bot-card-header-content">
          <CardTitle>{bot.username}</CardTitle>
          <StatusBadge status={bot.state} />
        </div>
      </CardHeader>

      <CardContent>
        <div className="bot-stats-grid">
          <div className="bot-stat">
            <div className="bot-stat-icon">
              <Activity size={18} />
            </div>
            <div className="bot-stat-content">
              <span className="bot-stat-label">Active Flips</span>
              <span className="bot-stat-value">{bot.health?.activeFlips || 0}</span>
            </div>
          </div>

          <div className="bot-stat">
            <div className="bot-stat-icon">
              <TrendingUp size={18} />
            </div>
            <div className="bot-stat-content">
              <span className="bot-stat-label">Total Profit</span>
              <span className="bot-stat-value">Coming Soon</span>
            </div>
          </div>

          <div className="bot-stat">
            <div className="bot-stat-icon">
              <Wallet size={18} />
            </div>
            <div className="bot-stat-content">
              <span className="bot-stat-label">Purse</span>
              <span className="bot-stat-value">Coming Soon</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <div className="bot-actions">
          {!isConnected ? (
            <Button
              variant="success"
              size="sm"
              icon={<Play size={16} />}
              onClick={handleStart}
              loading={actionLoading === 'start'}
              disabled={loading}
            >
              Start
            </Button>
          ) : (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={<Square size={16} />}
                onClick={handleStop}
                loading={actionLoading === 'stop'}
                disabled={loading}
              >
                Stop
              </Button>
              <Button
                variant="warning"
                size="sm"
                icon={<RotateCw size={16} />}
                onClick={handleRestart}
                loading={actionLoading === 'restart'}
                disabled={loading}
              >
                Restart
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
