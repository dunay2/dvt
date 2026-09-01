// @vitest-environment jsdom

/** Owned concern: prove CanvasShell keeps the graph as the base work surface. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import type { ConnectedSourceRef } from '@dvt/contracts';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { CanvasShellProps } from './canvasShell.types';
import type { SourceDataSample } from '../../ports/workspace';
import { canvasViewCopy } from './copy';
import { resolveWorkspaceFilePath } from './CanvasShell';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanonicalNode } from '../../types/canonical';
import { dvtGraphNodeCardStrategy } from '../../plugins/dvt/dvtGraphNodeCardStrategy';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';

describe('CanvasShell graph base surface', () => {
  let container: HTMLDivElement;
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    container = harness.container;
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
  });

  it('does not fabricate a dbt model workspace path when the draft omitted it', () => {
    expect(
      resolveWorkspaceFilePath({
        name: 'Model 1',
        pluginKind: 'dbt:model',
        status: 'idle',
      })
    ).toBeNull();
  });

  it('routes generated dbt model code to the node authoring surface', async () => {
    const onInspectNode = vi.fn();
    await renderShell({
      graph: {
        nodesWithImpact: [
          {
            id: 'dbt-model-1',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Model 1',
              pluginKind: 'dbt:model',
              status: 'idle',
              presentationTruth: {
                code: {
                  kind: 'generated',
                  content: 'select * from source_1',
                  path: 'models/model_1.sql',
                  language: 'sql',
                },
              },
              onInspectNode,
            },
          },
        ],
      },
    });

    const forwardedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        | Array<{
            data: {
              canOpenNodeCode?: boolean;
              onInspectNode?: (nodeId: string, preferredTabId?: string) => void;
            };
          }>
        | undefined
    )?.[0];
    forwardedNode?.data.onInspectNode?.('dbt-model-1', 'code');

    expect(forwardedNode?.data.canOpenNodeCode).toBe(true);
    expect(onInspectNode).toHaveBeenCalledWith('dbt-model-1', 'code');
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
  });

  it('routes canonical Transform code to the node inspector', async () => {
    const onInspectNode = vi.fn();
    await renderShell({
      graph: {
        nodesWithImpact: [
          {
            id: 'transform-1',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Transform 1',
              pluginKind: 'dvt:transform',
              status: 'idle',
              presentationTruth: {
                code: {
                  kind: 'canonical',
                  content: '{"schemaVersion":"dvt-substrait-semantic-document.v1"}',
                  language: 'json',
                  schemaVersion: 'dvt-substrait-semantic-document.v1',
                  digest: 'a'.repeat(64),
                },
              },
              onInspectNode,
            },
          },
        ],
      },
    });

    const forwardedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        | Array<{
            data: {
              canOpenNodeCode?: boolean;
              onInspectNode?: (nodeId: string, preferredTabId?: string) => void;
            };
          }>
        | undefined
    )?.[0];
    forwardedNode?.data.onInspectNode?.('transform-1', 'code');

    expect(forwardedNode?.data.canOpenNodeCode).toBe(true);
    expect(onInspectNode).toHaveBeenCalledWith('transform-1', 'code');
  });

  it('keeps workspace-file Code inside the preserved node Properties context', async () => {
    const onHideInspector = vi.fn();
    const onShowInspector = vi.fn();
    const onInspectNode = vi.fn();
    await renderShell({
      graph: {
        nodesWithImpact: [
          {
            id: 'dbt-model-1',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Model 1',
              pluginKind: 'dbt:model',
              status: 'idle',
              path: 'models/model_1.sql',
              onInspectNode,
            },
          },
        ],
      },
      chromeCommands: { onHideInspector, onShowInspector },
    });

    const forwardedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        | Array<{
            data: {
              canOpenNodeCode?: boolean;
              onInspectNode?: (nodeId: string, preferredTabId?: string) => void;
            };
          }>
        | undefined
    )?.[0];
    await act(async () => {
      forwardedNode?.data.onInspectNode?.('dbt-model-1', 'code');
    });

    expect(forwardedNode?.data.canOpenNodeCode).toBe(true);
    expect(onInspectNode).toHaveBeenCalledWith('dbt-model-1', 'code');
    expect(onHideInspector).not.toHaveBeenCalled();
    expect(onShowInspector).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="canvas-contextual-workbench-close"]')).toBeNull();
  });

  it('opens a bounded source sample in the bottom drawer from an imported source node', async () => {
    const previewSourceObjectRows = vi.fn().mockResolvedValue({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-08-17T10:00:00.000Z',
    });
    await renderShell({
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
      graph: {
        nodesWithImpact: [
          {
            id: 'source-orders',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'orders',
              status: 'idle',
              metadata: {
                connectedSourceRef: {
                  schemaVersion: 'connected-source-ref.v1',
                  connectionRef: {
                    schemaVersion: 'connection-ref.v1',
                    connectionId: 'postgresql-local',
                    provider: 'postgres',
                  },
                  sourceObjectId: 'relation/dvt/public/orders',
                },
              },
            },
          },
        ],
      },
    });

    const forwardedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        | Array<{
            data: {
              onOpenSourceDataSample?: (nodeId: string) => void;
              sourceDataSampleInteractionLabel?: string;
            };
          }>
        | undefined
    )?.[0];
    await act(async () => {
      forwardedNode?.data.onOpenSourceDataSample?.('source-orders');
      await Promise.resolve();
    });

    expect(previewSourceObjectRows).toHaveBeenCalledWith({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
      limit: 20,
    });
    expect(forwardedNode?.data.sourceDataSampleInteractionLabel).toContain('Double-click');
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'data',
      contribution: {
        dataSample: {
          status: 'ready',
          nodeName: 'orders',
        },
      },
    });
    expect(useUiLayoutStore.getState()).toMatchObject({
      bottomDrawerVisible: true,
      bottomDrawerHeight: 300,
    });
  });

  it('projects a completed run result onto its exact sink and opens the existing data drawer', async () => {
    const getRunMaterializationSample = vi.fn().mockResolvedValue({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/sink_1',
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-08-18T10:00:02.000Z',
    });
    const sinkNodeData = {
      name: 'Sink 1',
      status: 'idle',
      role: 'output',
      pluginId: 'dvt',
      pluginKind: 'dvt:sink',
      metadata: {
        config: {
          schema: 'public',
          table: 'sink_1',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    } satisfies DbtNodeData;
    const canonicalSink = {
      id: 'sink-1',
      name: sinkNodeData.name,
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: sinkNodeData.metadata,
    } satisfies CanonicalNode;
    const draftSinkNode = projectCanvasNodeAccessibleHealth({
      node: {
        id: canonicalSink.id,
        type: 'dbtNode',
        ariaLabel: 'Sink 1, Output',
        position: { x: 0, y: 0 },
        data: sinkNodeData,
      },
      canonicalNode: canonicalSink,
      data: sinkNodeData,
      graphNodeCardStrategies: [dvtGraphNodeCardStrategy],
    });
    expect(draftSinkNode.ariaLabel).toBe('Sink 1, Output, Draft');

    await renderShell({
      panels: { activeRunId: 'run-1' },
      runSnapshot: {
        runId: 'run-1',
        status: 'completed',
        materialization: {
          executor: 'postgres',
          environmentId: 'dev',
          sinkTable: 'public.sink_1',
          rowsWritten: 118,
          startedAt: '2026-08-18T10:00:00.000Z',
          completedAt: '2026-08-18T10:00:01.500Z',
          durationMs: 1_500,
        },
      },
      runMaterializationSampleQuery: getRunMaterializationSample,
      graph: {
        nodesWithImpact: [draftSinkNode],
      },
    } as unknown as CanvasShellPropsOverrides);

    const forwardedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        | Array<{
            id: string;
            ariaLabel?: string;
            data: {
              rows?: number;
              durationMs?: number;
              lastRunAt?: string;
              runStatusByNodeId?: ReadonlyMap<string, string>;
              onOpenSourceDataSample?: (nodeId: string) => void;
            };
          }>
        | undefined
    )?.[0];
    await act(async () => {
      forwardedNode?.data.onOpenSourceDataSample?.('sink-1');
      await Promise.resolve();
    });

    expect(forwardedNode?.data).toMatchObject({
      rows: 118,
      durationMs: 1_500,
      lastRunAt: '2026-08-18T10:00:01.500Z',
    });
    expect(forwardedNode?.data.runStatusByNodeId?.get('sink-1')).toBe('completed');
    expect(forwardedNode?.ariaLabel).toBe('Sink 1, Output, Completed');
    expect(getRunMaterializationSample).toHaveBeenCalledWith('run-1', 20);
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'data',
      contribution: {
        dataSample: {
          status: 'ready',
          nodeName: 'Sink 1',
        },
      },
    });
  });

  it('ignores a stale sample response after the user opens another source', async () => {
    const resolvers = new Map<string, (sample: SourceDataSample) => void>();
    const previewSourceObjectRows = vi.fn(
      ({ objectId }: { objectId: string }) =>
        new Promise<SourceDataSample>((resolve) => {
          resolvers.set(objectId, resolve);
        })
    );
    const connectedSourceRef = (table: string): ConnectedSourceRef => ({
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgresql-local',
        provider: 'postgres',
      },
      sourceObjectId: `relation/dvt/public/${table}`,
    });
    await renderShell({
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
      graph: {
        nodesWithImpact: ['orders', 'customers'].map((name) => ({
          id: `source-${name}`,
          type: 'dbtNode',
          position: { x: 0, y: 0 },
          data: {
            name,
            status: 'idle',
            metadata: { connectedSourceRef: connectedSourceRef(name) },
          },
        })),
      },
    });

    const forwardedNodes = getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{
      data: { onOpenSourceDataSample?: (nodeId: string) => void };
    }>;
    await act(async () => {
      forwardedNodes[0]?.data.onOpenSourceDataSample?.('source-orders');
      forwardedNodes[1]?.data.onOpenSourceDataSample?.('source-customers');
    });

    const sample = (table: string): SourceDataSample => ({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: `relation/dvt/public/${table}`,
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-08-17T10:00:00.000Z',
    });
    await act(async () => {
      resolvers.get('relation/dvt/public/customers')?.(sample('customers'));
      await Promise.resolve();
      resolvers.get('relation/dvt/public/orders')?.(sample('orders'));
      await Promise.resolve();
    });

    expect(useOperationalDrawerContributionStore.getState().contribution?.dataSample).toMatchObject(
      {
        status: 'ready',
        nodeName: 'customers',
        sample: { objectId: 'relation/dvt/public/customers' },
      }
    );
  });

  it('keeps plain node click out of the application shell command contract', async () => {
    const props = await renderShell();

    expect('onNodeClick' in props.graphCommands).toBe(false);
    expect('onSelectionChange' in props.graphCommands).toBe(false);
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('keeps host-owned tab chrome out of the graph base panel', async () => {
    await renderShell();

    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('does not mount a permanent workbench chrome row over the graph base surface', async () => {
    await renderShell();

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-workbench-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('keeps neutral canvas identity and draft status out of the graph surface', async () => {
    await renderShell({
      panels: {
        activeCanvas: {
          id: 'sales-canvas',
          title: 'Sales canvas',
          kind: 'dbt',
          environmentId: 'dev',
        },
      },
    });

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-draft-save-status"]')).toBeNull();
    expect(container.textContent).not.toContain('Sales canvas');
    expect(container.textContent).not.toContain(canvasViewCopy.draftSyncedLabel);
  });

  it('keeps the graph workbench fluid instead of forcing horizontal overflow on narrow viewports', async () => {
    await renderShell();

    const shellPanelGroup = container.querySelector('[data-slot="canvas-shell-panel-group"]');

    expect(shellPanelGroup).not.toBeNull();
    expect(shellPanelGroup?.getAttribute('id')).toBe('canvas-shell-horizontal-panels');
    expect(shellPanelGroup?.getAttribute('class')).toContain('min-w-0');
    expect(shellPanelGroup?.getAttribute('class')).not.toContain('min-w-[960px]');
  });

  it('keeps Canvas route commands hidden while the first canvas document is not created', async () => {
    await renderShell({
      chromeState: {
        routeState: 'needs_canvas',
      },
    });

    expect(container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
  });

  it('keeps governed center surfaces ahead of workbench unavailable panels', async () => {
    await renderShell({
      layout: {
        centerSurfaceMode: 'replace',
        centerSurface: <div data-testid="first-canvas-center-surface" />,
        contextualWorkbench: {
          id: 'project-code',
          title: 'Project code',
          closeLabel: 'Cerrar',
          panel: <div data-testid="code-workbench-panel" />,
          requestClose: vi.fn(async () => true),
        },
      },
      chromeState: {
        routeState: 'needs_canvas',
      },
    });

    expect(container.querySelector('[data-testid="first-canvas-center-surface"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
  });

  it('renders a movable contextual workbench over the graph instead of replacing it', async () => {
    await renderShell({
      layout: {
        contextualWorkbench: {
          id: 'project-code',
          title: 'Project code',
          closeLabel: 'Cerrar',
          moveLabel: 'Mover código',
          description: 'Workspace files in the active project scope.',
          panel: <div data-testid="code-workbench-panel" />,
          requestClose: vi.fn(async () => true),
        },
      },
    });

    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
    const baseSurface = container.querySelector(
      '[data-slot="canvas-contextual-workbench-base-surface"]'
    );
    expect(baseSurface?.classList).toContain('flex');
    expect(baseSurface?.classList).toContain('min-h-0');
    const workbench = container.querySelector('[data-slot="canvas-contextual-workbench"]');
    expect(workbench).not.toBeNull();
    expect(workbench?.classList).toContain('w-full');
    expect(workbench?.classList).toContain('min-w-0');
    expect(workbench?.classList).toContain('max-w-full');
    expect(workbench?.classList).not.toContain('min-w-96');
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
    const overlay = container.querySelector<HTMLElement>(
      '[data-slot="canvas-contextual-workbench-overlay"]'
    );
    const dragHandle = container.querySelector<HTMLElement>(
      '[data-slot="canvas-contextual-workbench-drag-handle"]'
    );
    expect(overlay).not.toBeNull();
    expect(dragHandle?.getAttribute('role')).toBe('button');
    expect(dragHandle?.getAttribute('aria-label')).toBe('Mover código');
    expect(
      container.querySelector('[data-slot="canvas-contextual-workbench-description"]')
    ).toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-contextual-workbench-help"]')
        ?.getAttribute('aria-label')
    ).toBe('Workspace files in the active project scope.');

    const topBeforeMove = overlay?.style.top;
    await act(async () => {
      fireEvent.keyDown(dragHandle!, { key: 'ArrowDown' });
    });
    expect(overlay?.style.top).not.toBe(topBeforeMove);
    const closeButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-contextual-workbench-close"]'
    );
    expect(closeButton?.textContent).toBe('Cerrar');
    expect(closeButton?.getAttribute('aria-label')).toBe('Cerrar: Project code');
  });

  it('keeps an authority-owned workbench ahead of stale generic Canvas Code state', async () => {
    useCanvasInteractionStore.setState({
      contextualWorkbenchId: 'project-code',
      contextualWorkbenchOwnerKey: 'dbt-contextual-canvas:sales-canvas',
    });

    await renderShell({
      layout: {
        contextualWorkbench: {
          id: 'project-code',
          title: 'Orders project code',
          closeLabel: 'Cerrar',
          panel: <div data-testid="dbt-project-file-code-panel" />,
          requestClose: vi.fn(async () => true),
        },
      },
    });

    expect(container.querySelector('[data-testid="dbt-project-file-code-panel"]')).not.toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-contextual-workbench-close"]')
        ?.getAttribute('aria-label')
    ).toBe('Cerrar: Orders project code');
  });
});
