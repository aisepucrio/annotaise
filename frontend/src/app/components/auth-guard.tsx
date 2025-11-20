"use client";

import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { AxiosRequestHeaders } from "axios";
import { api } from "../../lib/api";
import { AuthActions } from "../../../authClient";

const LOGIN_PATH = "/login";
const PUBLIC_PATHS = [LOGIN_PATH];

export default function AuthGuard({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useMemo(() => AuthActions(), []);
  const { removeTokens, getToken, handleJWTRefresh, storeToken } = auth;
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const allow = () => {
      if (!cancelled) {
        setIsAllowed(true);
      }
    };

    const enforceAuth = () => {
      const hasToken = Boolean(getToken("refresh") ?? getToken("access"));
      const isPublic = PUBLIC_PATHS.includes(pathname);

      if (!hasToken) {
        removeTokens();
        if (isPublic) {
          allow();
        } else {
          router.replace(LOGIN_PATH);
        }
        return;
      }

      if (isPublic) {
        router.replace("/");
        return;
      }

      allow();
    };

    setIsAllowed(false);

    if (PUBLIC_PATHS.includes(pathname)) {
      const hasToken = Boolean(getToken("refresh") ?? getToken("access"));
      if (!hasToken) {
        allow();
        return;
      }
    }

    enforceAuth();

    return () => {
      cancelled = true;
    };
  }, [getToken, pathname, removeTokens, router]);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest =
          (error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined) ??
          undefined;

        if (status !== 401 || !originalRequest) {
          return Promise.reject(error);
        }

        const isRefreshCall = originalRequest.url?.includes("/api/auth/token/refresh/");

        if (isRefreshCall || originalRequest._retry) {
          removeTokens();
          router.replace(LOGIN_PATH);
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          const refreshed = await handleJWTRefresh();
          const newAccess = refreshed?.data?.access;

          if (!newAccess) {
            throw new Error("Missing access token");
          }

          storeToken(newAccess, "access");
          const headers: AxiosRequestHeaders = originalRequest.headers ?? {};
          headers.Authorization = `Bearer ${newAccess}`;
          originalRequest.headers = headers;

          return api(originalRequest);
        } catch (refreshError) {
          removeTokens();
          router.replace(LOGIN_PATH);
          return Promise.reject(refreshError);
        }
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [handleJWTRefresh, removeTokens, router, storeToken]);

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
