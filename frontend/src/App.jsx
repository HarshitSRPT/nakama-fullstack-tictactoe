import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { MatchProvider } from './context/MatchContext.jsx';
import LoginScreen from './features/auth/LoginScreen.jsx';
import SignupScreen from './features/auth/SignupScreen.jsx';
import LobbyScreen from './features/lobby/LobbyScreen.jsx';
import GameScreen from './screens/GameScreen.jsx';
import { useMatch } from './hooks/useMatch.js';
import { CONNECTION_STATE } from './constants/opcodes.js';
import { resetClient } from './api/nakamaClient.js';
import './styles/board.css';

function AppContent() {
  const { isLoggedIn, username, login, logout, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'

  const handleLogin = (authResult) => {
    login(authResult);
  };

  const handleLogout = () => {
    resetClient();
    logout();
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    if (authView === 'signup') {
      return (
        <SignupScreen 
          onLogin={handleLogin} 
          onSwitchToLogin={() => setAuthView('login')} 
        />
      );
    }
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onSwitchToSignup={() => setAuthView('signup')} 
      />
    );
  }

  // Logged in — show lobby or game
  return (
    <MatchProvider username={username}>
      <AppGameFlow username={username} onLogout={handleLogout} />
    </MatchProvider>
  );
}

/**
 * Inner component that has access to MatchContext.
 * Switches between Lobby and Game views based on connection state.
 */
function AppGameFlow({ username, onLogout }) {
  const { connectionState } = useMatch();

  if (connectionState === CONNECTION_STATE.IN_MATCH) {
    return <GameScreen layoutType="modern" />;
  }

  return <LobbyScreen username={username} onLogout={onLogout} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
