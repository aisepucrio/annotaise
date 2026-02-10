"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthActions } from "@/lib/authClient";
import { useIsAdmin } from "@/lib/AdminContext";

const LOGIN_PATH = "/login";
const PUBLIC_PATHS = [LOGIN_PATH];
const PUBLIC_PREFIXES = ["/accept-invitation"];

const LABELINGS_ROOT = "/labelings";
const LABELINGS_MANAGE = "/labelings/manage";

export default function AuthGuard({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { getToken } = AuthActions();
  const { isAdmin, isLoading } = useIsAdmin();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const hasToken = Boolean(getToken("refresh") ?? getToken("access"));
    const isPublicPath =
      PUBLIC_PATHS.includes(pathname) ||
      PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    // Público sem token: permitir
    if (isPublicPath && !hasToken) {
      setIsAllowed(true);
      return;
    }

    // Público com token: redirecionar para home
    if (isPublicPath && hasToken) {
      router.replace("/labelings");
      return;
    }

    // Privado sem token: redirecionar para login
    if (!isPublicPath && !hasToken) {
      router.replace(LOGIN_PATH);
      return;
    }

    // Privado com token: aguardar isAdmin carregar
    if (isLoading || isAdmin === undefined) return;

    // Admin não tem restrição
    if (isAdmin) {
      setIsAllowed(true);
      return;
    }

    // Usuário normal:
    // - Pode acessar apenas /labelings (e subrotas), EXCETO /labelings/manage
    // - Qualquer outra rota -> /labelings
    const isLabelingsArea = pathname.startsWith(LABELINGS_ROOT);
    const isManageArea =
      pathname === LABELINGS_MANAGE ||
      pathname.startsWith(`${LABELINGS_MANAGE}/`);

    if (isLabelingsArea && !isManageArea) {
      setIsAllowed(true);
      return;
    }

    router.replace(LABELINGS_ROOT);
  }, [getToken, pathname, router, isAdmin, isLoading]);

  if (!isAllowed) return null;

  return <>{children}</>;
}
