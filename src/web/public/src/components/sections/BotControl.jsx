import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import './BotControl.css';

export function BotControl({ accountIndex }) {
  const { password, config } = useAuth();
  const [status, setStatus] = useState({ connected: false, exists: false });
  const [loading, setLoading] = useState({ start: false, stop: false, restart: false });

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/bot/${accountIndex}/status`, {
        headers: { 'x-password': password }
      });
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [accountIndex, password]);

  const handleAction = async (action) => {
    setLoading(prev => ({ ...prev, [action]: true }));
    try {
      await fetch(`/api/bot/${accountIndex}/${action}`, {
        method: 'POST',
        headers: { 'x-password': password }
      });
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      console.error(`Error ${action} bot:`, err);
    } finally {
      setLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  const account = config?.accounts?.[accountIndex];

  return (
    <div className="bot-control">
      <div className="section-header">
        <h1>Bot Control</h1>
        <p>Manage your bot instance</p>
      </div>

      <div className="control-grid">
        <Card>
          <CardHeader>
            <div className="card-title-section">
              <h3>Account Information</h3>
              <span className={`status-badge ${status.connected ? 'status-online' : 'status-offline'}`}>
                {status.connected ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Username</span>
                <span className="info-value">{account?.username || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status</span>
                <span className="info-value">{status.connected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3>Actions</h3>
          </CardHeader>
          <CardBody>
            <div className="action-buttons">
              <Button
                variant="success"
                fullWidth
                loading={loading.start}
                disabled={status.connected}
                onClick={() => handleAction('start')}
                icon="▶️"
              >
                Start Bot
              </Button>

              <Button
                variant="danger"
                fullWidth
                loading={loading.stop}
                disabled={!status.connected}
                onClick={() => handleAction('stop')}
                icon="⏹️"
              >
                Stop Bot
              </Button>

              <Button
                variant="warning"
                fullWidth
                loading={loading.restart}
                onClick={() => handleAction('restart')}
                icon="🔄"
              >
                Restart Bot
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
