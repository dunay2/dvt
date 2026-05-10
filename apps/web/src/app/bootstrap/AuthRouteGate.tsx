/** Owned concern: gate protected product routes behind authenticated session profile resolution. */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { createApiClient, type ApiError } from '../services/api/createApiClient';
import { getRuntimeDataSourceMode } from '../services/config/runtimeDataSourceMode';
import { resolveProtectedRouteSessionContext } from '../services/session/protectedRouteSessionContext';

type AuthGateState =
  | { kind: 'checking' }
  | { kind: 'allowed' }
  | { kind: 'denied'; reason: 'unauthenticated' | 'transport_error' };

const sessionApiClient = createApiClient();

export default function AuthRouteGate({
  children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element {
  const location = useLocation();
  const [state, setState] = useState<AuthGateState>(() =>
    getRuntimeDataSourceMode() === 'mock' ? { kind: 'allowed' } : { kind: 'checking' }
  );

  useEffect(() => {
    if (getRuntimeDataSourceMode() === 'mock') {
      setState({ kind: 'allowed' });
      return;
    }

    let cancelled = false;
    setState({ kind: 'checking' });
    resolveProtectedRouteSessionContext(sessionApiClient)
      .then(() => {
        if (!cancelled) {
          setState({ kind: 'allowed' });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        const apiError = error as ApiError;
        if (apiError?.statusCode === 401 || apiError?.statusCode === 403) {
          setState({ kind: 'denied', reason: 'unauthenticated' });
          return;
        }

        setState({ kind: 'denied', reason: 'transport_error' });
      });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, location.hash]);

  if (state.kind === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
        Checking session...
      </div>
    );
  }

  if (state.kind === 'denied') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        replace
        state={{ reason: state.reason }}
      />
    );
  }

  return <>{children}</>;
}
