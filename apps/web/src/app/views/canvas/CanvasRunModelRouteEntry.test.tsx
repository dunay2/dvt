// @vitest-environment jsdom
/** Prove retained Run destinations admit once and preserve rejection under effect replay. */
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it, vi, type Mock } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasRunModelRouteEntry } from './CanvasRunModelRouteEntry';

const session = vi.hoisted(() => {
  const scope = { tenantId: 'tenant', projectId: 'project', environmentId: 'dev' };
  return { subscribeWorkspaceScope: () => () => {}, getWorkspaceScopeSnapshot: () => scope };
});
vi.mock('../../services/AppServicesContext', () => ({ useSessionContext: () => session }));
let root: Root | undefined;
let container: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

async function open({ project = 'project', inspect = vi.fn(async () => true) } = {}): Promise<{
  router: ReturnType<typeof createMemoryRouter>;
  inspect: Mock<() => Promise<boolean>>;
  openModel: Mock;
}> {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  const node = {
    id: 'model.orders',
    role: 'transform',
    metadata: { authority: 'dbt-project-files', resourceType: 'model' },
  } as CanonicalNode;
  const openModel = vi.fn();
  const router = createMemoryRouter(
    [
      {
        path: '/canvas',
        element: (
          <CanvasRunModelRouteEntry
            canvasId="analytics"
            state="ready"
            nodes={[node]}
            modelIds={new Set()}
            openModel={openModel}
            inspect={inspect}
          />
        ),
      },
      { path: '/runs/:runId', element: <p>Retained run</p> },
    ],
    {
      initialEntries: [
        '/canvas?authority=dbt-project-files&canvasId=analytics&projectRoot=dbt&fromRun=run-A&model=model.orders&tenant=tenant&project=' +
          project +
          '&environment=dev',
      ],
    }
  );
  await act(async () =>
    root!.render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>
    )
  );
  return { router, inspect, openModel };
}

it('returns to the same Run when the existing inspector rejects a StrictMode entry', async () => {
  const mounted = await open({ inspect: vi.fn(async () => false) });
  expect(mounted.inspect).toHaveBeenCalledExactlyOnceWith('model.orders', 'code');
  expect(mounted.router.state.location).toMatchObject({
    pathname: '/runs/run-A',
    search: '?tab=models&unavailable=1',
  });
});

it('admits the exact model once and never substitutes the active model', async () => {
  const mounted = await open();
  expect(mounted.inspect).toHaveBeenCalledExactlyOnceWith('model.orders', 'code');
  expect(mounted.openModel).not.toHaveBeenCalled();
});

it('rejects a cross-project destination before any model command', async () => {
  const mounted = await open({ project: 'other' });
  expect(mounted.inspect).not.toHaveBeenCalled();
  expect(mounted.openModel).not.toHaveBeenCalled();
  expect(mounted.router.state.location.pathname).toBe('/runs/run-A');
});
