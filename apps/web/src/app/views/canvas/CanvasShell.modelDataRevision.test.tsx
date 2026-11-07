// @vitest-environment jsdom
/** Prove that the real Canvas card action cannot bypass the saved-model revision boundary. */
import { asIsoUtcString } from '@dvt/contracts';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerDataSample,
  type OperationalDrawerTab,
} from '../../components/shell/operationalDrawerContributionStore';
import { fixture, node } from './canvasOutputExpression.test.fixtures';
import { createCanvasShellHarness, getCanvasShellState } from './CanvasShell.testHarness';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import type { CanvasDraftLifecycle } from './canvasDraftLifecycle.types';
import type { CanvasShellProps } from './canvasShell.types';
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';
import { withDvtTransformMaterialization } from './canvasDvtMaterializationPolicy';
import { dbtModel, edge } from './canvasDvtConnectionProvenance.test-support';
import { resolveCanvasDbtModelSignature } from './canvasDbtModelReference';
import * as sampleQueryMetadata from './canvasNodeQueryMetadata';

describe('Canvas Model card revision-safe execution', () => {
  const model = node(fixture());
  const changedModel = node(fixture('renamed'));
  const semanticPlanSha256 =
    readDvtTransformAuthoringAuthority(model)!.semanticDocument.semanticPlan.sha256;
  const saved = {
    ok: true,
    canonicalNodes: [model],
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
      queriedAt: asIsoUtcString('2026-09-23T09:00:00.000Z'),
      limit: 20,
      navigation: 'bounded-first-page' as const,
    },
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
  async function mount(
    editable = true,
    prepared = true,
    shown = model,
    context: { nodes: CanonicalNode[]; edges: CanonicalEdge[] } = { nodes: [shown], edges: [] }
  ): Promise<CanvasShellProps> {
    const presentationTruth = await projectCanvasNodePresentationTruth({
      node: shown,
      ...context,
    });
    const data = { ...shown, pluginKind: shown.kind, presentationTruth };
    return harness.render({
      panels: {
        inspectorGraphNodes: context.nodes,
        inspectorGraphEdges: context.edges,
        relationalTreeAuthoring: { canEditNode: editable, onApplyNodeDraft: vi.fn() },
      },
      graph: {
        viewport: { x: 40, y: 70, zoom: 0.8 },
        nodesWithImpact: [{ id: shown.id, position: { x: 0, y: 0 }, data }],
      },
      canvasTransformDataSampleQuery: query,
      prepareModelPreview: prepared ? prepare : undefined,
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
  async function renderGraph(
    props: CanvasShellProps,
    nodes: CanonicalNode[],
    edges: CanonicalEdge[] = []
  ): Promise<void> {
    await harness.renderProps({
      ...props,
      panels: { ...props.panels, inspectorGraphNodes: nodes, inspectorGraphEdges: edges },
    });
  }

  it('reports unavailable context when current Preview has a missing upstream input', async () => {
    await mount(true, true, model, {
      nodes: [model],
      edges: [edge('missing-input', model.id)],
    });
    expect(card().onOpenSourceDataSample).toBeTypeOf('function');
    await execute();
    expect(result()).toMatchObject({
      status: 'error',
      nodeName: model.name,
      reason: 'unavailable',
    });
    expect(useOperationalDrawerContributionStore.getState().activeTab).toBe(`data:${model.id}`);
    expect(prepare).not.toHaveBeenCalled();
    expect(query.previewTransformRows).not.toHaveBeenCalled();
  });
  it('keeps an obsolete unavailable context callback from replacing a current sample', async () => {
    const props = await mount(true, true, model, {
      nodes: [model],
      edges: [edge('missing-input', model.id)],
    });
    const obsoletePreview = card().onOpenSourceDataSample!;
    await renderGraph(props, [model]);
    await execute();
    const ready = result();
    expect(ready?.status).toBe('ready');
    await act(async () => obsoletePreview(model.id));
    expect(result()).toBe(ready);
    expect(prepare).toHaveBeenCalledOnce();
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
  });

  it('does not inspect sample context for unrequested models when another branch changes', async () => {
    const props = await mount();
    const branch = Array.from({ length: 8 }, (_, index) => ({ ...model, id: `other-${index}` }));
    const edges = branch.slice(1).map((node, index) => edge(branch[index]!.id, node.id));
    const inspect = vi.spyOn(sampleQueryMetadata, 'canvasNodeQueryMetadata');
    try {
      await renderGraph(props, [model, ...branch], edges);
      expect(inspect).not.toHaveBeenCalled();
      await execute();
      expect(result()?.status).toBe('ready');
      expect(inspect.mock.calls.map(([node]) => node.id)).toEqual([model.id]);
      await renderGraph(props, [model, ...branch.slice(0, -1)], edges.slice(0, -1));
      expect(result()?.status).toBe('ready');
      expect(inspect.mock.calls.every(([node]) => node.id === model.id)).toBe(true);
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
    } finally {
      inspect.mockRestore();
    }
  });

  it.each(['native', 'dbt'] as const)(
    'retains the exact %s sample through unrelated placements, branch edits and downstream consumers',
    async (kind) => {
      const definition = dbtModel();
      const shown =
        kind === 'native' ? model : { ...definition, id: model.id, definitionId: definition.id };
      const nodes = kind === 'native' ? [shown] : [definition, shown];
      const rows = {
        ...sample,
        semanticPlanSha256:
          resolveCanvasDbtModelSignature(shown)?.document.sidecar.semanticPlanSha256 ??
          semanticPlanSha256,
      };
      prepare.mockResolvedValue({ ...saved, canonicalNodes: nodes });
      query.previewTransformRows.mockResolvedValue(rows);
      const props = await mount(true, true, shown, { nodes, edges: [] });
      await execute();
      const ready = result();
      expect(ready).toMatchObject({ status: 'ready', sample: rows });

      const unrelated = { ...model, id: 'unrelated-model' };
      const instance = { ...unrelated, id: 'unrelated-placement', definitionId: unrelated.id };
      const producer = dbtModel(undefined, 'unrelated-input');
      const branch = [producer, unrelated, instance];
      const branchEdge = edge(producer.id, unrelated.id);
      await renderGraph(props, [...nodes, ...branch], [branchEdge]);
      expect(result()).toBe(ready);
      await renderGraph(
        props,
        [...nodes, producer, { ...changedModel, id: unrelated.id }, instance],
        [branchEdge]
      );
      expect(result()).toBe(ready);
      const downstream = edge(shown.id, unrelated.id);
      await renderGraph(props, [...nodes, ...branch].reverse(), [downstream, branchEdge]);
      expect(result()).toBe(ready);
      await renderGraph(props, nodes);
      expect(result()).toBe(ready);
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
      expect(prepare).toHaveBeenCalledOnce();
    }
  );
  it.each(['saving', 'querying'] as const)(
    'accepts an in-flight sample after unrelated and downstream edits while %s',
    async (phase) => {
      let finish!: () => void;
      if (phase === 'saving')
        prepare.mockReturnValueOnce(
          new Promise((resolve) => {
            finish = () => resolve(saved);
          })
        );
      else
        query.previewTransformRows.mockReturnValueOnce(
          new Promise((resolve) => {
            finish = () => resolve(sample);
          })
        );
      const props = await mount();
      await execute();
      const loading = result();
      expect(loading?.status).toBe('loading');
      const unrelated = { ...model, id: 'unrelated' };
      await renderGraph(props, [unrelated, model], [edge(model.id, unrelated.id)]);
      expect(result()).toBe(loading);
      await act(async () => finish());
      expect(result()).toMatchObject({ status: 'ready', sample });
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
      expect(prepare).toHaveBeenCalledOnce();
    }
  );
  it.each([
    'definition',
    'producer',
    'schema',
    'binding',
    'missing input',
    'missing definition',
  ] as const)(
    'invalidates a shared instance sample when its inherited %s changes',
    async (change) => {
      const definition = { ...model, id: 'shared-definition' };
      const shown = { ...model, definitionId: definition.id };
      const producer = dbtModel();
      const input = edge(producer.id, definition.id);
      const nodes = [shown, definition, producer];
      prepare.mockResolvedValue({ ...saved, canonicalNodes: nodes });
      const props = await mount(true, true, shown, { nodes, edges: [input] });
      await execute();
      expect(result()?.status).toBe('ready');
      const staleRefresh = useOperationalDrawerContributionStore
        .getState()
        .contribution!.tabs.find((tab) => tab.id === `data:${model.id}`)!.onRefresh!;
      const reference = resolveCanvasDbtModelSignature(producer)!.reference;
      const changes = {
        definition: [shown, { ...changedModel, id: definition.id }, producer],
        producer: [
          shown,
          definition,
          dbtModel({
            schemaVersion: 'connection-ref.v1',
            provider: 'postgres',
            connectionId: 'other-warehouse',
          }),
        ],
        schema: [
          shown,
          definition,
          {
            ...producer,
            metadata: {
              dbtModelReference: {
                ...reference,
                fields: reference.fields.map((field) => ({ ...field, dataType: 'integer' })),
              },
            },
          },
        ],
        binding: nodes,
        'missing input': [shown, definition],
        'missing definition': [shown, producer],
      };
      const changedEdges =
        change === 'binding'
          ? [{ ...input, metadata: { inputBindings: { version: 'v1', fields: [] } } }]
          : [input];
      await renderGraph(props, changes[change], changedEdges);
      expect(result()).toMatchObject({ status: 'error', reason: 'unavailable' });
      await act(async () => staleRefresh());
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
    }
  );
  it('retains a sample when an instance owns its inputs and only unused definition inputs change', async () => {
    const definition = { ...model, id: 'shared-definition' };
    const shown = { ...model, definitionId: definition.id };
    const producer = dbtModel();
    const unused = dbtModel(undefined, 'unused-definition-input');
    const nodes = [shown, definition, producer, unused];
    const edges = [edge(producer.id, shown.id), edge(unused.id, definition.id)];
    prepare.mockResolvedValue({ ...saved, canonicalNodes: nodes });
    const props = await mount(true, true, shown, { nodes, edges });
    await execute();
    const ready = result();
    expect(ready?.status).toBe('ready');
    await renderGraph(props, [shown, definition, producer], [edges[0]!]);
    expect(result()).toBe(ready);
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
  });
  it('rejects an in-flight response after its transitive producer changes', async () => {
    const producer = dbtModel();
    const intermediate = { ...model, id: 'intermediate' };
    const nodes = [model, intermediate, producer];
    const edges = [edge(producer.id, intermediate.id), edge(intermediate.id, model.id)];
    prepare.mockResolvedValue({ ...saved, canonicalNodes: nodes });
    let finish!: (value: typeof sample) => void;
    query.previewTransformRows.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const props = await mount(true, true, model, { nodes, edges });
    await execute();
    expect(result()?.status).toBe('loading');
    await renderGraph(props, [model, intermediate], edges);
    await act(async () => finish(sample));
    expect(result()).toMatchObject({ status: 'error', reason: 'unavailable' });
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
  });

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
  it('refreshes explicitly from the current model and invalidates the previously displayed revision', async () => {
    await mount();
    await execute();
    const tab = (): OperationalDrawerTab | undefined =>
      useOperationalDrawerContributionStore
        .getState()
        .contribution?.tabs.find((entry) => entry.id === `data:${model.id}`);
    expect(tab()?.onRefresh).toBeTypeOf('function');
    const staleRefresh = tab()!.onRefresh!;
    const nextDigest =
      readDvtTransformAuthoringAuthority(changedModel)!.semanticDocument.semanticPlan.sha256;
    await mount(true, true, changedModel);
    expect(result()?.status).not.toBe('ready');
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
    await act(async () => staleRefresh());
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
    prepare.mockResolvedValue({ ...saved, canonicalNodes: [changedModel] });
    query.previewTransformRows.mockResolvedValue({ ...sample, semanticPlanSha256: nextDigest });
    await act(async () => tab()!.onRefresh!());
    expect(query.previewTransformRows).toHaveBeenLastCalledWith(
      expect.objectContaining({ semanticPlanSha256: nextDigest })
    );
    expect(result()?.status).toBe('ready');
  });
  it.each(['table', 'view', 'ephemeral'])(
    'retains sampled rows and provenance when only storage disposition changes to %s',
    async (materialized) => {
      const previous = applyDvtTransformAuthoringMetadata(model, {
        ...createDvtTransformAuthoringMetadata(model),
        materialized: materialized === 'table' ? 'view' : 'table',
        resultTarget: {
          schemaVersion: 'dvt-transform-result-target.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'local-postgres-proof',
            provider: 'postgres',
          },
          schema: 'public',
          relation: 'saved_orders',
        },
      });
      prepare.mockResolvedValue({ ...saved, canonicalNodes: [previous] });
      await mount(true, true, previous);
      await execute();
      const ready = result();
      expect(ready).toMatchObject({ status: 'ready', sample });
      const next = applyDvtTransformAuthoringMetadata(
        previous,
        withDvtTransformMaterialization(createDvtTransformAuthoringMetadata(previous), materialized)
      );
      expect(next.metadata).toMatchObject({ config: { materialized } });
      if (materialized === 'ephemeral')
        expect(next.metadata?.config).not.toHaveProperty('resultTarget');
      expect(readDvtTransformAuthoringAuthority(next)?.semanticDocument).toEqual(
        readDvtTransformAuthoringAuthority(previous)?.semanticDocument
      );

      await mount(true, true, next);
      expect(result()).toBe(ready);
      expect(result()).toMatchObject({
        status: 'ready',
        sample: { provenance: sample.provenance },
      });
      expect(useOperationalDrawerContributionStore.getState().activeTab).toBe(`data:${model.id}`);
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
      expect(prepare).toHaveBeenCalledOnce();
    }
  );
  it.each(['sidecar', 'declared columns'] as const)(
    'invalidates rows on changed %s even when the semantic plan is unchanged',
    async (change) => {
      await mount();
      await execute();
      const ready = result();
      expect(ready).toMatchObject({ status: 'ready', sample });
      const staleRefresh = useOperationalDrawerContributionStore
        .getState()
        .contribution!.tabs.find((tab) => tab.id === `data:${model.id}`)!.onRefresh!;
      const document = readDvtTransformAuthoringAuthority(model)!.semanticDocument;
      const read = document.sidecar.relations.find((binding) => binding.sourceRef != null);
      expect(read).toBeDefined();
      const next =
        change === 'sidecar'
          ? applyDvtSubstraitSemanticDocument(model, {
              ...document,
              sidecar: {
                ...document.sidecar,
                relations: document.sidecar.relations.map((binding) =>
                  binding === read ? { ...binding, displayName: 'orders_rebound_alias' } : binding
                ),
              },
            })
          : {
              ...model,
              metadata: {
                ...model.metadata,
                columns: [{ name: 'customer', type: 'integer', nullable: false }],
              },
            };
      const currentDocument = readDvtTransformAuthoringAuthority(next)!.semanticDocument;
      expect(currentDocument.semanticPlan).toEqual(document.semanticPlan);
      if (change === 'sidecar') expect(currentDocument.sidecar).not.toEqual(document.sidecar);
      else expect(currentDocument).toEqual(document);

      await mount(true, true, next);
      expect(result()).not.toBe(ready);
      expect(result()).toMatchObject({ status: 'error', reason: 'unavailable' });
      await act(async () => staleRefresh());
      expect(query.previewTransformRows).toHaveBeenCalledOnce();
    }
  );
  it('removes refresh and invalidates ready rows when the model disappears', async () => {
    const props = await mount();
    await execute();
    await harness.renderProps({
      ...props,
      panels: { ...props.panels, inspectorGraphNodes: [] },
      graph: { ...props.graph, nodesWithImpact: [] },
    });
    expect(result()?.status).not.toBe('ready');
    expect(
      useOperationalDrawerContributionStore
        .getState()
        .contribution?.tabs.find((entry) => entry.id === `data:${model.id}`)?.onRefresh
    ).toBeUndefined();
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
  });
  it('keeps samples on movement but invalidates them on an input-binding change without another query', async () => {
    const props = await mount();
    await execute();
    await harness.renderProps({
      ...props,
      graph: { ...props.graph, viewport: { x: 250, y: 50, zoom: 1.2 } },
    });
    expect(result()?.status).toBe('ready');
    await harness.renderProps({
      ...props,
      panels: {
        ...props.panels,
        inspectorGraphEdges: [
          { id: 'changed-binding', sourceId: 'source', targetId: model.id, relation: 'lineage' },
        ],
      },
    });
    expect(result()?.status).not.toBe('ready');
    expect(query.previewTransformRows).toHaveBeenCalledOnce();
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
  it.each([undefined, {}, { version: 1, mode: 'sql' }])(
    'keeps unavailable authority %j visible without enabling Play',
    async (transformAuthoring) => {
      await mount(true, true, { ...model, metadata: { transformAuthoring } });
      expect(card().onOpenSourceDataSample).toBeUndefined();
      expect(prepare).not.toHaveBeenCalled();
      expect(query.previewTransformRows).not.toHaveBeenCalled();
    }
  );
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
