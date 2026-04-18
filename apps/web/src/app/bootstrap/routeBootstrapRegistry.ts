import type { RouteBootstrapPresentation } from './routeBootstrapContract';
import type { RouteBootstrapRegistration } from './routeBootstrapRegistration';

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
  registration: RouteBootstrapRegistration
): RouteBootstrapPresentation {
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
