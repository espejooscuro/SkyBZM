import { useState } from 'react';
import './BotControl.css';

function BotControl({ bot, updateBot }) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}/start`, { method: 'POST' });
      const data = await res.json();
      updateBot(bot.id, { status: 'running' });
    } catch (err) {
      console.error('Error starting bot:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch(`/api/bots/${bot.id}/stop`, { method: 'POST' });
      const data = await res.json();
      updateBot(bot.id, { status: 'stopped' });
    } catch (err) {
      console.error('Error stopping bot:', err);
    }
  };

  const handlePause = async () => {
    try {
      const res = await fetch(`/api/bots/${bot.id}/pause`, { method: 'POST' });
      const data = await res.json();
      updateBot(bot.id, { status: 'paused' });
    } catch (err) {
      console.error('Error pausing bot:', err);
    }
  };

  const isRunning = bot.status === 'running';
  const isPaused = bot.status === 'paused';

  return (
    <div className="bot-control-card">
      <div className="card-header">
        <div className="card-title">
          <i className="fas fa-gamepad"></i>
          <span>Bot Control</span>
        </div>
        <div className={`bot-status-indicator ${bot.status || 'offline'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {isRunning ? 'Running' : isPaused ? 'Paused' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="control-buttons">
        <button
          className="control-btn start"
          onClick={handleStart}
          disabled={isRunning || isStarting}
        >
          {isStarting ? (
            <>
              <i className="fas fa-spinner fa-spin"></i>
              <span>Starting...</span>
            </>
          ) : (
            <>
              <i className="fas fa-play"></i>
              <span>Start Bot</span>
            </>
          )}
        </button>

        <button
          className="control-btn pause"
          onClick={handlePause}
          disabled={!isRunning}
        >
          <i className="fas fa-pause"></i>
          <span>Pause</span>
        </button>

        <button
          className="control-btn stop"
          onClick={handleStop}
          disabled={!isRunning && !isPaused}
        >
          <i className="fas fa-stop"></i>
          <span>Stop</span>
        </button>
      </div>

      <div className="bot-info-grid">
        <div className="info-item">
          <i className="fas fa-clock"></i>
          <div className="info-content">
            <div className="info-label">Uptime</div>
            <div className="info-value">{bot.uptime || '0h 0m'}</div>
          </div>
        </div>

        <div className="info-item">
          <i className="fas fa-server"></i>
          <div className="info-content">
            <div className="info-label">Server</div>
            <div className="info-value">{bot.server || 'Not connected'}</div>
          </div>
        </div>

        <div className="info-item">
          <i className="fas fa-user"></i>
          <div className="info-content">
            <div className="info-label">Username</div>
            <div className="info-value">{bot.username || 'Not set'}</div>
          </div>
        </div>

        <div className="info-item">
          <i className="fas fa-coins"></i>
          <div className="info-content">
            <div className="info-label">Balance</div>
            <div className="info-value">{bot.balance ? `${bot.balance.toLocaleString()} coins` : '0 coins'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BotControl;
