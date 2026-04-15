import React, { useState } from 'react';
import { loginUser } from './authApi.js';
import '../../styles/auth.css';

const LoginScreen = ({ onLogin, onSwitchToSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.replace(/\s+/gu, " ").trim();
    const trimmedPassword = password.replace(/\s+/gu, " ").trim();

    setLoading(true);

    try {
      const result = await loginUser(trimmedUsername, trimmedPassword);
      onLogin(result);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">✕ ○</div>
          <h1 id="login-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to continue your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error" id="login-error">{error}</div>}
          
          <div className="auth-field">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
              minLength={3}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              minLength={4}
            />
          </div>

          <button 
            id="login-submit"
            type="submit" 
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner"></span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account?{' '}
            <button 
              id="switch-to-signup"
              className="auth-link-btn" 
              onClick={onSwitchToSignup}
            >
              Create one
            </button>
          </p>
        </div>
      </div>

      <div className="auth-bg-decoration">
        <div className="auth-grid-cell c1">✕</div>
        <div className="auth-grid-cell c2">○</div>
        <div className="auth-grid-cell c3">✕</div>
        <div className="auth-grid-cell c4">○</div>
      </div>
    </div>
  );
};

export default LoginScreen;
