import type { RouteBootstrapPresentation } from './routeBootstrapContract';
import type { RouteBootstrapRegistration } from './routeBootstrapRegistration';

const MISSING_ROUTE_BOOTSTRAP_PRESENTATION: RouteBootstrapPresentation = {
  status: 'pending',
  detail: 'Active route bootstrap contract is missing',
  canComplete: false,
};

const routeBootstrapPresentations = new Map<string, RouteBootstrapPresentation>();
const listeners = new Set<() => void>();

function areRouteBootstrapPresentationsEqual(
  left: RouteBootstrapPresentation,
  right: RouteBootstrapPresentation
): boolean {
  return (
    left.status === right.status &&
    left.detail === right.detail &&
    left.canComplete === right.canComplete
  );
}

function emitRouteBootstrapChange(): void {
  listeners.forEach((listener) => {
    listener();
  });
}

export function getPublishedRouteBootstrapPresentation(
  registration: RouteBootstrapRegistration | null | undefined
): RouteBootstrapPresentation {
  if (!registration) {
    return MISSING_ROUTE_BOOTSTRAP_PRESENTATION;
  }

  return (
    routeBootstrapPresentations.get(registration.routeId) ??
    registration.routeBootstrap.initialPresentation
  );
}

export function publishRouteBootstrapPresentation(
  registration: RouteBootstrapRegistration,
  nextPresentation: RouteBootstrapPresentation
): void {
  const currentPresentation = getPublishedRouteBootstrapPresentation(registration);
  if (areRouteBootstrapPresentationsEqual(currentPresentation, nextPresentation)) {
    return;
  }

  routeBootstrapPresentations.set(registration.routeId, nextPresentation);
  emitRouteBootstrapChange();
}

export function resetRouteBootstrapPresentation(
  registration: RouteBootstrapRegistration
): void {
  if (!routeBootstrapPresentations.delete(registration.routeId)) {
    return;
  }

  emitRouteBootstrapChange();
}

export function subscribeRouteBootstrapPresentations(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
