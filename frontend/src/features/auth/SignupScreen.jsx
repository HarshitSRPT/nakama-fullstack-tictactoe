import React, { useState } from 'react';
import { Session } from '@heroiclabs/nakama-js';
import { registerUser } from './authApi.js';
import '../../styles/auth.css';

const SignupScreen = ({ onLogin, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (trimmedPassword !== confirmPassword.trim()) {
      setError('Passwords do not match');
      return;
    }

    if (trimmedUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      const regResult = await registerUser(trimmedUsername, trimmedPassword);
      if (!regResult.success) {
        setError(regResult.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Auto-login using the server-generated token from registration.
      // No separate loginUser() call needed — token is already validated.
      const session = Session.restore(regResult.token, "");
      onLogin({
        session,
        userId: regResult.userId,
        username: regResult.username,
        token: regResult.token
      });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">✕ ○</div>
          <h1 id="signup-title">Create Account</h1>
          <p className="auth-subtitle">Join the arena and prove your skills</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error" id="signup-error">{error}</div>}

          <div className="auth-field">
            <label htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoComplete="username"
              required
              minLength={3}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              required
              minLength={4}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="signup-confirm-password">Confirm Password</label>
            <input
              id="signup-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
              minLength={4}
            />
          </div>

          <button
            id="signup-submit"
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner"></span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account?{' '}
            <button
              id="switch-to-login"
              className="auth-link-btn"
              onClick={onSwitchToLogin}
            >
              Sign in
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

export default SignupScreen;
