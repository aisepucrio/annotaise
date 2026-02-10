"use client";

import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthActions } from "@/lib/authClient";

const LOGIN_PATH = "/login";
const PUBLIC_PATHS = [LOGIN_PATH];
const PUBLIC_PREFIXES = ["/accept-invitation"];

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
      const isPublic =
        PUBLIC_PATHS.includes(pathname) ||
        PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

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

    if (
      PUBLIC_PATHS.includes(pathname) ||
      PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
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

  if (!isAllowed) {
    return null;
  }

  return <>{children}</>;
}
