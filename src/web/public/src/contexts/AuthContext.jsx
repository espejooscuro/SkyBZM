import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [password, setPassword] = useState(null);
  const [config, setConfig] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = (pwd, cfg) => {
    setPassword(pwd);
    setConfig(cfg);
    setIsAuthenticated(true);
  };

  const logout = () => {
    setPassword(null);
    setConfig(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      password, 
      config, 
      setConfig,
      isAuthenticated, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
