import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { CardHeader, CardBody } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import './FlipConfig.css';

export function ForgeFlipConfig({ accountIndex, flipIndex, config }) {
  const { password } = useAuth();
  const [localConfig, setLocalConfig] = useState({
    item: '',
    ...config
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setLocalConfig({ 
      item: '',
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
      console.error('Error saving forge flip config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flip-config-container">
      <CardHeader>
        <div className="flip-config-header">
          <div>
            <h3>⚒️ Forge Flip Configuration</h3>
            <p className="flip-config-description">Configure forge flip settings</p>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flip-config-form">
          <Input
            label="Item"
            value={localConfig.item || ''}
            onChange={(e) => handleChange('item', e.target.value)}
            placeholder="Enter item ID to forge"
            helperText="The item to forge and flip"
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
