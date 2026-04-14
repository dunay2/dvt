import { Fragment, Suspense, createElement, type ComponentType, type ReactNode } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';

import AppRouteErrorBoundary from './AppRouteErrorBoundary';
import Root from './Root';
import { useShellRuntime } from './shell/useShellRuntime';
import AdminView from './views/AdminView';
import PluginsView from './views/PluginsView';
import { getAllViews } from './plugins/registry';

function normalizeChildPath(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path;
}

function PluginRouteFallback() {
  return createElement(
    'div',
    { className: 'flex h-full items-center justify-center bg-slate-950 text-sm text-slate-300' },
    'Loading view...'
  );
}

function PluginAvailabilityGuard({
  pluginId,
  children,
}: Readonly<{ pluginId: string; children: ReactNode }>) {
  const { enabledPluginIds, defaultCoreViewPath } = useShellRuntime();

  if (!enabledPluginIds.has(pluginId)) {
    return createElement(Navigate, {
      to: defaultCoreViewPath,
      replace: true,
    });
  }

  return createElement(Fragment, null, children);
}

function DefaultCoreRouteRedirect() {
  const { defaultCoreViewPath } = useShellRuntime();

  return createElement(Navigate, { to: defaultCoreViewPath, replace: true });
}

function createPluginRoute(pluginId: string, component: ComponentType): RouteObject['element'] {
  return createElement(
    Suspense,
    { fallback: createElement(PluginRouteFallback) },
    createElement(PluginAvailabilityGuard, { pluginId, children: createElement(component) })
  );
}

export function createAppRoutes(): RouteObject[] {
  const pluginRoutes = getAllViews().map<RouteObject>((view) => ({
    path: normalizeChildPath(view.path),
    element: createPluginRoute(view.pluginId, view.component),
  }));
  const pluginRoutePaths = new Set(pluginRoutes.map((route) => route.path).filter(Boolean));
  const shellRoutes: RouteObject[] = [
    { path: 'plugins', Component: PluginsView },
    { path: 'admin', Component: AdminView },
  ].filter((route) => !pluginRoutePaths.has(route.path));

  return [
    {
      path: '/',
      Component: Root,
      errorElement: createElement(AppRouteErrorBoundary),
      children: [
        {
          index: true,
          element: createElement(DefaultCoreRouteRedirect),
        },
        ...pluginRoutes,
        ...shellRoutes,
      ],
    },
  ];
}

export function createAppRouter() {
  return createBrowserRouter(createAppRoutes());
}
