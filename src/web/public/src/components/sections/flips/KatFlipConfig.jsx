import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { CardHeader, CardBody } from '../../ui/Card';
import { Input, Switch } from '../../ui/Input';
import { Button } from '../../ui/Button';
import './FlipConfig.css';

export function KatFlipConfig({ accountIndex, flipIndex, config }) {
  const { password } = useAuth();
  const [localConfig, setLocalConfig] = useState({
    useKatFlower: false,
    pet: '',
    ...config
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setLocalConfig({ 
      useKatFlower: false,
      pet: '',
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
      console.error('Error saving Kat flip config:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flip-config-container">
      <CardHeader>
        <div className="flip-config-header">
          <div>
            <h3>🐱 Kat Flip Configuration</h3>
            <p className="flip-config-description">Configure Kat flip settings</p>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flip-config-form">
          <Input
            label="Pet"
            value={localConfig.pet || ''}
            onChange={(e) => handleChange('pet', e.target.value)}
            placeholder="Enter pet ID"
            helperText="The pet to use for Kat flip"
            fullWidth
          />

          <Switch
            label="Use Kat Flower"
            checked={localConfig.useKatFlower || false}
            onChange={(e) => handleChange('useKatFlower', e.target.checked)}
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
