'use client';

import { createContext, useContext, PropsWithChildren } from 'react';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';

type AdminContextType = {
  isAdmin: boolean | undefined;
  isLoading: boolean;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: PropsWithChildren) {
  const { data: currentUser, isLoading } = useCurrentUser();
  const isAdmin = isLoading ? undefined : Boolean(currentUser?.is_staff || currentUser?.account_type === 'admin');

  return <AdminContext.Provider value={{ isAdmin, isLoading }}>{children}</AdminContext.Provider>;
}

export function useIsAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useIsAdmin must be used within AdminProvider');
  }
  return context;
}
