import axios from 'axios';

// API base URL, configurable via env (restart the dev server after changing .env*)
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!baseURL) {
  // Fail fast to catch a missing or misnamed env var early.
  throw new Error('NEXT_PUBLIC_API_BASE_URL não está definido. Ajuste o .env.local e reinicie o servidor Next.');
}

/**
 * Centralized axios client for the backend API.
 * Auth interceptors are configured in authClient/fetcher.
 */
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
