import { useState } from 'react';

function KatFlipConfig({ bot, updateBot }) {
  const [enabled, setEnabled] = useState(bot.flips?.kat?.enabled || false);
  const [selectedPets, setSelectedPets] = useState(bot.flips?.kat?.pets || []);
  const [minProfit, setMinProfit] = useState(bot.flips?.kat?.minProfit || 100000);
  const [maxUpgradeTime, setMaxUpgradeTime] = useState(bot.flips?.kat?.maxUpgradeTime || 24);

  const availablePets = [
    'ENDERMAN', 'SPIDER', 'WOLF', 'BAT', 'BLAZE', 'CHICKEN',
    'HORSE', 'JERRY', 'OCELOT', 'PIG', 'RABBIT', 'SHEEP',
    'SILVERFISH', 'WITHER_SKELETON', 'SKELETON', 'ZOMBIE',
    'ENDER_DRAGON', 'PHOENIX', 'GRIFFIN', 'LEGENDARY_PARROT'
  ];

  const handleToggle = (e) => {
    const newEnabled = e.target.checked;
    setEnabled(newEnabled);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        kat: { ...bot.flips?.kat, enabled: newEnabled }
      }
    });
  };

  const handlePetToggle = (pet) => {
    const newPets = selectedPets.includes(pet)
      ? selectedPets.filter(p => p !== pet)
      : [...selectedPets, pet];
    
    setSelectedPets(newPets);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        kat: { ...bot.flips?.kat, pets: newPets }
      }
    });
  };

  const handleMinProfitChange = (e) => {
    const value = e.target.value;
    setMinProfit(value);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        kat: { ...bot.flips?.kat, minProfit: value }
      }
    });
  };

  const handleMaxUpgradeTimeChange = (e) => {
    const value = e.target.value;
    setMaxUpgradeTime(value);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        kat: { ...bot.flips?.kat, maxUpgradeTime: value }
      }
    });
  };

  return (
    <div className="flip-config-section fade-in">
      <div className="section-header">
        <h3>
          <i className="fas fa-cat"></i>
          Kat Flip Settings
        </h3>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={handleToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {enabled && (
        <div>
          <div className="form-grid" style={{ marginBottom: '25px' }}>
            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-coins"></i>
                Minimum Profit
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="100000"
                value={minProfit}
                onChange={handleMinProfitChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fas fa-clock"></i>
                Max Upgrade Time (hours)
              </label>
              <input
                type="number"
                className="form-input"
                placeholder="24"
                value={maxUpgradeTime}
                onChange={handleMaxUpgradeTimeChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-paw"></i>
              Select Pets to Flip
            </label>
            <div className="checkbox-group">
              {availablePets.map(pet => (
                <label key={pet} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={selectedPets.includes(pet)}
                    onChange={() => handlePetToggle(pet)}
                  />
                  <span className="checkbox-label">{pet.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default KatFlipConfig;
