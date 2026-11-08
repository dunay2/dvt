/** Owned concern: prove source identity, shared configuration and persisted placement semantics. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceGraphAuthoringDraftSchema } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import { createCanvasNodeInstance } from './canvasNodeInstance';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import { projectWorkspaceGraphAuthoringDraftSemanticGraph } from '../../services/workspace/workspaceGraphDraftProjection';
import { buildCanvasAuthoringGraphProjection } from './canvasAuthoringGraphProjection';
import { sourceNode, projectedModel } from './canvasColumnOutputAuthoring.test-support';
import { readCanvasModelCompositionPublication } from './canvasModelCompositionInput';
import { projectCanvasFixtureToPostgresSql } from './canvasOutputProjection.test-support';
import { outputFixture } from './canvasColumnOutputAuthoring.test-support';
import { canvasDraftSessionWorkingSet } from './canvasDraftSessionWorkingSet';
import { canvasDraftSession } from './canvasDraftSession';

const source: CanonicalNode = {
  id: 'source',
  name: 'orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: { config: { schema: 'raw', table: 'orders' } },
};
describe('Canvas node instances', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reuses a model definition and its inputs without creating a consumer or a diagram edge', async () => {
    const input = sourceNode();
    const definition = projectedModel(input, ['order_id', 'amount']);
    const instance = createCanvasNodeInstance(definition, new Set([definition.name]), 'instance');
    const nodes = [input, definition, instance];
    const edges = [
      {
        id: 'input-model',
        sourceId: input.id,
        targetId: definition.id,
        relation: 'lineage' as const,
      },
    ];
    const before = JSON.stringify({ definition, edges });
    const draft = buildCanvasAuthoringDraft({
      canvas: { kind: 'dvt', title: 'Canvas' },
      nodeIds: nodes.map((node) => node.id),
      nodePositions: Object.fromEntries(
        nodes.map((node, index) => [node.id, { x: index * 250, y: 100 }])
      ),
      visibleEdges: edges,
      canonicalNodes: nodes,
      canonicalEdges: edges,
    });
    const saved = WorkspaceGraphAuthoringDraftSchema.parse(JSON.parse(JSON.stringify(draft)));
    expect(saved.edges).toHaveLength(1);
    expect(saved.nodes.find((node) => node.id === instance.id)?.metadata).toBeUndefined();
    expect(saved.nodes.find((node) => node.id === instance.id)?.definitionId).toBe(definition.id);
    const graph = projectWorkspaceGraphAuthoringDraftSemanticGraph(saved);
    const reloaded = graph.canonicalNodes.find((node) => node.id === instance.id)!;
    expect(
      readCanvasModelCompositionPublication(
        reloaded,
        graph.canonicalNodes,
        graph.canonicalEdges
      )?.fields.map((field) => field.name)
    ).toEqual(['order_id', 'amount']);
    const sql = (transformNode: CanonicalNode): Promise<string> =>
      projectCanvasFixtureToPostgresSql({
        transformNode,
        nodes: graph.canonicalNodes,
        edges: graph.canonicalEdges,
      });
    expect(await sql(reloaded)).toBe(await sql(definition));
    expect(JSON.stringify({ definition, edges })).toBe(before);
  });

  it.each([false, true])(
    'retains a shared model and its input context when its original card is removed (closed=%s)',
    (closed) => {
      const input = sourceNode();
      const definition = projectedModel(input, ['order_id', 'amount']);
      const instance = createCanvasNodeInstance(definition, new Set([definition.name]), 'instance');
      let { draftSession } = outputFixture(input, definition);
      if (closed)
        draftSession.workingSet.visibleEdges = draftSession.workingSet.visibleEdges.map((edge) => ({
          ...edge,
          executionGate: 'closed',
        }));
      draftSession = canvasDraftSessionWorkingSet.addExplicitNode(draftSession, instance);
      draftSession = canvasDraftSessionWorkingSet.removeNode(draftSession, definition.id);
      const graph = buildCanvasAuthoringGraphProjection({
        ...draftSession.workingSet,
        draftSemanticGraph: null,
        localCanonicalNodes: Object.values(draftSession.localNodeCatalog ?? {}),
        localDefinitionEdges: draftSession.localDefinitionEdges,
      });
      const saved = WorkspaceGraphAuthoringDraftSchema.parse(
        buildCanvasAuthoringDraft({
          canvas: { kind: 'dvt', title: 'Canvas' },
          nodeIds: draftSession.workingSet.visibleNodeIds,
          nodePositions: Object.fromEntries(
            draftSession.workingSet.visibleNodeIds.map((id) => [id, { x: 0, y: 0 }])
          ),
          visibleEdges: draftSession.workingSet.visibleEdges,
          canonicalNodes: graph.canonicalNodes,
          canonicalEdges: graph.canonicalEdges,
        })
      );
      expect(saved.nodeIds).not.toContain(definition.id);
      expect(saved.nodes.some((node) => node.id === definition.id)).toBe(true);
      const reloaded = projectWorkspaceGraphAuthoringDraftSemanticGraph(saved);
      expect(
        readCanvasModelCompositionPublication(
          reloaded.canonicalNodes.find((node) => node.id === instance.id)!,
          reloaded.canonicalNodes,
          reloaded.canonicalEdges
        )?.fields
      ).toHaveLength(2);
      expect(
        saved.edges.some((edge) => edge.sourceId === definition.id && edge.targetId === instance.id)
      ).toBe(false);
      expect(saved.edges[0]?.metadata?.executionGate).toBe(closed ? 'closed' : undefined);
      const persisted = canvasDraftSession.machine.applySaveSuccess(
        canvasDraftSession.machine.markSaving(draftSession),
        { draft: saved, revision: 'saved', savedAt: '2026-11-03T22:00:00Z' }
      );
      expect(persisted.localDefinitionEdges).toBeUndefined();
      const afterRemoval = canvasDraftSessionWorkingSet.removeNode(draftSession, instance.id);
      expect(afterRemoval.localNodeCatalog?.[definition.id]).toBe(definition);
      expect(afterRemoval.localNodeCatalog?.[instance.id]).toBeUndefined();
    }
  );

  it('routes edits on a model instance to the single shared definition', () => {
    const input = sourceNode();
    const definition = projectedModel(input, ['order_id', 'amount']);
    const instance = createCanvasNodeInstance(definition, new Set(), 'instance');
    const changed = projectedModel(input, ['amount']);
    let { draftSession } = outputFixture(input, definition);
    draftSession = canvasDraftSessionWorkingSet.addExplicitNode(draftSession, instance);
    draftSession = canvasDraftSessionWorkingSet.updateNodeDefinition(draftSession, {
      ...instance,
      metadata: changed.metadata,
    });
    const graph = buildCanvasAuthoringGraphProjection({
      ...draftSession.workingSet,
      draftSemanticGraph: null,
      localCanonicalNodes: Object.values(draftSession.localNodeCatalog ?? {}),
    });
    for (const id of [definition.id, instance.id])
      expect(
        readCanvasModelCompositionPublication(
          graph.canonicalNodesById.get(id)!,
          graph.canonicalNodes,
          graph.canonicalEdges
        )?.fields.map((field) => field.name)
      ).toEqual(['amount']);
    expect(graph.canonicalEdges).toHaveLength(1);
  });

  it('allocates a secure placement identity when the browser has no randomUUID API', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array): Uint8Array => bytes.fill(0),
    });
    const instance = createCanvasNodeInstance(source, new Set());
    expect(instance.id).toBe('00000000-0000-4000-8000-000000000000');
    expect(instance.definitionId).toBe(source.id);
    expect(instance.metadata).toBe(source.metadata);
  });

  it('rejects placement creation when secure entropy is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    expect(() => createCanvasNodeInstance(source, new Set())).toThrow(
      'CRYPTO_SECURE_RANDOM_UNAVAILABLE'
    );
  });

  it('persists two independent placements but one configuration, then resolves latest edits after reload', () => {
    const first = createCanvasNodeInstance(source, new Set(), 'first');
    const second = createCanvasNodeInstance(source, new Set([first.name]), 'second');
    expect([first.name, second.name]).toEqual(['orders', 'orders 2']);
    const draft = buildCanvasAuthoringDraft({
      canvas: { kind: 'dvt', title: 'Canvas' },
      nodeIds: ['first', 'second'],
      nodePositions: { first: { x: 0, y: 0 }, second: { x: 100, y: 100 } },
      visibleEdges: [],
      canonicalNodes: [source, first, second],
      canonicalEdges: [],
    });
    expect(WorkspaceGraphAuthoringDraftSchema.safeParse(draft).success).toBe(true);
    expect(draft.nodes.filter((n) => n.metadata != null)).toHaveLength(1);
    const graph = projectWorkspaceGraphAuthoringDraftSemanticGraph(
      JSON.parse(JSON.stringify(draft))
    );
    expect(graph.canonicalNodes.find((n) => n.id === 'second')?.metadata).toEqual(source.metadata);
    const changed = { ...source, metadata: { config: { schema: 'new', table: 'orders' } } };
    const projection = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['first', 'second'],
      visibleEdges: [],
      draftSemanticGraph: graph,
      localCanonicalNodes: [changed],
    });
    expect(projection.canonicalNodesById.get('first')?.metadata).toBe(changed.metadata);
    expect(projection.canonicalNodesById.get('second')?.metadata).toBe(changed.metadata);
    const removed = buildCanvasAuthoringGraphProjection({
      visibleNodeIds: ['second'],
      visibleEdges: [],
      draftSemanticGraph: graph,
      localCanonicalNodes: [],
    });
    expect(removed.canonicalNodes.map((n) => n.id)).toEqual(['second', 'source']);
  });
});
