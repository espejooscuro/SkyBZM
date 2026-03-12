import { useState, useEffect } from 'react';
import './styles/globals.css';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';

function App() {
  const [bots, setBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load bots from server
  useEffect(() => {
    fetch('/api/bots')
      .then(res => res.json())
      .then(data => {
        const botsData = data.bots || [];
        setBots(botsData);
        if (botsData.length > 0) {
          setSelectedBot(botsData[0].id);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading bots:', err);
        setLoading(false);
      });
  }, []);

  const handleAddBot = () => {
    const name = prompt('Enter bot name:');
    if (name) {
      fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
        .then(res => res.json())
        .then(data => {
          setBots([...bots, data.bot]);
          setSelectedBot(data.bot.id);
        })
        .catch(err => console.error('Error adding bot:', err));
    }
  };

  const updateBot = (botId, updates) => {
    setBots(bots.map(b => 
      b.id === botId ? { ...b, ...updates } : b
    ));
  };

  const currentBot = bots.find(b => b.id === selectedBot);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '6px solid rgba(255, 255, 255, 0.3)',
          borderTop: '6px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'white', fontSize: '18px', fontWeight: '600' }}>Loading Dashboard...</p>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '30px',
        padding: '20px'
      }} className="fade-in">
        <div style={{ 
          fontSize: '80px',
          background: 'linear-gradient(135deg, var(--pastel-purple), var(--pastel-pink))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          <i className="fas fa-robot"></i>
        </div>
        <h2 style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: 'white',
          textAlign: 'center'
        }}>
          No Bots Found
        </h2>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          fontSize: '16px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          Get started by adding your first bot to begin flipping on Hypixel Skyblock
        </p>
        <button
          onClick={handleAddBot}
          style={{
            padding: '15px 30px',
            background: 'linear-gradient(135deg, var(--pastel-purple), var(--pastel-pink))',
            border: 'none',
            borderRadius: '15px',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 30px rgba(184, 164, 255, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = '0 15px 40px rgba(184, 164, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 10px 30px rgba(184, 164, 255, 0.4)';
          }}
        >
          <i className="fas fa-plus"></i> Add Your First Bot
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      gap: '20px',
      padding: '20px'
    }}>
      <Sidebar
        bots={bots}
        selectedBot={selectedBot}
        onSelectBot={setSelectedBot}
        onAddBot={handleAddBot}
      />
      <Dashboard
        bot={currentBot}
        updateBot={updateBot}
      />
    </div>
  );
}

export default App;
