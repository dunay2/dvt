import { isRouteErrorResponse, useRouteError } from 'react-router';

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`.trim();
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected route error occurred.';
}

export default function AppRouteErrorBoundary() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <div
      data-slot="app-route-error-boundary"
      className="app-shell-background flex min-h-screen w-full items-center justify-center px-6 py-10 text-[var(--text-default)]"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-[color:var(--border-default)] bg-[var(--surface-shell)] p-6 shadow-2xl shadow-black/30">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-subtle)]">
            Raven
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            The application hit an unexpected error.
          </h1>
          <p className="text-sm leading-6 text-[var(--text-default)]">
            The current view could not recover cleanly. Reload the application to restore the
            shell, or return to the workspace root.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-[color:var(--border-default)] bg-[var(--surface-app)] px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-subtle)]">
            Error
          </p>
          <p className="mt-2 break-words text-sm text-[var(--text-strong)]">{message}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--surface-selected)] px-4 text-sm font-medium text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-hover)]"
            data-slot="app-route-error-reload"
            onClick={() => {
              window.location.reload();
            }}
            type="button"
          >
            Reload application
          </button>
          <a
            className="inline-flex h-10 items-center justify-center rounded-md border border-[color:var(--border-default)] px-4 text-sm font-medium text-[var(--text-default)] transition-colors hover:bg-[var(--surface-app)] hover:text-[var(--text-strong)]"
            data-slot="app-route-error-home"
            href="/"
          >
            Return to workspace
          </a>
        </div>
      </div>
    </div>
  );
}
