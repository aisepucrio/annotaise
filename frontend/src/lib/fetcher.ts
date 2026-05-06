import { AxiosRequestHeaders } from 'axios';
import createAuthRefreshInterceptor from 'axios-auth-refresh';
import { api } from '@/lib/api';
import { AuthActions } from '@/lib/authClient';

// Extrai utilitários
const { storeToken, getToken, forceLogoutAndRedirect } = AuthActions();

// Request interceptor: injeta Authorization se houver access
api.interceptors.request.use((config) => {
  const access = getToken('access');
  if (access) {
    const headers: AxiosRequestHeaders = config.headers ?? {};
    headers.Authorization = `Bearer ${access}`;
    config.headers = headers;
  }
  return config;
});

// Lógica de refresh para axios-auth-refresh
const refreshAuthLogic = async () => {
  const refreshToken = getToken('refresh');

  if (!refreshToken) {
    forceLogoutAndRedirect();
    return Promise.reject(new Error('Missing refresh token'));
  }

  try {
    const response = await AuthActions().handleJWTRefresh();
    const access = response?.data?.access as string | undefined;

    if (!access) {
      forceLogoutAndRedirect();
      return Promise.reject(new Error('Refresh failed'));
    }

    storeToken(access, 'access');
    return Promise.resolve();
  } catch (error) {
    forceLogoutAndRedirect();
    return Promise.reject(error);
  }
};

// Configura axios-auth-refresh (gerencia fila e retry automaticamente)
createAuthRefreshInterceptor(api, refreshAuthLogic, {
  statusCodes: [401], // Tenta refresh em 401
});

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const { data } = await api.get<T>(url);
  return data;
};

export default api;
