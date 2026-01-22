/**
 * Authentication and API configuration
 */

// Google OAuth Client ID (client-side safe)
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

// API Base URL
export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8888/.netlify/functions'  // Netlify Dev default port
  : `${window.location.origin}/.netlify/functions`;

// Supabase Config (client-side anon key is safe to expose)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Token storage keys
export const ACCESS_TOKEN_KEY = 'auth_access_token';
export const USER_KEY = 'auth_user';
