// @vitest-environment jsdom

/** Owned concern: prove CanvasShell keeps the graph as the base work surface. */
import { asIsoUtcString, type ConnectedSourceRef } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { SourceDataSample } from '../../ports/workspace';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import { canvasViewCopy } from './copy';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanonicalNode } from '../../types/canonical';
import { dvtGraphNodeCardStrategy } from '../../plugins/dvt/dvtGraphNodeCardStrategy';
import { sharedSourceModelGraphNodeCardStrategy } from '../../plugins/graph/sharedSourceModelGraphNodeCardStrategy';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';
import { createRunPublicationSnapshot } from '../runs/test/runPublicationFixture';
import styles from './CanvasShell.module.css';
import { registerCodeWorkspaceLifecycleCases } from './CanvasShell.codeWorkspaceLifecycle.test-cases';
import {
  createGraphSurfaceTestContext,
  requireGraphShellElement,
  type CanvasShellGraphSurfaceTestContext,
} from './CanvasShell.graphSurface.test-support';

describe('CanvasShell graph base surface', () => {
  let context: CanvasShellGraphSurfaceTestContext;

  beforeEach(() => {
    // DOM capability only: jsdom cannot observe the real Tooltip's geometry.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    context = createGraphSurfaceTestContext(createCanvasShellHarness());
  });

  afterEach(() => {
    context.unmountShell();
    vi.unstubAllGlobals();
  });

  it('forwards catalogue inspection without placing an instance or changing the retained viewport', async () => {
    const onInspectNode = vi.fn();
    const props = await context.renderShell({ graphCommands: { onInspectNode } });
    const viewport = context.container.querySelector('[data-testid="canvas-viewport"]');
    const request = { kind: 'canonical-node', nodeId: 'registered-model' } as const;
    const inspect = getCanvasShellState().canvasViewportProps
      ?.onInspectNode as typeof onInspectNode;
    await act(async () => {
      await inspect(request);
    });
    expect(onInspectNode).toHaveBeenCalledExactlyOnceWith(request);
    expect(props.graphCommands.onDrop).not.toHaveBeenCalled();
    expect(props.panels.inspectorAuthoring.onApplyNodeDraft).not.toHaveBeenCalled();
    expect(props.graph.nodesWithImpact).toEqual([]);
    expect(context.container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
  });
  registerCodeWorkspaceLifecycleCases(() => context);

  it('keeps workspace-file Code inside the preserved node Properties context', async () => {
    const onHideInspector = vi.fn();
    const onShowInspector = vi.fn();
    const onInspectNode = vi.fn();
    await context.renderShell({
      graph: {
        nodesWithImpact: [
          {
            id: 'dbt-model-1',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Model 1',
              pluginKind: 'dvt:transform',
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
    expect(
      context.container.querySelector('[data-slot="canvas-contextual-workbench-close"]')
    ).toBeNull();
  });

  it.each([false, true])(
    'opens a bounded source preview and explicit errors (focus mode: %s)',
    async (focusMode) => {
      useUiLayoutStore.setState({ focusMode, bottomDrawerVisible: false });
      const previewSourceObjectRows = vi.fn().mockResolvedValue({
        contractVersion: 1,
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        columns: [{ name: 'order_id', type: 'integer', nullable: false }],
        rows: [{ values: ['1'] }],
        limit: 20,
        truncated: false,
        provenance: {
          mode: 'live' as const,
          sourceRefs: [
            {
              schemaVersion: 'connected-source-ref.v1' as const,
              connectionRef: {
                schemaVersion: 'connection-ref.v1' as const,
                connectionId: 'local-postgres-proof',
                provider: 'postgres',
              },
              sourceObjectId: 'relation/dvt/public/orders',
            },
          ],
          queriedAt: asIsoUtcString('2026-08-17T10:00:00.000Z'),
          limit: 20,
          navigation: 'bounded-first-page' as const,
        },
      });
      await context.renderShell({
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
                dataActionLabel?: string;
              };
            }>
          | undefined
      )?.[0];
      if (!forwardedNode) throw new Error('Expected required forwardedNode presentation');
      await act(async () => {
        forwardedNode.data.onOpenSourceDataSample?.('source-orders');
        await Promise.resolve();
      });

      expectSourcePreviewReady(forwardedNode, previewSourceObjectRows);
      previewSourceObjectRows.mockRejectedValueOnce(
        new WarehouseSourceDataSampleQueryError('source_object_not_found')
      );
      await act(async () => {
        forwardedNode.data.onOpenSourceDataSample?.('source-orders');
        await Promise.resolve();
      });
      expect(
        useOperationalDrawerContributionStore
          .getState()
          .contribution?.tabs.find((tab) => tab.id === 'data:source-orders')?.dataSample
      ).toMatchObject({ status: 'error', reason: 'source_object_not_found' });
    }
  );

  it('projects persisted sink evidence without offering the retired row query', async () => {
    const runSnapshot = createRunPublicationSnapshot({ runId: 'run-1' });
    const { target } = runSnapshot.publication!;
    const sinkNodeData = {
      name: 'Sink 1',
      status: 'idle',
      role: 'output',
      pluginId: 'dvt',
      pluginKind: 'dvt:sink',
      metadata: {
        config: {
          connectionRef: target.connectionRef,
          schema: target.schema,
          table: target.relation,
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
      graphNodeCardStrategies: [sharedSourceModelGraphNodeCardStrategy, dvtGraphNodeCardStrategy],
    });
    expect(draftSinkNode.ariaLabel).toBe('Sink 1, Output, Draft');

    await context.renderShell({
      panels: { activeRunId: 'run-1' },
      runSnapshot,
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
    if (!forwardedNode) throw new Error('Expected required forwardedNode presentation');
    await act(async () => {
      forwardedNode.data.onOpenSourceDataSample?.('sink-1');
      await Promise.resolve();
    });

    expect(forwardedNode.data).toMatchObject({
      rows: 3,
      durationMs: 1_000,
      lastRunAt: '2026-09-15T10:00:02.000Z',
    });
    expect(forwardedNode.data.runStatusByNodeId?.get('sink-1')).toBe('completed');
    expect(forwardedNode.ariaLabel).toBe('Sink 1, Output, Completed');
    expect(forwardedNode.data.onOpenSourceDataSample).toBeUndefined();
    const sinkDataState = useOperationalDrawerContributionStore.getState();
    expect(
      sinkDataState.contribution?.tabs.find((tab) => tab.id === 'data:sink-1')
    ).toBeUndefined();
  });

  it('keeps both source samples when their responses finish out of order', async () => {
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
    await context.renderShell({
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
      provenance: {
        mode: 'live',
        sourceRefs: [connectedSourceRef(table)],
        queriedAt: asIsoUtcString('2026-08-17T10:00:00.000Z'),
        limit: 20,
        navigation: 'bounded-first-page',
      },
    });
    await resolveSourceSamples(resolvers, sample);

    const dataState = useOperationalDrawerContributionStore.getState();
    expect(dataState.activeTab).toBe('data:source-customers');
    expect(
      dataState.contribution?.tabs.find((tab) => tab.id === 'data:source-orders')
    ).toMatchObject({
      dataSample: {
        status: 'ready',
        nodeName: 'orders',
        sample: { objectId: 'relation/dvt/public/orders' },
      },
    });
    expect(
      dataState.contribution?.tabs.find((tab) => tab.id === 'data:source-customers')
    ).toMatchObject({
      dataSample: {
        status: 'ready',
        nodeName: 'customers',
        sample: { objectId: 'relation/dvt/public/customers' },
      },
    });
  });

  it('keeps plain node click out of the application shell command contract', async () => {
    const props = await context.renderShell();

    expect('onNodeClick' in props.graphCommands).toBe(false);
    expect('onSelectionChange' in props.graphCommands).toBe(false);
    expect(context.container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('does not mount a permanent workbench chrome row over the graph base surface', async () => {
    await context.renderShell();

    expect(context.container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(context.container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(
      context.container.querySelector('[data-testid="canvas-workbench-tab-strip"]')
    ).toBeNull();
    expect(context.container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
    expect(context.container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('keeps neutral canvas identity and draft status out of the graph surface', async () => {
    await context.renderShell({
      panels: {
        activeCanvas: {
          id: 'sales-canvas',
          title: 'Sales canvas',
          kind: 'dbt',
          environmentId: 'dev',
        },
      },
    });

    expect(context.container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(
      context.container.querySelector('[data-slot="canvas-active-canvas-identity"]')
    ).toBeNull();
    expect(context.container.querySelector('[data-slot="canvas-draft-save-status"]')).toBeNull();
    expect(context.container.textContent).not.toContain('Sales canvas');
    expect(context.container.textContent).not.toContain(canvasViewCopy.draftSyncedLabel);
  });

  it('attaches the shell stylesheet to the stable horizontal panel group', async () => {
    await context.renderShell();

    const shellPanelGroup = context.container.querySelector(
      '[data-slot="canvas-shell-panel-group"]'
    );

    expect(shellPanelGroup).not.toBeNull();
    expect(shellPanelGroup?.getAttribute('id')).toBe('canvas-shell-horizontal-panels');
    expect(Array.from(shellPanelGroup?.classList ?? [])).toContain(styles.workspace);
  });

  it('keeps Canvas route commands hidden while the first canvas document is not created', async () => {
    await context.renderShell({
      chromeState: {
        routeState: 'needs_canvas',
      },
    });

    expect(context.container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
  });

  it('keeps governed center surfaces ahead of workbench unavailable panels', async () => {
    await context.renderShell({
      panels: { activeCanvasId: null, activeCanvas: null },
      layout: {
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

    expect(
      context.container.querySelector('[data-testid="first-canvas-center-surface"]')
    ).not.toBeNull();
    expect(context.container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
  });

  it('retains the movable presentation for other contextual workbenches', async () => {
    await context.renderShell({
      layout: {
        contextualWorkbench: {
          id: 'output-expression',
          title: 'Project code',
          closeLabel: 'Cerrar',
          moveLabel: 'Mover código',
          description: 'Workspace files in the active project scope.',
          panel: <div data-testid="code-workbench-panel" />,
          requestClose: vi.fn(async () => true),
        },
      },
    });

    expectMovableWorkbenchFrame(context.container);
    const { overlay, dragHandle } = expectWorkbenchMovementControls(context.container);
    const topBeforeMove = overlay.style.top;
    await act(async () => {
      fireEvent.keyDown(dragHandle!, { key: 'ArrowDown' });
    });
    expect(overlay.style.top).not.toBe(topBeforeMove);
    const closeButton = requireGraphShellElement(
      context.container.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-contextual-workbench-close"]'
      ),
      'closeButton'
    );

    expect(closeButton.textContent).toBe('Cerrar');
    expect(closeButton.getAttribute('aria-label')).toBe('Cerrar: Project code');
  });

  it('keeps an authority-owned workbench ahead of stale generic Canvas Code state', async () => {
    useCanvasInteractionStore.setState({
      contextualWorkbenchId: 'project-code',
      contextualWorkbenchOwnerKey: 'dbt-contextual-canvas:sales-canvas',
    });

    await context.renderShell({
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
    await act(async () => {
      fireEvent.click(context.container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    expect(
      context.container.querySelector('[data-testid="dbt-project-file-code-panel"]')
    ).not.toBeNull();
    expect(context.container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
    expect(
      context.container.querySelector('[data-slot="canvas-contextual-workbench-overlay"]')
    ).toBeNull();
    expect(
      context.container.querySelector('[data-testid="canvas-viewport"]')?.closest('[inert]')
    ).not.toBeNull();
  });

  function expectMovableWorkbenchFrame(container: HTMLElement): void {
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(true);
    const baseSurface = requireGraphShellElement(
      container.querySelector('[data-slot="canvas-contextual-workbench-base-surface"]'),
      'baseSurface'
    );

    expect(baseSurface.classList).toContain('flex');
    expect(baseSurface.classList).toContain('min-h-0');
    const workbench = requireGraphShellElement(
      container.querySelector('[data-slot="canvas-contextual-workbench"]'),
      'workbench'
    );

    expect(workbench).not.toBeNull();
    expect(workbench.classList).toContain('w-full');
    expect(workbench.classList).toContain('min-w-0');
    expect(workbench.classList).toContain('max-w-full');
    expect(workbench.classList).not.toContain('min-w-96');
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
  }

  function expectWorkbenchMovementControls(container: HTMLElement): {
    overlay: HTMLElement;
    dragHandle: HTMLElement;
  } {
    const overlay = requireGraphShellElement(
      container.querySelector<HTMLElement>('[data-slot="canvas-contextual-workbench-overlay"]'),
      'overlay'
    );

    const dragHandle = requireGraphShellElement(
      container.querySelector<HTMLElement>('[data-slot="canvas-contextual-workbench-drag-handle"]'),
      'dragHandle'
    );

    expect(overlay).not.toBeNull();
    expect(dragHandle.getAttribute('role')).toBe('button');
    expect(dragHandle.getAttribute('aria-label')).toBe('Mover código');
    expect(
      container.querySelector('[data-slot="canvas-contextual-workbench-description"]')
    ).toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-contextual-workbench-help"]')
        ?.getAttribute('aria-label')
    ).toBe('Workspace files in the active project scope.');

    return { overlay, dragHandle };
  }

  function expectSourcePreviewReady(
    forwardedNode: { data: { dataActionLabel?: string } },
    previewSourceObjectRows: ReturnType<typeof vi.fn>
  ): void {
    expect(previewSourceObjectRows).toHaveBeenCalledWith({
      connectionId: 'postgresql-local',
      objectId: 'relation/dvt/public/orders',
      limit: 20,
    });
    expect(forwardedNode.data.dataActionLabel).toBe('Preview');
    const sourceDataState = useOperationalDrawerContributionStore.getState();
    expect(sourceDataState.activeTab).toBe('data:source-orders');
    expect(
      sourceDataState.contribution?.tabs.find((tab) => tab.id === 'data:source-orders')
    ).toMatchObject({
      dataSample: { status: 'ready', nodeName: 'orders' },
    });
    expect(useUiLayoutStore.getState()).toMatchObject({
      focusMode: false,
      bottomDrawerVisible: true,
      bottomDrawerHeight: 300,
    });
    expect(
      useOperationalDrawerContributionStore
        .getState()
        .contribution?.tabs.find((tab) => tab.id === 'data:source-orders')?.dataSample
    ).toMatchObject({ status: 'ready', sample: { rows: [{ values: ['1'] }] } });
  }

  async function resolveSourceSamples(
    resolvers: ReadonlyMap<string, (sample: SourceDataSample) => void>,
    sample: (table: string) => SourceDataSample
  ): Promise<void> {
    await act(async () => {
      resolvers.get('relation/dvt/public/customers')?.(sample('customers'));
      await Promise.resolve();
      resolvers.get('relation/dvt/public/orders')?.(sample('orders'));
      await Promise.resolve();
    });
  }
});
