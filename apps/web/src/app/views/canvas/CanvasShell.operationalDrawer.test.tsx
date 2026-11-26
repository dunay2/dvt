import {
  type TransformDataSampleResponse,
  asIsoUtcString,
  asSha256HexString,
} from '@dvt/contracts';
// @vitest-environment jsdom

/** Owned concern: prove CanvasShell publishes Canvas operations into the bottom drawer. */
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
    await renderShell({
      panels: {
        activeRunId: 'run-42',
      },
      chromeCommands: {
        onRun,
      },
    });

    const contribution = useOperationalDrawerContributionStore.getState().contribution;

    expect(contribution).toMatchObject({
      source: 'canvas',
      title: 'Canvas operations',
      tabs: [{ id: 'preview', label: 'Preview' }],
      runs: {
        activeRunId: 'run-42',
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
    expectModelDrawerDisposition(projectedNode, position);
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
    const inputControl = document.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-model-inputs-command"]'
    );
    expect(inputControl).not.toBeNull();
    act(() => inputControl!.click());
    const palette = document.getElementById(inputControl!.getAttribute('aria-controls')!);
    expect(palette?.textContent).toContain('Missing');
  });

  it('publishes no execution drawer for a surface strategy without execution operations', async () => {
    await renderShell({
      layout: {
        surfaceStrategy: {
          id: 'read-only-file-canvas',
          sourceImport: { placement: 'contextual-modal', openedFrom: [] },
          nodeWorkbench: {
            placement: 'right-inspector',
            openedFrom: ['click', 'double-click'],
            sections: ['properties', 'columns', 'tests', 'code'],
          },
          operationalDrawer: null,
          globalNavigation: {
            workbenchTabs: 'retired',
            fixedResourcePanel: 'retired',
            fixedInspectorPanel: 'contextual',
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
    const transformSample = buildLateTransformSample(fixture.transform.id);
    const previewTransformRows = vi.fn().mockResolvedValue(transformSample);
    const onInspectNode = vi.fn();
    await renderShell({
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
      canvasTransformDataSampleQuery: { previewTransformRows },
      panels: { inspectorGraphNodes: [...fixture.sources, fixture.transform] },
      graph: buildLateSampleShellGraph(fixture, onInspectNode),
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
    const sourceSample = buildLateSourceSample();
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
    expect(onInspectNode).not.toHaveBeenCalled();
    act(() => {
      useOperationalDrawerContributionStore.getState().selectOperationalDrawerTab('data:source');
    });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('data:source');
    expect(previewSourceObjectRows).toHaveBeenCalledOnce();
  });
});

function expectModelDrawerDisposition(
  projectedNode: { position: { x: number; y: number }; data: Record<string, unknown> } | undefined,
  position: { x: number; y: number }
): void {
  expect(document.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
  expect(
    useOperationalDrawerContributionStore
      .getState()
      .contribution?.tabs.some((tab) => tab.id === 'semantic')
  ).toBe(false);
  expect(projectedNode?.position).toBe(position);
  expect(
    useOperationalDrawerContributionStore
      .getState()
      .contribution?.tabs.filter((tab) => tab.id === 'data:operation')
  ).toEqual([expect.objectContaining({ id: 'data:operation', label: 'Data' })]);
}

function buildLateTransformSample(transformNodeId: string): TransformDataSampleResponse {
  const source = buildLateSourceSample({
    connectionId: 'local-postgres-proof',
    rowValue: '2',
    queriedAt: '2026-09-15T10:00:00.000Z',
  });
  return {
    contractVersion: 1 as const,
    canvasId: 'canvas-test',
    transformNodeId,
    draftRevision: 'revision-7',
    semanticPlanSha256: asSha256HexString('a'.repeat(64)),
    columns: source.columns,
    rows: source.rows,
    limit: source.limit,
    truncated: source.truncated,
    provenance: source.provenance,
  };
}

function buildLateSourceSample(
  options = { connectionId: 'postgres', rowValue: '1', queriedAt: '2026-09-14T00:00:00.000Z' }
): SourceDataSample {
  return {
    contractVersion: 1,
    connectionId: options.connectionId,
    objectId: 'relation/dvt/public/orders',
    columns: [{ name: 'id', type: 'integer', nullable: false }],
    rows: [{ values: [options.rowValue] }],
    limit: 20,
    truncated: false,
    provenance: {
      mode: 'live',
      sourceRefs: [
        {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: options.connectionId,
            provider: 'postgres',
          },
          sourceObjectId: 'relation/dvt/public/orders',
        },
      ],
      queriedAt: asIsoUtcString(options.queriedAt),
      limit: 20,
      navigation: 'bounded-first-page',
    },
  };
}

function buildLateSampleShellGraph(
  fixture: ReturnType<typeof buildSemanticWorkbenchFixture>,
  onInspectNode: () => void
): CanvasShellPropsOverrides['graph'] {
  return {
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
  };
}
