import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Input, Switch } from '../ui/Input';
import { Button } from '../ui/Button';
import './GeneralConfig.css';

export function GeneralConfig({ accountIndex }) {
  const { password, config, setConfig } = useAuth();
  const [localConfig, setLocalConfig] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config?.accounts?.[accountIndex]) {
      setLocalConfig(config.accounts[accountIndex]);
    }
  }, [config, accountIndex]);

  const handleChange = (field, value) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
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
        body: JSON.stringify(localConfig)
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
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="general-config">
      <div className="section-header">
        <h1>General Configuration</h1>
        <p>Configure basic bot settings</p>
      </div>

      <div className="config-grid">
        <Card>
          <CardHeader>
            <h3>Account Settings</h3>
          </CardHeader>
          <CardBody>
            <div className="config-form">
              <Input
                label="Username"
                value={localConfig.username || ''}
                disabled
                fullWidth
              />

              <Input
                label="Sell Timeout (minutes)"
                type="number"
                value={Math.floor((localConfig.sellTimeout || 0) / 60000)}
                onChange={(e) => handleChange('sellTimeout', Number(e.target.value) * 60000)}
                helperText="Time to wait before cancelling a sell order"
                fullWidth
              />

              <Input
                label="Purse"
                type="number"
                value={localConfig.purse || 0}
                onChange={(e) => handleChange('purse', Number(e.target.value))}
                helperText="Starting purse amount"
                fullWidth
              />

              <Switch
                label="Auto Cookie"
                checked={localConfig.autoCookie || false}
                onChange={(e) => handleChange('autoCookie', e.target.checked)}
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
                Save Configuration
              </Button>

              {saveSuccess && (
                <div className="save-success">
                  ✅ Configuration saved successfully!
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
