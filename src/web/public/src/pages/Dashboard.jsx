import { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { GeneralConfig } from '../components/sections/GeneralConfig';
import { ProxyConfig } from '../components/sections/ProxyConfig';
import { FlipsConfig } from '../components/sections/FlipsConfig';
import { BotControl } from '../components/sections/BotControl';
import { BotStats } from '../components/sections/BotStats';
import './Dashboard.css';

export function Dashboard() {
  const [activeSection, setActiveSection] = useState('control');
  const [accountIndex, setAccountIndex] = useState(0);

  const renderSection = () => {
    switch (activeSection) {
      case 'control':
        return <BotControl accountIndex={accountIndex} />;
      case 'stats':
        return <BotStats accountIndex={accountIndex} />;
      case 'general':
        return <GeneralConfig accountIndex={accountIndex} />;
      case 'proxy':
        return <ProxyConfig accountIndex={accountIndex} />;
      case 'flips':
        return <FlipsConfig accountIndex={accountIndex} />;
      default:
        return <BotControl accountIndex={accountIndex} />;
    }
  };

  return (
    <div className="dashboard">
      <Sidebar 
        activeSection={activeSection} 
        setActiveSection={setActiveSection}
      />
      <div className="dashboard-main">
        <Header 
          accountIndex={accountIndex} 
          setAccountIndex={setAccountIndex}
        />
        <main className="dashboard-content">
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
