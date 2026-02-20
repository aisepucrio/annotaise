"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/fetcher";
import { AuthActions } from "@/lib/authClient";
import type { User as UserType } from "@/modules/user/userTypes";

export type CurrentUser = UserType & { created_at?: string };

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

export function useCurrentUser() {
  const { getToken } = AuthActions();
  const refreshToken = getToken("refresh");
  const accessToken = getToken("access");
  const authCacheKey = refreshToken ?? accessToken ?? null;

  return useQuery({
    queryKey: [...CURRENT_USER_QUERY_KEY, authCacheKey],
    enabled: Boolean(authCacheKey),
    queryFn: async () => {
      const { data } = await api.get<CurrentUser>("/users/current/");
      return data;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
