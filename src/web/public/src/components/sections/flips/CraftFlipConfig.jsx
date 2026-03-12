import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { CardHeader, CardBody } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import './FlipConfig.css';

export function CraftFlipConfig({ accountIndex, flipIndex, config }) {
  const { password } = useAuth();
  const [craftGrid, setCraftGrid] = useState(
    Array(9).fill(null).map(() => ({ item: '', amount: 1 }))
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (config.craftGrid) {
      setCraftGrid(config.craftGrid);
    }
  }, [config]);

  const handleCellChange = (index, field, value) => {
    const newGrid = [...craftGrid];
    newGrid[index] = { ...newGrid[index], [field]: value };
    setCraftGrid(newGrid);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      await fetch(`/api/account/${accountIndex}/flips/${flipIndex}/config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-password': password
        },
        body: JSON.stringify({ key: 'craftGrid', value: craftGrid })
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving craft flip config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    setCraftGrid(Array(9).fill(null).map(() => ({ item: '', amount: 1 })));
  };

  return (
    <div className="flip-config-container">
      <CardHeader>
        <div className="flip-config-header">
          <div>
            <h3>🔨 Craft Flip Configuration</h3>
            <p className="flip-config-description">Configure crafting grid (like Minecraft)</p>
          </div>
        </div>
      </CardHeader>

      <CardBody>
        <div className="flip-config-form">
          <div className="craft-grid-container">
            <div className="craft-grid">
              {craftGrid.map((cell, index) => (
                <div key={index} className="craft-cell">
                  <div className="craft-cell-header">
                    <span className="craft-cell-label">Slot {index + 1}</span>
                  </div>
                  <Input
                    placeholder="Item ID"
                    value={cell.item || ''}
                    onChange={(e) => handleCellChange(index, 'item', e.target.value)}
                    fullWidth
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    min="1"
                    max="64"
                    value={cell.amount || 1}
                    onChange={(e) => handleCellChange(index, 'amount', Math.min(64, Math.max(1, Number(e.target.value))))}
                    fullWidth
                  />
                </div>
              ))}
            </div>

            <div className="craft-grid-preview">
              <h4>Preview</h4>
              <div className="craft-preview-grid">
                {craftGrid.map((cell, index) => (
                  <div key={index} className="craft-preview-cell">
                    {cell.item ? (
                      <>
                        <div className="craft-preview-item">{cell.item.slice(0, 10)}</div>
                        <div className="craft-preview-amount">×{cell.amount}</div>
                      </>
                    ) : (
                      <div className="craft-preview-empty">-</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flip-config-actions">
            <Button
              variant="secondary"
              size="md"
              onClick={handleClear}
              icon="🗑️"
            >
              Clear Grid
            </Button>

            <Button
              variant="primary"
              size="lg"
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
