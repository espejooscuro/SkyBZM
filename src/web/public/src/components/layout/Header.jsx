import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import './Header.css';

export function Header({ accountIndex, setAccountIndex }) {
  const { config, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const accountOptions = config?.accounts?.map((acc, idx) => ({
    value: idx,
    label: acc.username || `Account ${idx + 1}`
  })) || [];

  return (
    <header className="header">
      <div className="header-left">
        {config?.accounts && config.accounts.length > 1 && (
          <Select
            value={accountIndex}
            onChange={(e) => setAccountIndex(Number(e.target.value))}
            options={accountOptions}
          />
        )}
      </div>

      <div className="header-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          icon={theme === 'light' ? '🌙' : '☀️'}
        >
          {theme === 'light' ? 'Dark' : 'Light'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          icon={
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
