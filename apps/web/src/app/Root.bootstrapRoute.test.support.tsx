import { useEffect } from 'react';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router';
import { vi } from 'vitest';

import type { PlatformHealthCapabilityApi } from '../capabilities/platform-health';
import AppRouteErrorBoundary from './AppRouteErrorBoundary';
import StaticRouteBootstrapBoundary from './bootstrap/StaticRouteBootstrapBoundary';
import {
  createCompleteRouteBootstrapPresentation,
  createPublishedRouteBootstrapHandle,
  createStaticRouteBootstrapHandle,
  type RouteBootstrapPresentation,
} from './bootstrap/routeBootstrapContract';
import {
  publishRouteBootstrapPresentation,
  resetRouteBootstrapPresentation,
} from './bootstrap/routeBootstrapRegistry';
import { getRouteBootstrapRegistration } from './bootstrap/routeBootstrapRegistration';
import type { CapabilitiesPort } from './ports/capabilities';
import { RootShell } from './Root';
import { AppServicesProvider } from './services/AppServicesContext';
import { CANVAS_ROUTE_BOOTSTRAP_HANDLE } from './views/canvas/canvasDraftPresentationStore';

const DEFAULT_CAPABILITIES = {
  apiVersion: '1.0.0',
  minFrontendVersion: '1.0.0',
  plugins: {},
};

export const CANVAS_ROUTE_BOOTSTRAP_REGISTRATION = getRouteBootstrapRegistration('dbt.canvas', {
  routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE,
})!;

function createDefaultCapabilitiesPort(): CapabilitiesPort {
  return {
    loadCapabilities: vi.fn().mockResolvedValue(DEFAULT_CAPABILITIES),
  };
}

function createStaticRootChildRoute(args: {
  id: string;
  path?: string;
  index?: true;
  label: string;
  elementText: string;
}): RouteObject {
  const handle = {
    routeBootstrap: createStaticRouteBootstrapHandle({
      pendingDetail: `Preparing ${args.label} route`,
      readyDetail: `${args.label} is ready`,
    }),
  };

  return {
    id: args.id,
    path: args.path,
    index: args.index,
    handle,
    element: (
      <StaticRouteBootstrapBoundary
        registration={getRouteBootstrapRegistration(args.id, handle)}
      >
        <div>{args.elementText}</div>
      </StaticRouteBootstrapBoundary>
    ),
  };
}

function createPublishedRootChildRoute(args: {
  id: string;
  path: string;
  pendingDetail: string;
  readyDetail: string;
  elementText: string;
}): RouteObject {
  const handle = {
    routeBootstrap: createPublishedRouteBootstrapHandle({
      pendingDetail: args.pendingDetail,
    }),
  };

  return {
    id: args.id,
    path: args.path,
    handle,
    element: (
      <RouteBootstrapProbe
        registration={getRouteBootstrapRegistration(args.id, handle)!}
        presentationState={createCompleteRouteBootstrapPresentation(args.readyDetail)}
      >
        <div>{args.elementText}</div>
      </RouteBootstrapProbe>
    ),
  };
}

export function RouteBootstrapProbe({
  registration,
  presentationState,
  children,
}: {
  registration: NonNullable<ReturnType<typeof getRouteBootstrapRegistration>>;
  presentationState: RouteBootstrapPresentation;
  children: JSX.Element;
}): JSX.Element {
  useEffect(() => {
    publishRouteBootstrapPresentation(registration, presentationState);

    return () => {
      resetRouteBootstrapPresentation(registration);
    };
  }, [presentationState.canComplete, presentationState.detail, presentationState.status, registration]);

  return children;
}

export function createRootShellNode(
  capability: PlatformHealthCapabilityApi,
  initialEntries: string[] = ['/'],
  capabilitiesPort?: CapabilitiesPort,
  canvasRouteElement: JSX.Element = <div>Canvas route</div>
): JSX.Element {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootShell platformHealthCapability={capability} />,
        children: [
          createStaticRootChildRoute({
            id: 'test.workspace',
            index: true,
            label: 'workspace',
            elementText: 'Workspace route',
          }),
          {
            id: 'dbt.canvas',
            path: 'canvas',
            handle: { routeBootstrap: CANVAS_ROUTE_BOOTSTRAP_HANDLE },
            element: canvasRouteElement,
          },
          createStaticRootChildRoute({
            id: 'test.plugins',
            path: 'plugins',
            label: 'Plugins',
            elementText: 'Plugins route',
          }),
          createStaticRootChildRoute({
            id: 'shell.admin',
            path: 'admin',
            label: 'Admin',
            elementText: 'Admin route',
          }),
          createPublishedRootChildRoute({
            id: 'test.runs',
            path: 'runs',
            pendingDetail: 'Preparing Runs route',
            readyDetail: 'Runs route is ready',
            elementText: 'Runs route',
          }),
          createPublishedRootChildRoute({
            id: 'test.run-detail',
            path: 'runs/:runId',
            pendingDetail: 'Preparing Run detail route',
            readyDetail: 'Run detail route is ready',
            elementText: 'Run detail route',
          }),
        ],
      },
    ],
    { initialEntries }
  );

  return (
    <AppServicesProvider
      overrides={{ mode: 'mock', capabilitiesPort: capabilitiesPort ?? createDefaultCapabilitiesPort() }}
    >
      <RouterProvider router={router} />
    </AppServicesProvider>
  );
}

export function createBrokenRootShellNode(
  capability: PlatformHealthCapabilityApi,
  initialEntries: string[] = ['/broken']
): JSX.Element {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootShell platformHealthCapability={capability} />,
        errorElement: <AppRouteErrorBoundary />,
        children: [{ id: 'broken.route', path: 'broken', element: <div>Broken route</div> }],
      },
    ],
    { initialEntries }
  );

  return (
    <AppServicesProvider overrides={{ mode: 'mock', capabilitiesPort: createDefaultCapabilitiesPort() }}>
      <RouterProvider router={router} />
    </AppServicesProvider>
  );
}
