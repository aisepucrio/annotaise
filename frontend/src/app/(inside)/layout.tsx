"use client";

import "@/lib/fetcher"; // Registra os interceptors de autenticação
import AuthGuard from "@/components/auth-guard";
import { SidebarProvider } from "@/components/side-bar/sidebar_provider";
import SidebarLayout from "@/components/side-bar/sidebar_layout";

export default function InsideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AuthGuard>
        <SidebarLayout>{children}</SidebarLayout>
      </AuthGuard>
    </SidebarProvider>
  );
}
