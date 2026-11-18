/** Prove composition prepares one atomic graph without changing the original session. */
import { describe, expect, it } from 'vitest';
import { getPluginPortMap } from '../../plugins/registry';
import { createModelOutputDependencyFixture } from './canvasModelOutputDependency.test-support';
import { prepareCanvasModelWorkingCopy } from './canvasModelWorkingCopy';
import {
  prepareCanvasModelCompositionCandidate,
  admitCanvasModelCopiesToSession,
} from './canvasModelCompositionCandidate';
import { applyCanvasInspectorNodeDraftWithInputsToSession } from './canvasInspectorAuthoringCommand';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { createCanvasRelationalAuthoringDraft } from './canvasRelationalAuthoringDraft';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import { emptyGraph, retainReferencedModelCopies } from './canvasRelationalTreeDraftGraph';
import { createSourceDocument } from './canvasSourceDocument';
import type { WorkspaceScope } from '../../ports/sessionContext';

describe('Model composition candidate', () => {
  it('adds a separate producer and its Read input to the receiver in a private candidate', async () => {
    const graph = await createModelOutputDependencyFixture();
    const before = structuredClone(graph.draftSession);
    const copy = prepareCanvasModelWorkingCopy({ sourceId: graph.producer.id, ...graph });
    const candidate = prepareCanvasModelCompositionCandidate({
      ...graph,
      copy,
      targetId: graph.consumer.id,
      pluginPorts: getPluginPortMap(),
    });
    expect(candidate.input.nodeId).toBe(copy.node.id);
    expect(candidate.input.producer?.nodeId).toBe(copy.node.id);
    expect(candidate.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: copy.node.id, targetId: graph.consumer.id }),
      ])
    );
    const session = admitCanvasModelCopiesToSession({
      draftSession: graph.draftSession,
      canonicalNodesById: graph.canonicalNodesById,
      copies: [candidate.addition],
      targetId: graph.consumer.id,
      pluginPorts: getPluginPortMap(),
    });
    expect(session.workingSet.visibleNodeIds).toContain(copy.node.id);
    expect(session.localNodeCatalog?.[copy.node.id]).toEqual(copy.node);
    expect(graph.draftSession).toEqual(before);
    expect(graph.nodes).not.toContainEqual(copy.node);
  });

  it('rejects a stale original and leaves no partial copy or connection', async () => {
    const graph = await createModelOutputDependencyFixture();
    const copy = prepareCanvasModelWorkingCopy({ sourceId: graph.producer.id, ...graph });
    expect(() =>
      prepareCanvasModelCompositionCandidate({
        ...graph,
        copy,
        targetId: graph.consumer.id,
        edges: graph.edges.filter((edge) => edge.targetId !== graph.producer.id),
        pluginPorts: getPluginPortMap(),
      })
    ).toThrow();
    expect(graph.draftSession.localNodeCatalog).toBeUndefined();
  });

  it('rejects a real cycle through the copied input dependencies', async () => {
    const graph = await createModelOutputDependencyFixture();
    const copy = prepareCanvasModelWorkingCopy({ sourceId: graph.consumer.id, ...graph });
    expect(() =>
      prepareCanvasModelCompositionCandidate({
        ...graph,
        copy,
        targetId: graph.producer.id,
        pluginPorts: getPluginPortMap(),
      })
    ).toThrow();
  });

  it('discards unreferenced private copies and retains a copy consumed by semantic operations', async () => {
    const graph = await createModelOutputDependencyFixture();
    const copy = prepareCanvasModelWorkingCopy({ sourceId: graph.producer.id, ...graph });
    const candidate = prepareCanvasModelCompositionCandidate({
      ...graph,
      copy,
      targetId: graph.consumer.id,
      pluginPorts: getPluginPortMap(),
    });
    const occurrence = createPendingSourceOccurrence(candidate.input);
    const privateGraph = {
      ...emptyGraph,
      modelCopies: [candidate.addition],
      pendingSources: [occurrence],
    };
    expect(retainReferencedModelCopies(privateGraph).modelCopies).toHaveLength(1);
    expect(
      retainReferencedModelCopies({ ...privateGraph, pendingSources: [] }).modelCopies
    ).toHaveLength(0);
    expect(
      retainReferencedModelCopies({
        ...privateGraph,
        pendingSources: [],
        joinDraft: createSourceDocument([occurrence.read], occurrence.read),
      }).modelCopies
    ).toHaveLength(1);
  });

  it('commits producer, dependencies and the receiver Read through one real Apply result', async () => {
    const graph = await createModelOutputDependencyFixture();
    const before = structuredClone(graph.draftSession);
    const copy = prepareCanvasModelWorkingCopy({ sourceId: graph.producer.id, ...graph });
    const candidate = prepareCanvasModelCompositionCandidate({
      ...graph,
      copy,
      targetId: graph.consumer.id,
      pluginPorts: getPluginPortMap(),
    });
    const indexed = indexSubstraitRelations(graph.consumerDocument);
    if (!indexed.ok) throw indexed.error;
    const occurrence = createPendingSourceOccurrence(candidate.input);
    const draft = {
      ...createCanvasInspectorNodeDraft(graph.consumer),
      relationalAuthoringDraft: createCanvasRelationalAuthoringDraft({
        sources: [occurrence],
        operations: [],
        outputRelationId: indexed.index.rootId,
        positions: new Map(),
      }),
    };
    const args = {
      draftSession: graph.draftSession,
      canonicalNodesById: graph.canonicalNodesById,
      node: graph.consumer,
      draft,
      workspaceScope: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'environment-1',
        targetAdapter: 'temporal',
      } satisfies WorkspaceScope,
      editable: true,
      pluginPorts: getPluginPortMap(),
      changes: { inputAdditions: [], modelCopies: [candidate.addition] },
    };
    const denied = await applyCanvasInspectorNodeDraftWithInputsToSession({
      ...args,
      editable: false,
    });
    expect(denied.outcome).toBe('rejected');
    expect(graph.draftSession).toEqual(before);
    const applied = await applyCanvasInspectorNodeDraftWithInputsToSession(args);
    expect(applied.outcome).toBe('applied');
    if (applied.outcome !== 'applied') throw new Error('Expected whole composition');
    const session = applied.draftSession;
    expect(session.workingSet.visibleNodeIds).toContain(copy.node.id);
    expect(session.workingSet.visibleEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: graph.source.id, targetId: copy.node.id }),
        expect.objectContaining({ sourceId: copy.node.id, targetId: graph.consumer.id }),
      ])
    );
    expect(
      session.localNodeCatalog?.[graph.consumer.id]?.metadata?.relationalAuthoringDraft
    ).toMatchObject({
      sources: [
        {
          sourceNodeId: copy.node.id,
          semanticDocument: { sidecar: { relations: [{ producerRef: { nodeId: copy.node.id } }] } },
        },
      ],
    });
    expect(graph.draftSession).toEqual(before);
    expect(graph.producer).toEqual(graph.canonicalNodesById.get(graph.producer.id));
  });
});
