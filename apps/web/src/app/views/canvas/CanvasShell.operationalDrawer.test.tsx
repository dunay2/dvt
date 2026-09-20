// @vitest-environment jsdom

/** Owned concern: prove CanvasShell publishes Canvas operations into the bottom drawer. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';
import { canvasViewCopy } from './copy';
import { buildSemanticWorkbenchFixture } from '../../labs/semanticWorkbenchFixture';
import type { SourceDataSample } from '../../ports/workspace';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import {
  buildCanvasDependencyEdgeData,
  readCanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';

describe('CanvasShell operational drawer registration', () => {
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
  });

  it('registers Canvas operational drawer tabs from the surface strategy', async () => {
    const onRun = vi.fn();
    const runControls = {
      runId: 'run-42',
      availability: {
        cancel: { available: true as const },
        recover: { available: false as const, reason: 'run_active' as const },
      },
      activity: null,
      outcome: null,
      failure: null,
      onCancel: vi.fn(),
      onRecover: vi.fn(),
    };
    await renderShell({
      panels: {
        activeRunId: 'run-42',
      },
      runControls,
      chromeCommands: {
        onRun,
      },
    });

    const contribution = useOperationalDrawerContributionStore.getState().contribution;

    expect(contribution).toMatchObject({
      source: 'canvas',
      title: 'Canvas operations',
      tabs: [
        { id: 'log', label: 'Log' },
        { id: 'problems', label: 'Problems' },
        { id: 'runs', label: 'Runs' },
        { id: 'preview', label: 'Preview' },
      ],
      runs: {
        activeRunId: 'run-42',
        controls: runControls,
      },
      preview: {
        status: 'blocked',
        summary: canvasViewCopy.planStatusPreviewRequiredMessage,
      },
    });
    expect(contribution?.problems.items).toEqual([
      expect.objectContaining({
        id: 'plan_integrity',
        severity: 'warning',
        message: canvasViewCopy.planStatusPreviewRequiredMessage,
      }),
    ]);

    contribution?.runs.onStartRun();
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('opens the Model editor from the Model while edges stay plain dependencies', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    const position = { x: 320, y: 140 };
    const onApplyNodeDraft = vi.fn();
    const onInspectNode = vi.fn();
    const previewTransformRows = vi.fn(() => new Promise<never>(() => undefined));
    await renderShell({
      canvasTransformDataSampleQuery: { previewTransformRows },
      panels: {
        inspectorGraphNodes: [...fixture.sources, fixture.transform],
        inspectorGraphEdges: fixture.edges,
        inspectorAuthoring: { canEditNode: true, onApplyNodeDraft },
      },
      graph: {
        nodesWithImpact: [
          {
            id: fixture.transform.id,
            type: 'dbtNode',
            position,
            data: {
              ...fixture.transform,
              pluginKind: fixture.transform.kind,
              onInspectNode,
            },
          },
        ],
        edges: [
          {
            id: 'source-transform',
            source: fixture.sources[0]!.id,
            target: fixture.transform.id,
            data: buildCanvasDependencyEdgeData({
              sourceId: fixture.sources[0]!.id,
              targetId: fixture.transform.id,
            }),
          },
        ],
      },
    });

    const projectedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        Array<{ position: { x: number; y: number }; data: Record<string, unknown> }> | undefined
    )?.[0];

    const projectedEdge = (
      getCanvasShellState().canvasViewportProps?.edges as
        Array<{ data?: Record<string, unknown> }> | undefined
    )?.[0];
    expect(readCanvasDependencyEdgeData(projectedEdge?.data)).not.toHaveProperty('composition');
    expect(projectedNode?.data.onOpenNode).toBeTypeOf('function');
    await act(async () => {
      (projectedNode?.data.onOpenNode as () => void)();
    });

    expect(onInspectNode).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(
      useOperationalDrawerContributionStore
        .getState()
        .contribution?.tabs.some((tab) => tab.id === 'semantic')
    ).toBe(false);
    expect(projectedNode?.position).toBe(position);
    expect(useOperationalDrawerContributionStore.getState().contribution?.tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'data:operation', label: 'Data · operation' }),
      ])
    );
    expect(previewTransformRows).not.toHaveBeenCalled();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('passes disconnected topology to the read-only relational-tree projection', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    const connectedSources = fixture.sources.slice(1);
    await renderShell({
      panels: {
        inspectorGraphNodes: [...connectedSources, fixture.transform],
        inspectorGraphEdges: fixture.edges.slice(1),
      },
      graph: {
        nodesWithImpact: [
          {
            id: fixture.transform.id,
            type: 'dbtNode',
            position: { x: 320, y: 140 },
            data: {
              ...fixture.transform,
              pluginKind: fixture.transform.kind,
            },
          },
        ],
      },
    });

    const projectedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        Array<{ data: Record<string, unknown> }> | undefined
    )?.[0];
    act(() => {
      (projectedNode?.data.onOpenNode as (() => void) | undefined)?.();
    });
    expect(document.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(
      document.querySelector('[data-slot="canvas-relational-tree-workbench"]')?.textContent
    ).toContain('Missing');
  });

  it('publishes no execution drawer for a surface strategy without execution operations', async () => {
    await renderShell({
      layout: {
        surfaceStrategy: {
          id: 'read-only-file-canvas',
          sourceImport: { placement: 'contextual-modal', openedFrom: [] },
          nodeWorkbench: {
            placement: 'contextual-overlay',
            openedFrom: ['double-click'],
            sections: ['properties', 'columns', 'tests', 'code'],
          },
          operationalDrawer: null,
          globalNavigation: {
            workbenchTabs: 'retired',
            fixedResourcePanel: 'retired',
            fixedInspectorPanel: 'retired',
          },
        },
      },
    });

    expect(useOperationalDrawerContributionStore.getState().contribution).toBeNull();
  });

  it('keeps a late Source response isolated from the open Model editor', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    let resolveSample: ((sample: SourceDataSample) => void) | undefined;
    const previewSourceObjectRows = vi.fn(
      () =>
        new Promise<SourceDataSample>((resolve) => {
          resolveSample = resolve;
        })
    );
    const runMaterializationSampleQuery = vi.fn();
    const transformSample = {
      contractVersion: 1 as const,
      canvasId: 'canvas-test',
      transformNodeId: fixture.transform.id,
      draftRevision: 'revision-7',
      semanticPlanSha256: 'a'.repeat(64),
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['2'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-15T10:00:00.000Z',
    };
    const previewTransformRows = vi.fn().mockResolvedValue(transformSample);
    const onInspectNode = vi.fn();
    await renderShell({
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
      canvasTransformDataSampleQuery: { previewTransformRows },
      runMaterializationSampleQuery,
      panels: { inspectorGraphNodes: [...fixture.sources, fixture.transform] },
      graph: {
        nodesWithImpact: [
          {
            id: 'source',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Source',
              status: 'idle',
              metadata: {
                connectedSourceRef: {
                  schemaVersion: 'connected-source-ref.v1',
                  connectionRef: {
                    schemaVersion: 'connection-ref.v1',
                    connectionId: 'postgres',
                    provider: 'postgres',
                  },
                  sourceObjectId: 'relation/dvt/public/orders',
                },
              },
            },
          },
          {
            id: fixture.transform.id,
            type: 'dbtNode',
            position: { x: 100, y: 0 },
            data: { ...fixture.transform, pluginKind: fixture.transform.kind, onInspectNode },
          },
        ],
      },
    });
    const nodes = getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{
      data: DbtNodeData;
    }>;
    act(() => {
      nodes[1]?.data.onSelectNode?.(fixture.transform.id);
    });
    expect(previewSourceObjectRows).not.toHaveBeenCalled();
    act(() => {
      nodes[0]?.data.onOpenSourceDataSample?.('source');
      nodes[1]?.data.onOpenNode?.(fixture.transform.id);
    });
    const sourceSample: SourceDataSample = {
      contractVersion: 1,
      connectionId: 'postgres',
      objectId: 'relation/dvt/public/orders',
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      sampledAt: '2026-09-14T00:00:00Z',
    };
    await act(async () => {
      resolveSample?.(sourceSample);
      await Promise.resolve();
    });
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: 'data:source',
      contribution: {
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'data:source',
            dataSample: { status: 'ready', nodeName: 'Source', sample: sourceSample },
          }),
        ]),
      },
    });
    expect(previewSourceObjectRows).toHaveBeenCalledOnce();
    expect(previewTransformRows).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(runMaterializationSampleQuery).not.toHaveBeenCalled();
    expect(onInspectNode).not.toHaveBeenCalled();
    act(() => {
      useOperationalDrawerContributionStore.getState().selectOperationalDrawerTab('data:source');
    });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('data:source');
    expect(previewSourceObjectRows).toHaveBeenCalledOnce();
  });
});
