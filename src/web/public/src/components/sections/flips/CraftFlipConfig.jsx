import { useState } from 'react';

function CraftFlipConfig({ bot, updateBot }) {
  const [enabled, setEnabled] = useState(bot.flips?.craft?.enabled || false);
  const [recipes, setRecipes] = useState(bot.flips?.craft?.recipes || [
    { result: '', ingredients: '', profit: '' }
  ]);
  const [minProfit, setMinProfit] = useState(bot.flips?.craft?.minProfit || 50000);

  const handleToggle = (e) => {
    const newEnabled = e.target.checked;
    setEnabled(newEnabled);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        craft: { ...bot.flips?.craft, enabled: newEnabled }
      }
    });
  };

  const handleAddRecipe = () => {
    setRecipes([...recipes, { result: '', ingredients: '', profit: '' }]);
  };

  const handleRemoveRecipe = (index) => {
    const newRecipes = recipes.filter((_, i) => i !== index);
    setRecipes(newRecipes);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        craft: { ...bot.flips?.craft, recipes: newRecipes }
      }
    });
  };

  const handleRecipeChange = (index, field, value) => {
    const newRecipes = [...recipes];
    newRecipes[index][field] = value;
    setRecipes(newRecipes);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        craft: { ...bot.flips?.craft, recipes: newRecipes }
      }
    });
  };

  const handleMinProfitChange = (e) => {
    const value = e.target.value;
    setMinProfit(value);
    updateBot(bot.id, {
      flips: {
        ...bot.flips,
        craft: { ...bot.flips?.craft, minProfit: value }
      }
    });
  };

  return (
    <div className="flip-config-section fade-in">
      <div className="section-header">
        <h3>
          <i className="fas fa-hammer"></i>
          Craft Flip Settings
        </h3>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={handleToggle} />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {enabled && (
        <div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">
              <i className="fas fa-coins"></i>
              Minimum Profit
            </label>
            <input
              type="number"
              className="form-input"
              placeholder="50000"
              value={minProfit}
              onChange={handleMinProfitChange}
              style={{ maxWidth: '300px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label">
              <i className="fas fa-info-circle"></i>
              Recipe Matrix (Result Item, Ingredients, Expected Profit)
            </label>
          </div>

          <div className="matrix-grid">
            {recipes.map((recipe, index) => (
              <div key={index} className="matrix-row">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Result item (e.g., ASPECT_OF_THE_END)"
                  value={recipe.result}
                  onChange={(e) => handleRecipeChange(index, 'result', e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ingredients (comma separated)"
                  value={recipe.ingredients}
                  onChange={(e) => handleRecipeChange(index, 'ingredients', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Min profit"
                  value={recipe.profit}
                  onChange={(e) => handleRecipeChange(index, 'profit', e.target.value)}
                />
                <button
                  className="remove-btn"
                  onClick={() => handleRemoveRecipe(index)}
                  disabled={recipes.length === 1}
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>

          <button className="add-btn" onClick={handleAddRecipe}>
            <i className="fas fa-plus"></i>
            Add Recipe
          </button>
        </div>
      )}
    </div>
  );
}

export default CraftFlipConfig;
