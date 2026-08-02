import { useEffect, useMemo } from 'react';
import { isRouteErrorResponse, useMatches, useRouteError } from 'react-router';
import {
  resolveAppRouteErrorBoundaryCopy,
  type AppRouteErrorBoundaryCopy,
} from './appRouteErrorBoundaryCopy';
import { createBootstrapFailureCommand } from './bootstrap/appBootstrapCommands';
import { isBootstrapScreenVisible, showBootstrapFailure } from './bootstrap/appBootstrapScreen';
import { useFrontendOperabilityTransitionRecorder } from './services/AppServicesContext';
import {
  createBootstrapFailureEvent,
  createRouteFailureEvent,
  normalizeFrontendOperabilityRouteId,
} from './services/operability/frontendOperabilityRecorder';
import { useFrontendOperabilityTransition } from './services/operability/useFrontendOperabilityTransition';

function getErrorMessage(error: unknown, copy: AppRouteErrorBoundaryCopy): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`.trim();
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return copy.unexpectedRouteError;
}

export default function AppRouteErrorBoundary() {
  const error = useRouteError();
  const matches = useMatches();
  const frontendOperabilityTransitionRecorder = useFrontendOperabilityTransitionRecorder();
  const copy = resolveAppRouteErrorBoundaryCopy();
  const message = getErrorMessage(error, copy);
  const bootstrapScreenVisible = isBootstrapScreenVisible();
  const routeId = normalizeFrontendOperabilityRouteId(matches[matches.length - 1]?.id);
  const routeFailureEvent = useMemo(
    () => createRouteFailureEvent(routeId, 'route-boundary-activated'),
    [routeId]
  );
  const bootstrapFailureEvent = useMemo(
    () =>
      bootstrapScreenVisible
        ? createBootstrapFailureEvent('route', 'route-boundary-activated')
        : null,
    [bootstrapScreenVisible]
  );

  useFrontendOperabilityTransition(
    frontendOperabilityTransitionRecorder,
    'route.boundary',
    routeFailureEvent
  );
  useFrontendOperabilityTransition(
    frontendOperabilityTransitionRecorder,
    'route.bootstrap',
    bootstrapFailureEvent
  );

  useEffect(() => {
    if (bootstrapScreenVisible) {
      showBootstrapFailure(createBootstrapFailureCommand(message));
    }
  }, [bootstrapScreenVisible, message]);

  if (bootstrapScreenVisible) {
    return null;
  }

  return (
    <div
      data-slot="app-route-error-boundary"
      className="app-shell-background flex min-h-screen w-full items-center justify-center px-6 py-10 text-(--text-default)"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-(--border-default) bg-(--surface-shell) p-6 shadow-2xl shadow-black/30">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-(--text-subtle)">
            {copy.brandLabel}
          </p>
          <h1 className="text-2xl font-semibold text-(--text-strong)">{copy.title}</h1>
          <p className="text-sm leading-6 text-(--text-default)">{copy.message}</p>
        </div>

        <div className="mt-5 rounded-xl border border-(--border-default) bg-(--surface-app) px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-(--text-subtle)">
            {copy.errorLabel}
          </p>
          <p className="mt-2 wrap-break-word text-sm text-(--text-strong)">{message}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-(--surface-selected) px-4 text-sm font-medium text-(--text-strong) transition-colors hover:bg-(--surface-hover)"
            data-slot="app-route-error-reload"
            onClick={() => {
              globalThis.location.reload();
            }}
            type="button"
          >
            {copy.reloadLabel}
          </button>
          <a
            className="inline-flex h-10 items-center justify-center rounded-md border border-(--border-default) px-4 text-sm font-medium text-(--text-default) transition-colors hover:bg-(--surface-app) hover:text-(--text-strong)"
            data-slot="app-route-error-home"
            href="/"
          >
            {copy.homeLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
