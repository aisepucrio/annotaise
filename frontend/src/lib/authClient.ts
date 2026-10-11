'use client';

import Cookies from 'js-cookie';
import { api } from '@/lib/api';

const storeToken = (token: string, type: 'access' | 'refresh') => {
  Cookies.set(type + 'Token', token);
};

const getToken = (type: 'access' | 'refresh') => {
  return Cookies.get(type + 'Token');
};

const removeTokens = () => {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
};

/**
 * Centralizes forced logout: clears tokens and redirects to /login.
 * Guards against running on the server (no `window`).
 */
const forceLogoutAndRedirect = () => {
  removeTokens();
  if (typeof window !== 'undefined') {
    if (window.location.pathname === '/login') return;
    window.location.replace('/login');
  }
};

const login = (email: string, password: string) => {
  return api.post('/api/auth/token/', { email, password });
};

const logout = () => {
  const refreshToken = getToken('refresh');
  return api.post('/api/auth/logout/', { refresh: refreshToken });
};

const handleJWTRefresh = () => {
  const refreshToken = getToken('refresh');
  return api.post('/api/auth/token/refresh/', { refresh: refreshToken });
};

export const AuthActions = () => {
  return {
    login,
    handleJWTRefresh,
    storeToken,
    getToken,
    logout,
    removeTokens,
    forceLogoutAndRedirect,
    forgotPassword,
    resetPassword,
  };
};

const forgotPassword = (email: string) => {
  return api.post('/api/auth/forgot-password/', { email });
};

const resetPassword = (token: string, newPassword: string) => {
  return api.post('/api/auth/reset-password/', { token, new_password: newPassword });
};
