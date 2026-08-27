'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthActions } from '@/lib/authClient';
import { useIsAdmin } from '@/lib/AdminContext';

const LOGIN_PATH = '/login';
const PUBLIC_PATHS = [LOGIN_PATH];
const PUBLIC_PREFIXES = ['/accept-invitation'];

const LABELINGS_ROOT = '/labelings';
const LABELINGS_MANAGE = '/labelings_manage';

export default function AuthGuard({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { getToken } = AuthActions();
  const { isAdmin, isLoading } = useIsAdmin();
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const hasToken = Boolean(getToken('refresh') ?? getToken('access'));
    const isPublicPath = PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    // Public path without a token: allow.
    if (isPublicPath && !hasToken) {
      setIsAllowed(true);
      return;
    }

    // Public path with a token: redirect to home.
    if (isPublicPath && hasToken) {
      router.replace('/labelings');
      return;
    }

    // Private path without a token: redirect to login.
    if (!isPublicPath && !hasToken) {
      router.replace(LOGIN_PATH);
      return;
    }

    // Private path with a token: wait for isAdmin to load.
    if (isLoading || isAdmin === undefined) return;

    // Admins have no route restrictions.
    if (isAdmin) {
      setIsAllowed(true);
      return;
    }

    // Regular users can access only /labelings (and its subroutes), except
    // /labelings_manage; any other route redirects to /labelings.
    const isLabelingsArea = pathname.startsWith(LABELINGS_ROOT);
    const isManageArea = pathname === LABELINGS_MANAGE || pathname.startsWith(`${LABELINGS_MANAGE}/`);

    if (isLabelingsArea && !isManageArea) {
      setIsAllowed(true);
      return;
    }

    router.replace(LABELINGS_ROOT);
  }, [getToken, pathname, router, isAdmin, isLoading]);

  if (!isAllowed) return null;

  return <>{children}</>;
}
