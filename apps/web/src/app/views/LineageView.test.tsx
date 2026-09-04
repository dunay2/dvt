// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IWorkspaceGraphSnapshotQueryPort, WorkspaceGraphSnapshot } from '../ports/workspace';
import { AppServicesProvider } from '../services/AppServicesContext';
import { waitForReactQuery, withTestQueryClient } from '../../testing/reactQueryHarness';
import LineageView from './LineageView';

function buildGraphSnapshot(overrides?: {
  nodes?: WorkspaceGraphSnapshot['nodes'];
  edges?: WorkspaceGraphSnapshot['edges'];
}): WorkspaceGraphSnapshot {
  return {
    authoringAuthority: {
      kind: 'resolved',
      binding: {
        schemaVersion: 'canvas-authoring-authority-binding.v1',
        canvasId: 'main-canvas',
        authority: { kind: 'graph-draft' },
      },
    },
    nodes: overrides?.nodes ?? [
      {
        id: 'model.fct_orders',
        name: 'fct_orders',
        type: 'MODEL',
        package: 'analytics',
        path: 'models/fct_orders.sql',
        tags: [],
        status: 'success',
        dependencies: ['source.orders'],
        columns: [{ name: 'order_id', type: 'int', nullable: false }],
      },
      {
        id: 'source.orders',
        name: 'source_orders',
        type: 'SOURCE',
        package: 'analytics',
        path: 'models/source_orders.yml',
        tags: [],
        status: 'success',
        dependencies: [],
        columns: [{ name: 'order_id', type: 'int', nullable: false }],
      },
    ],
    edges: overrides?.edges ?? [
      {
        id: 'edge-1',
        source: 'source.orders',
        target: 'model.fct_orders',
        type: 'source',
      },
    ],
  };
}

function buildWorkspaceGraphSnapshotQueryPort(
  overrides?: Partial<IWorkspaceGraphSnapshotQueryPort>
): IWorkspaceGraphSnapshotQueryPort {
  return {
    getGraphSnapshot: async () => buildGraphSnapshot(),
    ...overrides,
  };
}

describe('LineageView', () => {
  let mounted: Awaited<ReturnType<typeof withTestQueryClient>> | null;

  beforeEach(() => {
    mounted = null;
    (
      globalThis as typeof globalThis & {
        ResizeObserver?: new (callback: ResizeObserverCallback) => ResizeObserver;
      }
    ).ResizeObserver = class ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    } as unknown as new (callback: ResizeObserverCallback) => ResizeObserver;
  });

  afterEach(async () => {
    if (mounted) {
      await mounted.cleanup();
    }
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('renders lineage graph and impact summary', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceGraphSnapshotQuery: buildWorkspaceGraphSnapshotQueryPort(),
        }}
      >
        <LineageView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_orders') === true, {
      description: 'lineage graph render',
    });

    expect(mounted.container.textContent).toContain('Lineage Analysis');
    expect(mounted.container.textContent).toContain('Impact Summary');
    expect(mounted.container.textContent).toContain('fct_orders');
  });

  it('preserves the route frame while lineage is loading', async () => {
    let resolveGraphSnapshot: ((value: ReturnType<typeof buildGraphSnapshot>) => void) | null =
      null;
    const graphSnapshotPromise = new Promise<ReturnType<typeof buildGraphSnapshot>>((resolve) => {
      resolveGraphSnapshot = resolve;
    });

    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceGraphSnapshotQuery: buildWorkspaceGraphSnapshotQueryPort({
            getGraphSnapshot: async () => graphSnapshotPromise,
          }),
        }}
      >
        <LineageView />
      </AppServicesProvider>
    );

    expect(mounted.container.textContent).toContain('Lineage Analysis');
    expect(mounted.container.textContent).toContain('Loading lineage');

    await act(async () => {
      resolveGraphSnapshot?.(buildGraphSnapshot());
      await graphSnapshotPromise;
    });
  });

  it('renders a governed empty state when no lineage focus is available', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceGraphSnapshotQuery: buildWorkspaceGraphSnapshotQueryPort({
            getGraphSnapshot: async () => buildGraphSnapshot({ nodes: [], edges: [] }),
          }),
        }}
      >
        <LineageView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('No lineage focus available') === true,
      {
        description: 'lineage empty state render',
      }
    );

    expect(mounted.container.textContent).toContain('Search for a model');
  });

  it('renders a governed error state when the graph snapshot fails', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceGraphSnapshotQuery: buildWorkspaceGraphSnapshotQueryPort({
            getGraphSnapshot: async () => {
              throw new Error('Graph snapshot unavailable');
            },
          }),
        }}
      >
        <LineageView />
      </AppServicesProvider>
    );

    await waitForReactQuery(
      () => mounted?.container.textContent?.includes('Lineage graph unavailable') === true,
      {
        description: 'lineage error state render',
      }
    );

    expect(mounted.container.textContent).toContain('Graph snapshot unavailable');
  });

  it('does not expose inferred column lineage from graph column-name metadata', async () => {
    mounted = await withTestQueryClient(
      <AppServicesProvider
        overrides={{
          ...createAppServicesTestOverrides(),
          workspaceGraphSnapshotQuery: buildWorkspaceGraphSnapshotQueryPort(),
        }}
      >
        <LineageView />
      </AppServicesProvider>
    );

    await waitForReactQuery(() => mounted?.container.textContent?.includes('fct_orders') === true, {
      description: 'lineage graph render without heuristic column mode',
    });

    expect(document.getElementById('column-level')).toBeNull();
    expect(mounted.container.textContent).not.toContain('source_orders.order_id');
    expect(mounted.container.textContent).not.toContain('fct_orders.order_id');
  });
});
