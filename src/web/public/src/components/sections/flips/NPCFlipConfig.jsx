import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { CardHeader, CardBody } from '../../ui/Card';
import { Input, Switch } from '../../ui/Input';
import { Button } from '../../ui/Button';
import './FlipConfig.css';

export function NPCFlipConfig({ accountIndex, flipIndex, config }) {
  const { password } = useAuth();
  const [localConfig, setLocalConfig] = useState({
    minSpread: 0,
    item: '',
    forceSellAfter: 5,
    ...config
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setLocalConfig({ 
      minSpread: 0,
      item: '',
      forceSellAfter: 5,
      ...config 
    });
  }, [config]);

  const handleChange = (field, value) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      // Save each field
      for (const [key, value] of Object.entries(localConfig)) {
        await fetch(`/api/account/${accountIndex}/flips/${flipIndex}/config`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-password': password
          },
          body: JSON.stringify({ key, value })
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving NPC flip config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flip-config-container">
      <CardHeader>
        <div className="flip-config-header">
          <div>
            <h3>🏪 NPC Flip Configuration</h3>
            <p className="flip-config-description">Configure NPC flip settings</p>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flip-config-form">
          <Input
            label="Item"
            value={localConfig.item || ''}
            onChange={(e) => handleChange('item', e.target.value)}
            placeholder="Enter item ID"
            helperText="The item ID to flip with NPC"
            fullWidth
          />

          <Input
            label="Min Spread"
            type="number"
            value={localConfig.minSpread || 0}
            onChange={(e) => handleChange('minSpread', Number(e.target.value))}
            helperText="Minimum spread required for the flip"
            fullWidth
          />

          <Input
            label="Force Sell After (minutes)"
            type="number"
            value={localConfig.forceSellAfter || 5}
            onChange={(e) => handleChange('forceSellAfter', Number(e.target.value))}
            helperText="Force sell after this many minutes"
            fullWidth
          />

          <div className="flip-config-actions">
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
              <div className="save-success-message">
                ✅ Configuration saved successfully!
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </div>
  );
}
