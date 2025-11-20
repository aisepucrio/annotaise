import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * Axios client centralizado para a API do backend.
 * Os interceptors de autenticação são configurados em authClient/fetcher.
 */
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
