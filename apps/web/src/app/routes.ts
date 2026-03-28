import { Fragment, Suspense, createElement, type ComponentType, type ReactNode } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';

import Root from './Root';
import { useCapabilitiesQuery } from './queries/useCapabilitiesQuery';
import AdminView from './views/AdminView';
import ArtifactsView from './views/ArtifactsView';
import DiffView from './views/DiffView';
import LineageView from './views/LineageView';
import PluginsView from './views/PluginsView';
import { getAllViews, getDefaultCoreViewPath, getRuntimePlugins } from './plugins/registry';

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
  const { data: capabilities } = useCapabilitiesQuery();
  const enabledPluginIds = new Set(getRuntimePlugins(capabilities).map((plugin) => plugin.id));

  if (!enabledPluginIds.has(pluginId)) {
    return createElement(Navigate, {
      to: getDefaultCoreViewPath(capabilities),
      replace: true,
    });
  }

  return createElement(Fragment, null, children);
}

function createPluginRoute(pluginId: string, component: ComponentType): RouteObject['element'] {
  return createElement(
    Suspense,
    { fallback: createElement(PluginRouteFallback) },
    createElement(PluginAvailabilityGuard, { pluginId }, createElement(component))
  );
}

const pluginRoutes = getAllViews().map<RouteObject>((view) => ({
  path: normalizeChildPath(view.path),
  element: createPluginRoute(view.pluginId, view.component),
}));

const pluginRoutePaths = new Set(pluginRoutes.map((route) => route.path).filter(Boolean));

const shellRoutes: RouteObject[] = [
  { path: 'artifacts', Component: ArtifactsView },
  { path: 'diff', Component: DiffView },
  { path: 'lineage', Component: LineageView },
  { path: 'plugins', Component: PluginsView },
  { path: 'admin', Component: AdminView },
].filter((route) => !pluginRoutePaths.has(route.path));

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Root,
    children: [
      {
        index: true,
        element: createElement(Navigate, { to: getDefaultCoreViewPath(), replace: true }),
      },
      ...pluginRoutes,
      ...shellRoutes,
    ],
  },
]);
