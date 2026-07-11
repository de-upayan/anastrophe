'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Fredericka_the_Great } from 'next/font/google';
import styles from './page.module.css';

const fredericka = Fredericka_the_Great({ weight: '400', subsets: ['latin'], adjustFontFallback: false });

export default function AdminLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    // Check if token already stored for automatic sign-in
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken) {
      handleAutoLogin(savedToken);
    }
  }, []);

  const handleAutoLogin = async (savedToken: string) => {
    setIsAutoLogging(true);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: savedToken })
      });
      const data = await res.json();
      if (data.success) {
        router.push('/admin');
      } else {
        localStorage.removeItem('admin_token');
        setIsAutoLogging(false);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Auto-login connection error:', err);
      setIsAutoLogging(false);
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      
      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('admin_token', token);
        } else {
          localStorage.removeItem('admin_token');
        }
        router.push('/admin');
      } else {
        setError(data.error || 'Invalid admin token');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h1 className={`${styles.title} ${fredericka.className}`}>Anastrophe.</h1>
        
        {isAutoLogging ? (
          <div className={styles.autoLoginMessage}>
            <div className={styles.spinner} />
            <p className={styles.autoText}>Auto-authenticating...</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                id="token"
                type="password"
                placeholder="Enter admin secret key"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={styles.input}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>
            
            <div className={styles.rememberGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={styles.checkbox}
                  disabled={isLoading}
                />
                Remember me on this device
              </label>
            </div>
            
            {error && <p className={styles.errorMessage}>{error}</p>}
            
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isLoading || !token}
            >
              {isLoading ? 'Authenticating...' : 'Enter Dashboard'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
