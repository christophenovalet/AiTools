/**
 * Authentication Context
 * Manages user authentication state and provides auth methods
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  API_BASE_URL,
  ACCESS_TOKEN_KEY,
  USER_KEY
} from '../config/auth';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    setLoading(false);
  }, []);

  // Auto-refresh token before expiry (every 10 minutes)
  useEffect(() => {
    if (!accessToken) return;

    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (err) {
        console.error('Failed to refresh token:', err);
        // Don't logout on refresh failure, wait for next attempt
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [accessToken]);

  /**
   * Sign in with Google ID token
   */
  const signInWithGoogle = async (idToken) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth-google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ idToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await response.json();

      // Store tokens and user info
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setAccessToken(data.accessToken);
      setUser(data.user);

      return data.user;
    } catch (err) {
      console.error('Sign in error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh access token using refresh token cookie
   */
  const refreshToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth-refresh`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      // Update stored token
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setAccessToken(data.accessToken);
      setUser(data.user);

      return data.accessToken;
    } catch (err) {
      console.error('Refresh token error:', err);
      throw err;
    }
  };

  /**
   * Sign out
   */
  const signOut = async () => {
    setLoading(true);

    try {
      // Call logout endpoint (clears httpOnly cookie)
      if (accessToken) {
        await fetch(`${API_BASE_URL}/auth-logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          credentials: 'include'
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
      // Continue with local logout even if API call fails
    }

    // Clear local storage
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setAccessToken(null);
    setUser(null);
    setLoading(false);
  };

  /**
   * Make authenticated API request with auto-retry on token expiry
   */
  const authenticatedFetch = async (url, options = {}) => {
    if (!accessToken) {
      throw new Error('Not authenticated');
    }

    // Add authorization header
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });

      // If token expired, try to refresh and retry
      if (response.status === 401) {
        try {
          const newToken = await refreshToken();

          // Retry with new token
          headers.Authorization = `Bearer ${newToken}`;
          return fetch(url, { ...options, headers, credentials: 'include' });
        } catch (refreshErr) {
          // Refresh failed, logout user
          await signOut();
          throw new Error('Session expired, please sign in again');
        }
      }

      return response;
    } catch (err) {
      console.error('Authenticated fetch error:', err);
      throw err;
    }
  };

  const value = {
    user,
    accessToken,
    loading,
    error,
    isAuthenticated: !!user,
    signInWithGoogle,
    signOut,
    refreshToken,
    authenticatedFetch
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
