import React, { useState, useEffect } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';

function Signup({ onSwap }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        // Store JWT token and username in localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        setMessage('Signup successful! You can now log in.');
        setUsername('');
        setPassword('');
        // Optionally redirect to dashboard or login
        onSwap();
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="signup-content">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? 'Registering...' : 'REGISTER'}
        </button>
      </form>
      {message && <div style={{ color: '#0f0', marginTop: '1rem' }}>{message}</div>}
      {error && <div style={{ color: '#f55', marginTop: '1rem' }}>{error}</div>}
      <div className="swap-link">
        Already have an account?{' '}
        <button type="button" className="swap-btn" onClick={onSwap}>Sign In</button>
      </div>
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [swapped, setSwapped] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Verify token with backend
      fetch('http://localhost:5000/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          // Token is valid, redirect to dashboard
          navigate('/dashboard');
        } else {
          // Token invalid, clear it
          localStorage.removeItem('authToken');
          localStorage.removeItem('username');
        }
      })
      .catch(() => {
        // Error verifying, clear token
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
      });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Login successful!');
        setUsername('');
        setPassword('');
        // Store JWT token and username in localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className={`login-root${swapped ? ' swapped' : ''}`}>
      <div className={`login-card${swapped ? ' swapped' : ''}`}>
        <div className={`login-left${swapped ? ' swapped' : ''}`}>
          {!swapped ? (
            <>
              <h2>Welcome</h2>
              <p>Join Our Unique Platform, Explore a New Experience</p>
              <button className="register-btn" onClick={() => setSwapped(true)}>REGISTER</button>
            </>
          ) : (
            <Signup onSwap={() => setSwapped(false)} />
          )}
        </div>
        <div className={`login-right${swapped ? ' swapped' : ''}`}>
          {!swapped ? (
            <>
              <h2>Sign In</h2>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <div className="login-options">
                  <label>
                    <input type="checkbox" /> Remember me
                  </label>
                  <button type="button" className="forgot-link" tabIndex={0}>Forgot password?</button>
                </div>
                <button type="submit" className="login-btn">LOGIN</button>
              </form>
              {message && <div style={{ color: '#0f0', marginTop: '1rem' }}>{message}</div>}
              {error && <div style={{ color: '#f55', marginTop: '1rem' }}>{error}</div>}
            </>
          ) : (
            <div className="welcome-content">
              <h2>Welcome Back!</h2>
              <p>To keep connected with us please login with your personal info</p>
              <button className="login-btn" onClick={() => setSwapped(false)}>LOGIN</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
