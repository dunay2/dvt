import type { RouteObject } from 'react-router';

export function getRootRoute(routes: RouteObject[]): RouteObject {
  const rootRoute = routes[0];
  if (!rootRoute) {
    throw new Error('Expected application routes to declare a root route.');
  }
  return rootRoute;
}

export function findChildRouteById(rootRoute: RouteObject, routeId: string): RouteObject | undefined {
  return rootRoute.children?.find((route) => route.id === routeId);
}

export function findChildRouteByPath(
  rootRoute: RouteObject,
  routePath: string
): RouteObject | undefined {
  return rootRoute.children?.find((route) => route.path === routePath);
}

export function readLeftNavigationCaptions(container: ParentNode): Array<string | undefined> {
  return [...container.querySelectorAll<HTMLElement>('[data-slot="left-navigation-caption"]')].map(
    (node) => node.textContent?.trim()
  );
}
