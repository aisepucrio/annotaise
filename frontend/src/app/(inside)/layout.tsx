'use client';

import '@/lib/fetcher'; // Registra os interceptors de autenticação
import AuthGuard from '@/components/AuthGuard';
import { SidebarProvider } from '@/components/side-bar/sidebar_provider';
import SidebarLayout from '@/components/side-bar/sidebar_layout';
import { AdminProvider } from '@/lib/AdminContext';

export default function InsideLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <SidebarProvider>
        <AuthGuard>
          <SidebarLayout>{children}</SidebarLayout>
        </AuthGuard>
      </SidebarProvider>
    </AdminProvider>
  );
}
