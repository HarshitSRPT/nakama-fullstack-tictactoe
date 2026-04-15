import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    isLoggedIn: false,
    username: null,
    userId: null,
    session: null,
    loading: true
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('auth_username');
    if (savedUsername) {
      setAuthState({
        isLoggedIn: true,
        username: savedUsername,
        userId: localStorage.getItem('auth_user_id'),
        session: null, // Will be re-authenticated on connect
        loading: false
      });
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const login = (authResult) => {
    const { session, userId, username } = authResult;
    localStorage.setItem('auth_username', username);
    localStorage.setItem('auth_user_id', userId);
    if (session) {
      localStorage.setItem('auth_session_token', session.token);
      if (session.refresh_token) {
        localStorage.setItem('auth_session_refresh_token', session.refresh_token);
      }
    }
    setAuthState({
      isLoggedIn: true,
      username,
      userId,
      session,
      loading: false
    });
  };

  const logout = () => {
    localStorage.removeItem('auth_username');
    localStorage.removeItem('auth_user_id');
    localStorage.removeItem('auth_session_token');
    localStorage.removeItem('auth_session_refresh_token');
    localStorage.removeItem('active_match_id');
    setAuthState({
      isLoggedIn: false,
      username: null,
      userId: null,
      session: null,
      loading: false
    });
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
