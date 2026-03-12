import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';
import './Settings.css';

export default function Settings() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <Button
          variant="ghost"
          icon={<ArrowLeft size={20} />}
          onClick={handleBack}
        >
          Back
        </Button>

        <div className="settings-title-section">
          <h1 className="settings-title">
            <span className="text-gradient">Settings</span>
          </h1>
          <p className="settings-subtitle">
            Configure your SkyBZM application
          </p>
        </div>
      </div>

      <div className="settings-content">
        <Card className="settings-info-card glass">
          <CardHeader>
            <div className="settings-card-header">
              <FileText size={24} />
              <CardTitle>Configuration File</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="settings-info">
              <p className="info-text">
                SkyBZM is configured through the <code>config.json</code> file located in the root directory.
              </p>
              
              <div className="info-section">
                <h4>To modify bot settings:</h4>
                <ol className="info-list">
                  <li>Stop all running bots</li>
                  <li>Open <code>config.json</code> in a text editor</li>
                  <li>Edit the bot configurations as needed</li>
                  <li>Save the file</li>
                  <li>Restart the application</li>
                </ol>
              </div>

              <div className="info-section">
                <h4>Configuration Options:</h4>
                <ul className="config-options">
                  <li>
                    <strong>username:</strong> Minecraft username for the bot
                  </li>
                  <li>
                    <strong>proxy:</strong> SOCKS5 proxy configuration (optional)
                  </li>
                  <li>
                    <strong>discordWebhook:</strong> Discord webhook URL for notifications
                  </li>
                  <li>
                    <strong>maxBuyPrice:</strong> Maximum price to buy items
                  </li>
                  <li>
                    <strong>minProfit:</strong> Minimum profit required per flip
                  </li>
                  <li>
                    <strong>maxFlips:</strong> Maximum concurrent flips
                  </li>
                  <li>
                    <strong>whitelist:</strong> Array of item tags to prioritize
                  </li>
                  <li>
                    <strong>blacklistContaining:</strong> Array of keywords to avoid
                  </li>
                  <li>
                    <strong>autoStart:</strong> Start bot automatically on launch
                  </li>
                </ul>
              </div>

              <div className="info-section">
                <h4>Flip Types Configuration:</h4>
                <p className="info-text">
                  Each bot can have multiple flip configurations. Currently supported types:
                </p>
                <ul className="config-options">
                  <li>
                    <strong>SELL_ORDER:</strong> Standard bazaar flipping
                  </li>
                  <li>
                    <strong>NPC:</strong> Buy from bazaar and sell to NPC
                  </li>
                  <li>
                    <strong>KAT:</strong> Kat upgrade flips (coming soon)
                  </li>
                  <li>
                    <strong>FORGE:</strong> Forge item flips (coming soon)
                  </li>
                  <li>
                    <strong>CRAFT:</strong> Crafting recipe flips (coming soon)
                  </li>
                </ul>
              </div>

              <div className="warning-box">
                <h4>⚠️ Important Notes:</h4>
                <ul>
                  <li>Always backup <code>config.json</code> before making changes</li>
                  <li>Invalid JSON formatting will prevent the bot from starting</li>
                  <li>Changes require an application restart to take effect</li>
                  <li>Use a JSON validator to check your configuration</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="settings-actions-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="quick-actions">
              <Button
                variant="outline"
                size="lg"
                icon={<FileText size={20} />}
                onClick={() => alert('Open config.json in your preferred text editor')}
              >
                Edit Configuration File
              </Button>
              
              <div className="action-note">
                <p>
                  For advanced configuration and detailed documentation, please refer to the 
                  <a href="https://github.com/espejooscuro/SkyBZM" target="_blank" rel="noopener noreferrer">
                    {' '}GitHub repository
                  </a>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
