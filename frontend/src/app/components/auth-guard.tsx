"use client";

import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { api, AuthActions } from "../../../utils";

const PUBLIC_PATH = "/login";

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

      if (!hasToken) {
        removeTokens();
        if (pathname === PUBLIC_PATH) {
          allow();
        } else {
          router.replace(PUBLIC_PATH);
        }
        return;
      }

      if (pathname === PUBLIC_PATH) {
        router.replace("/");
        return;
      }

      allow();
    };

    setIsAllowed(false);

    if (pathname === PUBLIC_PATH) {
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
          router.replace(PUBLIC_PATH);
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
          originalRequest.headers = originalRequest.headers ?? {};
          (originalRequest.headers as any).Authorization = `Bearer ${newAccess}`;

          return api(originalRequest);
        } catch (refreshError) {
          removeTokens();
          router.replace(PUBLIC_PATH);
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
