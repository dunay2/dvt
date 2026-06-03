/** Owned concern: render the unauthenticated login posture for protected route gating. */
import { Link, useLocation } from 'react-router';

export default function LoginView(): JSX.Element {
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get('returnTo') ?? '/';
  const reason =
    typeof location.state === 'object' && location.state != null && 'reason' in location.state
      ? String((location.state as { reason?: string }).reason)
      : null;

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
        <div className="mt-4">
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
