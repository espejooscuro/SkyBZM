import { useState } from 'react';
import './FlipsConfig.css';
import NPCFlipConfig from './flips/NPCFlipConfig';
import KatFlipConfig from './flips/KatFlipConfig';
import CraftFlipConfig from './flips/CraftFlipConfig';
import ForgeFlipConfig from './flips/ForgeFlipConfig';

function FlipsConfig({ bot, updateBot }) {
  const [activeFlipType, setActiveFlipType] = useState('npc');

  const flipTypes = [
    { id: 'npc', label: 'NPC Flips', icon: 'store', color: 'purple' },
    { id: 'kat', label: 'Kat Flips', icon: 'cat', color: 'pink' },
    { id: 'craft', label: 'Craft Flips', icon: 'hammer', color: 'blue' },
    { id: 'forge', label: 'Forge Flips', icon: 'fire', color: 'orange' },
  ];

  return (
    <div className="flips-config-card">
      <div className="card-header">
        <div className="card-title">
          <i className="fas fa-sync-alt"></i>
          <span>Flip Configuration</span>
        </div>
      </div>

      <div className="flip-type-selector">
        {flipTypes.map(type => (
          <button
            key={type.id}
            className={`flip-type-btn ${type.color} ${activeFlipType === type.id ? 'active' : ''}`}
            onClick={() => setActiveFlipType(type.id)}
          >
            <i className={`fas fa-${type.icon}`}></i>
            <span>{type.label}</span>
          </button>
        ))}
      </div>

      <div className="flip-config-content">
        {activeFlipType === 'npc' && <NPCFlipConfig bot={bot} updateBot={updateBot} />}
        {activeFlipType === 'kat' && <KatFlipConfig bot={bot} updateBot={updateBot} />}
        {activeFlipType === 'craft' && <CraftFlipConfig bot={bot} updateBot={updateBot} />}
        {activeFlipType === 'forge' && <ForgeFlipConfig bot={bot} updateBot={updateBot} />}
      </div>
    </div>
  );
}

export default FlipsConfig;
