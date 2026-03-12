import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { NPCFlipConfig } from './flips/NPCFlipConfig';
import { KatFlipConfig } from './flips/KatFlipConfig';
import { CraftFlipConfig } from './flips/CraftFlipConfig';
import { ForgeFlipConfig } from './flips/ForgeFlipConfig';
import './FlipsConfig.css';

const FLIP_TYPES = [
  { id: 'npc', label: 'NPC Flip', icon: '🏪', component: NPCFlipConfig },
  { id: 'kat', label: 'Kat Flip', icon: '🐱', component: KatFlipConfig },
  { id: 'craft', label: 'Craft Flip', icon: '🔨', component: CraftFlipConfig },
  { id: 'forge', label: 'Forge Flip', icon: '⚒️', component: ForgeFlipConfig },
];

export function FlipsConfig({ accountIndex }) {
  const { password, config, setConfig } = useAuth();
  const [flips, setFlips] = useState([]);
  const [selectedFlip, setSelectedFlip] = useState(null);

  useEffect(() => {
    if (config?.accounts?.[accountIndex]?.flipConfigs) {
      setFlips(config.accounts[accountIndex].flipConfigs);
      if (config.accounts[accountIndex].flipConfigs.length > 0) {
        setSelectedFlip(0);
      }
    }
  }, [config, accountIndex]);

  const handleAddFlip = async (type) => {
    try {
      const response = await fetch(`/api/account/${accountIndex}/flips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-password': password
        },
        body: JSON.stringify({ type })
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          accounts: prev.accounts.map((acc, idx) =>
            idx === accountIndex ? data.account : acc
          )
        }));
        setSelectedFlip(data.account.flipConfigs.length - 1);
      }
    } catch (err) {
      console.error('Error adding flip:', err);
    }
  };

  const handleDeleteFlip = async (flipIndex) => {
    if (!confirm('Are you sure you want to delete this flip configuration?')) return;

    try {
      const response = await fetch(`/api/account/${accountIndex}/flips/${flipIndex}`, {
        method: 'DELETE',
        headers: { 'x-password': password }
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          accounts: prev.accounts.map((acc, idx) =>
            idx === accountIndex ? data.account : acc
          )
        }));
        setSelectedFlip(null);
      }
    } catch (err) {
      console.error('Error deleting flip:', err);
    }
  };

  const handleToggleFlip = async (flipIndex, enabled) => {
    try {
      const response = await fetch(`/api/account/${accountIndex}/flips/${flipIndex}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-password': password
        },
        body: JSON.stringify({ enabled })
      });

      if (response.ok) {
        const data = await response.json();
        setConfig(prev => ({
          ...prev,
          accounts: prev.accounts.map((acc, idx) =>
            idx === accountIndex ? data.account : acc
          )
        }));
      }
    } catch (err) {
      console.error('Error toggling flip:', err);
    }
  };

  const renderFlipConfig = () => {
    if (selectedFlip === null || !flips[selectedFlip]) {
      return (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <h3>No Flip Selected</h3>
          <p>Select a flip configuration from the list or create a new one</p>
        </div>
      );
    }

    const flip = flips[selectedFlip];
    const flipType = FLIP_TYPES.find(t => t.id === flip.type);
    const FlipComponent = flipType?.component;

    if (!FlipComponent) {
      return <div>Unknown flip type: {flip.type}</div>;
    }

    return (
      <FlipComponent
        accountIndex={accountIndex}
        flipIndex={selectedFlip}
        config={flip.config || {}}
      />
    );
  };

  return (
    <div className="flips-config">
      <div className="section-header">
        <h1>Flips Configuration</h1>
        <p>Manage your flip strategies</p>
      </div>

      <div className="flips-layout">
        <aside className="flips-sidebar">
          <div className="flips-sidebar-header">
            <h3>Flip Configurations</h3>
            <div className="add-flip-dropdown">
              <Button variant="primary" size="sm" icon="➕">
                Add Flip
              </Button>
              <div className="dropdown-menu">
                {FLIP_TYPES.map(type => (
                  <button
                    key={type.id}
                    className="dropdown-item"
                    onClick={() => handleAddFlip(type.id)}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flips-list">
            {flips.length === 0 ? (
              <div className="flips-list-empty">
                No flips configured yet
              </div>
            ) : (
              flips.map((flip, idx) => {
                const flipType = FLIP_TYPES.find(t => t.id === flip.type);
                return (
                  <div
                    key={idx}
                    className={`flip-item ${selectedFlip === idx ? 'flip-item-active' : ''}`}
                    onClick={() => setSelectedFlip(idx)}
                  >
                    <div className="flip-item-header">
                      <span className="flip-item-icon">{flipType?.icon || '💰'}</span>
                      <span className="flip-item-name">{flip.name || flipType?.label}</span>
                      <button
                        className="flip-item-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFlip(idx, !flip.enabled);
                        }}
                      >
                        {flip.enabled ? '🟢' : '🔴'}
                      </button>
                    </div>
                    {selectedFlip === idx && (
                      <button
                        className="flip-item-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFlip(idx);
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="flips-main">
          <Card padding={false} className="flips-card">
            {renderFlipConfig()}
          </Card>
        </main>
      </div>
    </div>
  );
}
