import {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders,
} from "axios";
import { api } from "@/lib/api";
import { AuthActions } from "@/lib/authClient";

// Extrai utilitários
const { handleJWTRefresh, storeToken, getToken } = AuthActions();

// Controle de refresh em fila (evita múltiplos refresh concorrentes)
let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

// Interceptor de REQUEST: adiciona Authorization se houver access
api.interceptors.request.use((config) => {
  const access = getToken("access");
  if (access) {
    const headers: AxiosRequestHeaders = config.headers ?? {};
    headers.Authorization = `Bearer ${access}`;
    config.headers = headers;
  }
  return config;
});

// Auxiliar para executar o refresh e devolver o novo access
async function refreshAccess(): Promise<string | null> {
  try {
    const response = await handleJWTRefresh();
    const access = response?.data?.access as string | undefined;
    if (access) {
      storeToken(access, "access");
      return access;
    }

    return null;
  } catch {
    return null;
  }
}

// Interceptor de RESPONSE: em 401(não autorizado), tenta 1x refresh e refaz a request
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original =
      (error.config as InternalAxiosRequestConfig & { _retry?: boolean }) ||
      undefined;

    // Se não for 401, ou a request já foi re-tentada, propaga o erro
    if (status !== 401 || !original || original._retry) {
      if (status === 401) {
        // caiu aqui sem possibilidade de refresh: volta pro login
        window.location.replace("/login");
      }
      return Promise.reject(error);
    }

    // Marca para evitar loop
    original._retry = true;

    // Se ninguém está fazendo refresh, faça; senão, espere
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newAccess = await refreshAccess();
        queue.forEach((fn) => fn(newAccess));
        queue = [];

        if (newAccess) {
          const headers: AxiosRequestHeaders = original.headers ?? {};
          headers.Authorization = `Bearer ${newAccess}`;
          original.headers = headers;
          return api(original); // refaz a request original
        } else {
          window.location.replace("/login");
          return Promise.reject(error);
        }
      } catch (e) {
        queue.forEach((fn) => fn(null));
        queue = [];
        window.location.replace("/login");
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    // Já há um refresh em andamento → aguarda e depois reenvia
    return new Promise((resolve, reject) => {
      queue.push((newAccess) => {
        if (!newAccess) {
          window.location.replace("/login");
          return reject(error);
        }
        const headers: AxiosRequestHeaders = original.headers ?? {};
        headers.Authorization = `Bearer ${newAccess}`;
        original.headers = headers;
        resolve(api(original));
      });
    });
  }
);

export const fetcher = async <T = unknown>(url: string): Promise<T> => {
  const { data } = await api.get<T>(url);
  return data;
};

export default api;
