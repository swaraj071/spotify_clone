import React, { useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { ShieldCheck, User, Mail, Sparkles, Key } from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { BACKEND_URL } from '../context/AudioContext';

export default function Auth({ setActiveTab }) {
  const { login } = useAudio();
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle successful Google Login
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });

      if (!response.ok) {
        throw new Error('Google OAuth verification failed on backend.');
      }

      const userData = await response.json();
      login(userData);
      setActiveTab('home');
    } catch (err) {
      console.error(err);
      setErrorMsg('Google login failed: ' + err.message);
    }
  };

  // Handle Mock Developer Login
  const handleDemoLogin = async (e) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim()) {
      setErrorMsg('Please enter both name and email.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mockUser: {
            name: demoName,
            email: demoEmail,
            picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(demoName)}`
          }
        })
      });

      if (!response.ok) {
        throw new Error('Mock authentication failed.');
      }

      const userData = await response.json();
      login(userData);
      setActiveTab('home');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Read Google Client ID from environment (standard vite is import.meta.env.VITE_GOOGLE_CLIENT_ID)
  // Or supply a fallback string
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-card-header">
          <ShieldCheck size={40} className="text-spotify glow-icon" />
          <h2>AuraSound Authentication</h2>
          <p>Sign in to unlock collaborative playlists, upload your own tracks, and write community comments.</p>
        </div>

        {errorMsg && <div className="auth-error-box">{errorMsg}</div>}

        {/* Google Authentication Block */}
        <div className="auth-section">
          <h3>Option 1: Google OAuth</h3>
          {googleClientId ? (
            <div className="google-btn-wrapper">
              <GoogleOAuthProvider clientId={googleClientId}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMsg('Google OAuth initialization error.')}
                  theme="filled_dark"
                  shape="pill"
                  width="100%"
                />
              </GoogleOAuthProvider>
            </div>
          ) : (
            <div className="google-client-disabled">
              <Key size={16} />
              <span>Google OAuth is unconfigured (VITE_GOOGLE_CLIENT_ID missing in .env). Please use Developer Mock Login.</span>
            </div>
          )}
        </div>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        {/* Mock/Demo Authentication Block */}
        <div className="auth-section">
          <h3>Option 2: Developer Demo Login</h3>
          <p className="subtext">Instant bypass login for offline sandbox testing. Generates a custom robot avatar!</p>
          
          <form onSubmit={handleDemoLogin} className="demo-form">
            <div className="input-group">
              <User size={16} className="input-icon" />
              <input
                type="text"
                placeholder="Your Name (e.g. John Doe)"
                value={demoName}
                onChange={(e) => setDemoName(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                placeholder="Your Email (e.g. john@example.com)"
                value={demoEmail}
                onChange={(e) => setDemoEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="demo-login-btn">
              <Sparkles size={16} />
              <span>Enter Sandbox Demo</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
