import { useState } from 'react';
import './Dashboard.css';
import BotControl from '../components/sections/BotControl';
import BotStats from '../components/sections/BotStats';
import GeneralConfig from '../components/sections/GeneralConfig';
import ProxyConfig from '../components/sections/ProxyConfig';
import FlipsConfig from '../components/sections/FlipsConfig';

function Dashboard({ bot, updateBot }) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'chart-line' },
    { id: 'general', label: 'General', icon: 'cog' },
    { id: 'proxy', label: 'Proxy', icon: 'network-wired' },
    { id: 'flips', label: 'Flips', icon: 'sync-alt' },
  ];

  return (
    <div className="dashboard slide-in-right">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>
            <i className="fas fa-robot"></i>
            {bot.name || `Bot ${bot.id}`}
          </h1>
          <div className="dashboard-subtitle">
            Manage your bot configuration and monitor performance
          </div>
        </div>

        <div className="dashboard-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fas fa-${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="tab-content fade-in">
            <BotControl bot={bot} updateBot={updateBot} />
            <BotStats bot={bot} />
          </div>
        )}

        {activeTab === 'general' && (
          <div className="tab-content fade-in">
            <GeneralConfig bot={bot} updateBot={updateBot} />
          </div>
        )}

        {activeTab === 'proxy' && (
          <div className="tab-content fade-in">
            <ProxyConfig bot={bot} updateBot={updateBot} />
          </div>
        )}

        {activeTab === 'flips' && (
          <div className="tab-content fade-in">
            <FlipsConfig bot={bot} updateBot={updateBot} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
