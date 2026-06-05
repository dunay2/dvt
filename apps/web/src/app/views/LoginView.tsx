/** Owned concern: render the unauthenticated login posture for protected route gating. */
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import {
  canRecoverLocalApiBearerSession,
  recoverLocalApiBearerSession,
} from '../services/api/apiAuthConfig';

export default function LoginView(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const returnTo = new URLSearchParams(location.search).get('returnTo') ?? '/';
  const canStartLocalSession = canRecoverLocalApiBearerSession();
  const [localSessionState, setLocalSessionState] = useState<'idle' | 'pending' | 'failed'>('idle');
  const reason =
    typeof location.state === 'object' && location.state != null && 'reason' in location.state
      ? String((location.state as { reason?: string }).reason)
      : null;

  async function handleStartLocalSession(): Promise<void> {
    setLocalSessionState('pending');
    const recovered = await recoverLocalApiBearerSession();

    if (!recovered) {
      setLocalSessionState('failed');
      return;
    }

    void navigate(returnTo, { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <section className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h1 className="text-lg font-semibold">Login required</h1>
        <p className="mt-2 text-sm text-slate-300">
          This route requires an authenticated API bearer session.
        </p>
        {reason === 'transport_error' ? (
          <p className="mt-3 text-xs text-amber-300">
            Session check failed due to transport error. Verify API availability.
          </p>
        ) : null}
        {reason === 'runtime_unavailable' ? (
          <p className="mt-3 text-xs text-amber-300">
            Protected runtime session route is unavailable. Verify OIDC/API runtime posture.
          </p>
        ) : null}
        {canStartLocalSession ? (
          <div className="mt-4">
            <button
              type="button"
              className="inline-flex rounded-md border border-sky-500 bg-sky-500/10 px-3 py-2 text-sm font-medium text-sky-100 hover:bg-sky-500/20 disabled:cursor-wait disabled:opacity-70"
              disabled={localSessionState === 'pending'}
              onClick={() => {
                void handleStartLocalSession();
              }}
            >
              {localSessionState === 'pending'
                ? 'Starting local dev session...'
                : 'Start local dev session'}
            </button>
            {localSessionState === 'failed' ? (
              <p className="mt-3 text-xs text-amber-300">
                Local session recovery did not return a usable bearer token. Verify the dev stack
                auth endpoint.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-400">
            Local dev session recovery is not configured. Start the coordinated dev stack or set
            VITE_API_BEARER_TOKEN_REFRESH_URL.
          </p>
        )}
        <div className={canStartLocalSession ? 'mt-3' : 'mt-4'}>
          <Link
            to={returnTo}
            className="inline-flex rounded-md border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"
          >
            Retry protected route
          </Link>
        </div>
      </section>
    </main>
  );
}
