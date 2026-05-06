import axios from 'axios';

// Base da API configurável via env (reinicie o dev server ao alterar .env*)
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!baseURL) {
  // Falha rápida ajuda a identificar env ausente ou nome incorreto
  throw new Error('NEXT_PUBLIC_API_BASE_URL não está definido. Ajuste o .env.local e reinicie o servidor Next.');
}

/**
 * Axios client centralizado para a API do backend.
 * Os interceptors de autenticação são configurados em authClient/fetcher.
 */
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
