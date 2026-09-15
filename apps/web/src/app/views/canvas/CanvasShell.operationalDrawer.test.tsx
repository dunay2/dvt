// @vitest-environment jsdom

/** Owned concern: prove CanvasShell publishes Canvas operations into the bottom drawer. */
import { act, isValidElement } from 'react';
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
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { SemanticTransformFocusPanelProps } from './SemanticTransformFocusPanel';
import type { SourceDataSample } from '../../ports/workspace';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';

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
        { id: 'semantic', label: 'Semantics' },
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

  it('opens a real Substrait Transform in the semantic drawer on selection without changing geometry', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    const position = { x: 320, y: 140 };
    const onApplyNodeDraft = vi.fn();
    const onInspectNode = vi.fn();
    await renderShell({
      panels: {
        inspectorGraphNodes: [...fixture.sources, fixture.transform],
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
      },
    });

    const projectedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        Array<{ position: { x: number; y: number }; data: Record<string, unknown> }> | undefined
    )?.[0];

    expect(projectedNode?.data.onSelectNode).toBeTypeOf('function');
    act(() => {
      (projectedNode?.data.onSelectNode as (() => void) | undefined)?.();
    });

    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('semantic');
    expect(useUiLayoutStore.getState().bottomDrawerVisible).toBe(true);
    expect(projectedNode?.position).toBe(position);
    expect(onInspectNode).not.toHaveBeenCalled();

    act(() => {
      (projectedNode?.data.onOpenNode as (() => void) | undefined)?.();
    });
    expect(onInspectNode).not.toHaveBeenCalled();
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: `data:${fixture.transform.id}`,
      contribution: {
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: `data:${fixture.transform.id}`,
            dataSample: {
              status: 'error',
              nodeName: fixture.transform.name,
              reason: 'result_not_published',
            },
          }),
        ]),
      },
    });
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
    expect(projectedNode?.position).toBe(position);

    const semanticBody = useOperationalDrawerContributionStore
      .getState()
      .contribution?.tabs.find((tab) => tab.id === 'semantic')?.content;
    expect(isValidElement<SemanticTransformFocusPanelProps>(semanticBody)).toBe(true);
    if (!isValidElement<SemanticTransformFocusPanelProps>(semanticBody)) {
      throw new Error('Expected the shared semantic Transform panel.');
    }
    semanticBody.props.onTransformChange(fixture.transform);
    expect(onApplyNodeDraft).toHaveBeenCalledOnce();
    expect(onApplyNodeDraft).toHaveBeenCalledWith(
      expect.objectContaining({ name: fixture.transform.name, dvt: expect.any(Object) })
    );
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

  it('keeps one isolated data tab per card when a source response arrives late', async () => {
    const fixture = buildSemanticWorkbenchFixture();
    let resolveSample: ((sample: SourceDataSample) => void) | undefined;
    const previewSourceObjectRows = vi.fn(
      () =>
        new Promise<SourceDataSample>((resolve) => {
          resolveSample = resolve;
        })
    );
    const runMaterializationSampleQuery = vi.fn();
    const onInspectNode = vi.fn();
    await renderShell({
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
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
    });
    expect(useOperationalDrawerContributionStore.getState()).toMatchObject({
      activeTab: `data:${fixture.transform.id}`,
      contribution: {
        tabs: expect.arrayContaining([
          expect.objectContaining({
            id: 'data:source',
            dataSample: { status: 'ready', nodeName: 'Source', sample: sourceSample },
          }),
          expect.objectContaining({
            id: `data:${fixture.transform.id}`,
            dataSample: {
              status: 'error',
              nodeName: fixture.transform.name,
              reason: 'result_not_published',
            },
          }),
        ]),
      },
    });
    expect(previewSourceObjectRows).toHaveBeenCalledOnce();
    expect(runMaterializationSampleQuery).not.toHaveBeenCalled();
    expect(onInspectNode).not.toHaveBeenCalled();
    act(() => {
      useOperationalDrawerContributionStore.getState().selectOperationalDrawerTab('data:source');
    });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('data:source');
    expect(previewSourceObjectRows).toHaveBeenCalledOnce();
  });
});
