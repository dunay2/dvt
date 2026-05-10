/** Owned concern: gate protected product routes behind authenticated session profile resolution. */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';

import { createApiClient, type ApiError } from '../services/api/createApiClient';
import { resolveProtectedRouteSessionContext } from '../services/session/protectedRouteSessionContext';

type AuthGateState =
  | { kind: 'checking' }
  | { kind: 'allowed' }
  | { kind: 'denied'; reason: AuthGateDeniedReason };

type AuthGateDeniedReason = 'unauthenticated' | 'workspace_context_not_granted' | 'transport_error';

const sessionApiClient = createApiClient();

function hasWorkspaceContextNotGrantedBody(apiError: Pick<ApiError, 'responseBody'>): boolean {
  const body = apiError.responseBody;
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const errorBody = (body as { readonly error?: { readonly reason?: unknown } }).error;
  return errorBody?.reason === 'workspace_context_not_granted';
}

export function classifyProtectedRouteSessionError(error: unknown): AuthGateDeniedReason {
  const apiError = error as Partial<ApiError>;
  if (
    apiError?.statusCode === 403 &&
    apiError.endpoint === '/workspace/context' &&
    hasWorkspaceContextNotGrantedBody(apiError as ApiError)
  ) {
    return 'workspace_context_not_granted';
  }

  if (apiError?.statusCode === 401 || apiError?.statusCode === 403) {
    return 'unauthenticated';
  }

  return 'transport_error';
}

export default function AuthRouteGate({
  children,
}: Readonly<{ children: React.ReactNode }>): JSX.Element {
  const location = useLocation();
  const [state, setState] = useState<AuthGateState>({ kind: 'checking' });

  useEffect(() => {
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

        setState({ kind: 'denied', reason: classifyProtectedRouteSessionError(error) });
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
    if (state.reason === 'workspace_context_not_granted') {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-950 px-6 text-slate-200">
          <div className="max-w-md space-y-3 text-center" role="alert">
            <h1 className="text-xl font-semibold text-white">Workspace access required</h1>
            <p className="text-sm text-slate-300">
              Your session is valid, but no workspace grant is available for this account.
            </p>
          </div>
        </div>
      );
    }

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
