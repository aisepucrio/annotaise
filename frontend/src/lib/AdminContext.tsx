"use client";

import { createContext, useContext, PropsWithChildren } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/fetcher";
import type { User as UserType } from "@/modules/user/userTypes";
import { AuthActions } from "@/lib/authClient";

type AdminContextType = {
  isAdmin: boolean | undefined;
  isLoading: boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

type CurrentUser = UserType & { created_at?: string };

export function AdminProvider({ children }: PropsWithChildren) {
  const { getToken } = AuthActions();
  const hasToken = Boolean(getToken("refresh") ?? getToken("access"));

  const { data, isLoading } = useQuery({
    queryKey: ["isAdmin"],
    enabled: hasToken, // <- isso mata o 401 na tela de login
    queryFn: async () => {
      try {
        const { data } = await api.get<CurrentUser>("/users/current/");
        return data.is_staff || data.account_type === "admin";
      } catch {
        return false;
      }
    },
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  return (
    <AdminContext.Provider value={{ isAdmin: data, isLoading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useIsAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useIsAdmin must be used within AdminProvider");
  }
  return context;
}
