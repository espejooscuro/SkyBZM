import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Input, Switch } from '../ui/Input';
import { Button } from '../ui/Button';
import './ProxyConfig.css';

export function ProxyConfig({ accountIndex }) {
  const { password, config, setConfig } = useAuth();
  const [proxy, setProxy] = useState({
    enabled: false,
    host: '',
    port: '',
    username: '',
    password: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config?.accounts?.[accountIndex]?.proxy) {
      setProxy(config.accounts[accountIndex].proxy);
    }
  }, [config, accountIndex]);

  const handleChange = (field, value) => {
    setProxy(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch(`/api/account/${accountIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-password': password
        },
        body: JSON.stringify({ proxy })
      });

      if (response.ok) {
        const updatedAccount = await response.json();
        const newConfig = { ...config };
        newConfig.accounts[accountIndex] = updatedAccount;
        setConfig(newConfig);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving proxy:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="proxy-config">
      <div className="section-header">
        <h1>Proxy Configuration</h1>
        <p>Configure connection proxy settings</p>
      </div>

      <div className="config-grid">
        <Card>
          <CardHeader>
            <h3>Proxy Settings</h3>
          </CardHeader>
          <CardBody>
            <div className="config-form">
              <Switch
                label="Enable Proxy"
                checked={proxy.enabled || false}
                onChange={(e) => handleChange('enabled', e.target.checked)}
              />

              <div className="proxy-row">
                <Input
                  label="Host"
                  value={proxy.host || ''}
                  onChange={(e) => handleChange('host', e.target.value)}
                  placeholder="127.0.0.1"
                  disabled={!proxy.enabled}
                  fullWidth
                />

                <Input
                  label="Port"
                  type="number"
                  value={proxy.port || ''}
                  onChange={(e) => handleChange('port', e.target.value)}
                  placeholder="8080"
                  disabled={!proxy.enabled}
                  fullWidth
                />
              </div>

              <div className="proxy-divider">
                <span>Authentication (Optional)</span>
              </div>

              <Input
                label="Username"
                value={proxy.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="proxy_username"
                disabled={!proxy.enabled}
                fullWidth
              />

              <Input
                label="Password"
                type="password"
                value={proxy.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="proxy_password"
                disabled={!proxy.enabled}
                fullWidth
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3>Save Changes</h3>
          </CardHeader>
          <CardBody>
            <div className="save-section">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                loading={saving}
                onClick={handleSave}
                icon="💾"
              >
                Save Proxy
              </Button>

              {saveSuccess && (
                <div className="save-success">
                  ✅ Proxy configuration saved!
                </div>
              )}

              <div className="proxy-info">
                <p><strong>Note:</strong> Restart the bot to apply proxy changes.</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
