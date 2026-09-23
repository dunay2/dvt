// @vitest-environment jsdom
/** Prove that the real Canvas card action cannot bypass the saved-model revision boundary. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerDataSample,
} from '../../components/shell/operationalDrawerContributionStore';
import { fixture, node } from './canvasOutputExpression.test.fixtures';
import { createCanvasShellHarness, getCanvasShellState } from './CanvasShell.testHarness';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import type { CanvasDraftLifecycle } from './canvasDraftLifecycle.types';
import type { CanvasShellProps } from './canvasShell.types';

describe('Canvas Model card revision-safe execution', () => {
  const model = node(fixture());
  const changedModel = node(fixture('renamed'));
  const canonicalNodes = [model];
  const semanticPlanSha256 =
    readDvtTransformAuthoringAuthority(model)!.semanticDocument.semanticPlan.sha256;
  const saved = {
    ok: true,
    canonicalNodes,
    canonicalEdges: [],
    workspaceNodeIds: [model.id],
  } as const;
  const sample = {
    contractVersion: 1 as const,
    canvasId: 'canvas-test',
    transformNodeId: model.id,
    draftRevision: 'revision-7',
    semanticPlanSha256,
    columns: [{ name: 'id', type: 'integer', nullable: false }],
    rows: [{ values: ['42'] }],
    limit: 20,
    truncated: false,
    sampledAt: '2026-09-23T09:00:00.000Z',
  };
  let harness: ReturnType<typeof createCanvasShellHarness>;
  const query = { previewTransformRows: vi.fn() };
  const prepare = vi.fn<CanvasDraftLifecycle['flushDraftForExecution']>();
  beforeEach(() => {
    harness = createCanvasShellHarness();
    query.previewTransformRows.mockReset().mockResolvedValue(sample);
    prepare.mockReset().mockResolvedValue(saved);
  });
  afterEach(() => harness.unmount());
  async function mount(canEditModel = true, withPreparation = true): Promise<CanvasShellProps> {
    return harness.render({
      panels: {
        inspectorGraphNodes: canonicalNodes,
        inspectorGraphEdges: [],
        relationalTreeAuthoring: { canEditNode: canEditModel, onApplyNodeDraft: vi.fn() },
      },
      graph: {
        viewport: { x: 40, y: 70, zoom: 0.8 },
        nodesWithImpact: [
          { id: model.id, position: { x: 0, y: 0 }, data: { ...model, pluginKind: model.kind } },
        ],
      },
      canvasTransformDataSampleQuery: query,
      prepareModelPreview: withPreparation ? prepare : undefined,
    });
  }
  function card(): DbtNodeData {
    return (
      getCanvasShellState().canvasViewportProps!.nodesWithImpact as Array<{ data: DbtNodeData }>
    )[0]!.data;
  }
  function result(): OperationalDrawerDataSample | undefined {
    return useOperationalDrawerContributionStore
      .getState()
      .contribution?.tabs.find((tab) => tab.id === `data:${model.id}`)?.dataSample;
  }
  async function execute(): Promise<void> {
    await act(async () => card().onOpenSourceDataSample?.(model.id));
  }

  it('waits for saving to finish and binds the request to the displayed digest', async () => {
    let finish!: (value: typeof saved) => void;
    prepare.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await mount();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    await execute();
    expect(prepare).toHaveBeenCalledOnce();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    expect(result()?.status).toBe('loading');
    await act(async () => finish(saved));
    expect(query.previewTransformRows).toHaveBeenCalledExactlyOnceWith({
      canvasId: 'canvas-test',
      transformNodeId: model.id,
      semanticPlanSha256,
      limit: 20,
    });
    expect(result()).toMatchObject({ status: 'ready', sample });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe(`data:${model.id}`);
    expect(harness.container.querySelector('[data-slot="canvas-model-editor"]')).toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.viewport).toEqual({
      x: 40,
      y: 70,
      zoom: 0.8,
    });
  });
  it.each([
    ['persistence conflict', { ok: false, message: 'Conflict' } as const],
    ['disappeared model', { ...saved, canonicalNodes: [] }],
    ['missing authority', { ...saved, canonicalNodes: [{ ...model, metadata: {} }] }],
    ['changed model', { ...saved, canonicalNodes: [changedModel] }],
  ] as const)('does not query after %s', async (_name, outcome) => {
    prepare.mockResolvedValueOnce(outcome);
    await mount();
    await execute();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    expect(result()?.status).toBe('error');
  });
  it('disables editable-model execution when preparation is unavailable', async () => {
    await mount(true, false);
    expect(card().onOpenSourceDataSample).toBeUndefined();
  });
  it('queries a read-only model without a write, still bound to its digest', async () => {
    await mount(false, false);
    await execute();
    expect(prepare).not.toHaveBeenCalled();
    expect(query.previewTransformRows).toHaveBeenCalledExactlyOnceWith({
      canvasId: 'canvas-test',
      transformNodeId: model.id,
      semanticPlanSha256,
      limit: 20,
    });
    expect(result()?.status).toBe('ready');
  });
  it.each([
    { canvasId: 'other-canvas' },
    { transformNodeId: 'other-model' },
    { semanticPlanSha256: 'f'.repeat(64) },
    { relationId: 'other-relation' },
  ])('rejects a response with mismatched identity: %j', async (identity) => {
    query.previewTransformRows.mockResolvedValueOnce({ ...sample, ...identity });
    await mount();
    await execute();
    expect(result()?.status).toBe('error');
  });
  it('does not query when the canvas changes while saving', async () => {
    let finish!: (value: typeof saved) => void;
    prepare.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const props = await mount();
    await execute();
    await harness.renderProps({
      ...props,
      panels: { ...props.panels, activeCanvasId: 'other-canvas' },
    });
    await act(async () => finish(saved));
    expect(query.previewTransformRows).not.toHaveBeenCalled();
    expect(result()?.status).not.toBe('ready');
  });
  it.each([
    ['disappears', []],
    ['changes', [changedModel]],
  ] as const)('does not publish rows if the model %s during the query', async (_name, nodes) => {
    let finish!: (value: typeof sample) => void;
    query.previewTransformRows.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const props = await mount();
    await execute();
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
    await harness.renderProps({
      ...props,
      panels: { ...props.panels, inspectorGraphNodes: nodes },
    });
    await act(async () => finish(sample));
    expect(result()?.status).toBe('error');
  });
});
