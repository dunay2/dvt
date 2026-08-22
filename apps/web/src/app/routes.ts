import {
  Fragment,
  Suspense,
  createElement,
  useEffect,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';

import AppRouteErrorBoundary from './AppRouteErrorBoundary';
import { completeBootstrapScreen, setBootstrapStepStatus } from './bootstrap/appBootstrapScreen';
import StaticRouteBootstrapBoundary from './bootstrap/StaticRouteBootstrapBoundary';
import {
  type AppRouteHandle,
  createPendingRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  createStaticRouteBootstrapHandle,
} from './bootstrap/routeBootstrapContract';
import { getRouteBootstrapRegistration } from './bootstrap/routeBootstrapRegistration';
import { usePublishedRouteBootstrap } from './bootstrap/usePublishedRouteBootstrap';
import type { ViewContribution } from './plugins/contracts/PluginManifest';
import { getRouteViews } from './plugins/registry';
import Root from './Root';
import AuthRouteGate from './bootstrap/AuthRouteGate';
import { useShellRuntime } from './shell/useShellRuntime';
import AdminView from './views/AdminView';
import LoginView from './views/LoginView';
import PluginsView from './views/PluginsView';

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
  const { capabilitiesQuery, enabledPluginIds, defaultCoreViewPath } = useShellRuntime();
  const capabilityProbePending =
    capabilitiesQuery.isPending && !capabilitiesQuery.data && !capabilitiesQuery.isError;

  if (!enabledPluginIds.has(pluginId)) {
    if (capabilityProbePending) {
      return createElement(PluginRouteFallback);
    }

    return createElement(Navigate, {
      to: defaultCoreViewPath,
      replace: true,
    });
  }

  return createElement(Fragment, null, children);
}

const DEFAULT_CORE_REDIRECT_ROUTE_ID = 'shell.default-core-redirect';
const DEFAULT_CORE_REDIRECT_PENDING_DETAIL = 'Selecting initial workspace route';
const DEFAULT_CORE_REDIRECT_PRESENTATION = createPendingRouteBootstrapPresentation(
  DEFAULT_CORE_REDIRECT_PENDING_DETAIL
);

function DefaultCoreRouteRedirect() {
  usePublishedRouteBootstrap(DEFAULT_CORE_REDIRECT_ROUTE_ID, DEFAULT_CORE_REDIRECT_PRESENTATION);
  const { defaultCoreViewPath } = useShellRuntime();

  return createElement(Navigate, { to: defaultCoreViewPath, replace: true });
}

function PublicRouteBootstrapBoundary({ children }: Readonly<{ children: ReactNode }>) {
  useEffect(() => {
    setBootstrapStepStatus({
      step: 'capabilities',
      status: 'complete',
      detail: 'Runtime capabilities are not required for this public route.',
    });
    setBootstrapStepStatus({
      step: 'health',
      status: 'complete',
      detail: 'Platform health is not required for this public route.',
    });
    setBootstrapStepStatus({
      step: 'route',
      status: 'complete',
      detail: 'Public route is ready.',
    });
    globalThis.setTimeout(() => {
      completeBootstrapScreen();
    }, 0);
  }, []);

  return createElement(Fragment, null, children);
}

function createStaticShellRouteHandle(routeLabel: string): AppRouteHandle {
  return {
    routeBootstrap: createStaticRouteBootstrapHandle({
      pendingDetail: `Preparing ${routeLabel} route`,
      readyDetail: `${routeLabel} is ready`,
    }),
  };
}

function withRouteBootstrapBoundary(
  routeId: string,
  routeHandle: AppRouteHandle,
  child: ReactNode
): ReactNode {
  const registration = getRouteBootstrapRegistration(routeId, routeHandle);
  if (registration?.routeBootstrap.mode !== 'static') {
    return child;
  }

  return createElement(StaticRouteBootstrapBoundary, {
    registration,
    children: child,
  });
}

function requireViewRouteHandle(view: ViewContribution): AppRouteHandle {
  if (view.handle) {
    return view.handle;
  }

  throw new Error(`View contribution ${view.id} must declare handle.routeBootstrap explicitly.`);
}

function createPluginRoute(
  routeId: string,
  pluginId: string,
  component: ComponentType,
  routeHandle: AppRouteHandle
): RouteObject['element'] {
  return createElement(
    Suspense,
    { fallback: createElement(PluginRouteFallback) },
    createElement(PluginAvailabilityGuard, {
      pluginId,
      children: withRouteBootstrapBoundary(routeId, routeHandle, createElement(component)),
    })
  );
}

export function createAppRoutes(): RouteObject[] {
  const routeViews = getRouteViews();
  const pluginRoutes = routeViews.map<RouteObject>((view) => {
    const routeHandle = requireViewRouteHandle(view);

    return {
      id: view.id,
      path: normalizeChildPath(view.path),
      element: createPluginRoute(view.id, view.pluginId, view.component, routeHandle),
      errorElement: createElement(AppRouteErrorBoundary),
      handle: routeHandle,
    };
  });
  const pluginRoutePaths = new Set(pluginRoutes.map((route) => route.path).filter(Boolean));
  const shellRoutes: RouteObject[] = [
    {
      id: 'shell.plugins',
      path: 'plugins',
      component: PluginsView,
      routeHandle: createStaticShellRouteHandle('Plugins'),
    },
    {
      id: 'shell.admin',
      path: 'admin',
      component: AdminView,
      routeHandle: createStaticShellRouteHandle('Admin'),
    },
  ]
    .filter((route) => !pluginRoutePaths.has(route.path))
    .map<RouteObject>((route) => ({
      id: route.id,
      path: route.path,
      handle: route.routeHandle,
      element: withRouteBootstrapBoundary(
        route.id,
        route.routeHandle,
        createElement(route.component)
      ),
    }));

  return [
    {
      path: '/',
      element: createElement(AuthRouteGate, { children: createElement(Root) }),
      errorElement: createElement(AppRouteErrorBoundary),
      children: [
        {
          id: DEFAULT_CORE_REDIRECT_ROUTE_ID,
          index: true,
          handle: {
            routeBootstrap: createPublishedRouteBootstrapHandle({
              pendingDetail: DEFAULT_CORE_REDIRECT_PENDING_DETAIL,
            }),
          },
          element: createElement(DefaultCoreRouteRedirect),
        },
        ...pluginRoutes,
        ...shellRoutes,
      ],
    },
    {
      path: '/login',
      element: createElement(PublicRouteBootstrapBoundary, {
        children: createElement(LoginView),
      }),
    },
  ];
}

export function createAppRouter() {
  return createBrowserRouter(createAppRoutes());
}
