import { describe, expect, it } from 'vitest';
import { WorkspaceGraphAuthoringDraftSchema, type ConnectedSourceRef } from '@dvt/contracts';
import { bindCanvasInputField, removeCanvasInputField } from './canvasInputBindingAuthoring';
import { canvasInputSlotId, projectCanvasInputBindings } from './canvasInputBindings';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { buildCanvasAuthoringDraft } from './canvasDraftAuthoring';
import type { CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import {
  projectCanvasPublishedInputFields,
  readCanvasPublishedInputFields,
} from './canvasPublishedInputFields';
import { buildCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth';
import { canvasDraftEdgeExecutionGate } from './canvasDraftEdgeExecutionGate';
import { buildCanvasCanonicalSnapshot } from './canvasCanonicalSnapshot';
import { getPluginPortMap } from '../../plugins/registry';

function producer(id: string): CanonicalNode {
  return {
    id,
    name: 'Same name',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'public',
      tableName: id,
      columns: [
        { name: 'id', type: 'text' },
        { name: 'country', type: 'text' },
      ],
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        sourceObjectId: `public.${id}`,
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: 'warehouse',
        },
      },
    },
  };
}
const first = producer('first');
const second = producer('second');
const consumer: CanonicalNode = {
  id: 'consumer',
  name: 'Consumer',
  kind: 'dvt:transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
};
const nodes = [first, second, consumer];
const canonicalNodesById = new Map(nodes.map((node) => [node.id, node]));
function authoredConsumer(): CanonicalNode {
  return applyDvtSubstraitSemanticDocument(
    consumer,
    encodeDvtSubstraitProjectionDocument(
      createDvtSubstraitProjectionDraft({
        targetNodeId: consumer.id,
        source: {
          nodeId: first.id,
          table: first.id,
          schema: 'public',
          sourceRef: first.metadata!.connectedSourceRef as ConnectedSourceRef,
          fields: [
            { name: 'id', dataType: 'text' },
            { name: 'country', dataType: 'text' },
          ],
        },
        outputs: [{ fieldId: 'published-id', name: 'alias', sourceFieldName: 'id' }],
      })
    )
  );
}
function session(): CanvasDraftSession {
  return {
    syncState: 'editing',
    baseline: { record: null },
    draftRevision: null,
    workingSet: {
      visibleNodeIds: nodes.map((node) => node.id),
      pendingExplicitNodeIds: [],
      visibleEdges: [
        { sourceId: first.id, targetId: consumer.id },
        {
          sourceId: second.id,
          targetId: consumer.id,
          inputBindings: { version: 'v1', fields: [] },
        },
      ],
    },
    localNodeCatalog: Object.fromEntries(canonicalNodesById),
  };
}
const producers = new Map(
  [first, second].map((node) => [
    node.id,
    [
      { columnId: 'id', name: 'id', type: 'text' },
      { columnId: 'country', name: 'country', type: 'text' },
    ],
  ])
);

describe('consumer Input binding command', () => {
  it('projects transfer candidates from publication, never from an alias or hidden physical field', () => {
    const truth = buildCanvasNodePresentationTruth({ node: first, nodes, edges: [] });
    const columns = {
      ...truth.columns,
      visible: [
        {
          name: 'Customer alias',
          sourceFieldName: 'id',
          type: 'text',
          provenance: 'declared' as const,
          selected: true,
        },
        { name: 'country', type: 'text', provenance: 'declared' as const, selected: false },
      ],
    };
    expect(projectCanvasPublishedInputFields(first, { ...truth, columns })).toEqual([
      { columnId: 'id', name: 'Customer alias', type: 'text' },
    ]);
    for (const state of ['pending', 'unavailable'] as const) {
      expect(
        projectCanvasPublishedInputFields(first, { ...truth, columns: { ...columns, state } })
      ).toEqual([]);
    }
  });
  it('atomically connects a producer with only the dragged field and keeps other bindings and gates', async () => {
    const draftSession = session();
    draftSession.workingSet.visibleEdges = [
      {
        sourceId: first.id,
        targetId: consumer.id,
        executionGate: 'closed',
        inputBindings: { version: 'v1', fields: [{ inputId: 'original', producerFieldId: 'id' }] },
      },
    ];
    const before = structuredClone(draftSession);
    const args = {
      draftSession,
      canonicalNodesById,
      pluginPortMap: getPluginPortMap(),
      source: { nodeId: second.id, columnId: 'country' },
      target: { nodeId: consumer.id },
    };
    const result = await bindCanvasInputField(args);
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') throw new Error('Expected one-field admission');
    expect(result.draftSession.workingSet.visibleEdges).toEqual([
      before.workingSet.visibleEdges[0],
      {
        sourceId: second.id,
        targetId: consumer.id,
        inputBindings: {
          version: 'v1',
          fields: [
            { inputId: canvasInputSlotId(second.id, 'country'), producerFieldId: 'country' },
          ],
        },
      },
    ]);
    expect(result.draftSession.localNodeCatalog).toBe(draftSession.localNodeCatalog);
    expect(draftSession).toEqual(before);
    expect(await bindCanvasInputField({ ...args, draftSession: result.draftSession })).toEqual(
      result
    );
  });

  it.each(['missing', 'cycle', 'policy', 'readonly', 'hidden', 'self', 'aborted'])(
    'does not create a dependency on rejected field admission: %s',
    async (reason) => {
      const draftSession = session();
      draftSession.workingSet.visibleEdges =
        reason === 'cycle' ? [{ sourceId: consumer.id, targetId: second.id }] : [];
      if (reason === 'hidden') draftSession.workingSet.visibleNodeIds = [first.id, consumer.id];
      const before = structuredClone(draftSession);
      const abort = new AbortController();
      if (reason === 'aborted') abort.abort();
      const result = bindCanvasInputField({
        draftSession,
        canonicalNodesById,
        pluginPortMap: reason === 'policy' ? new Map() : getPluginPortMap(),
        editable: reason !== 'readonly',
        signal: abort.signal,
        source: {
          nodeId: reason === 'self' ? consumer.id : second.id,
          columnId: reason === 'missing' ? 'absent' : 'id',
        },
        target: { nodeId: consumer.id },
      });
      if (reason === 'aborted') await expect(result).rejects.toThrow();
      else expect(await result).toMatchObject({ outcome: 'rejected' });
      expect(draftSession).toEqual(before);
    }
  );
  it('keeps mappings through reconciliation snapshots and independently merges a remote gate', () => {
    const base = { sourceId: first.id, targetId: consumer.id };
    const inputBindings = {
      version: 'v1' as const,
      fields: [{ inputId: 'slot', producerFieldId: 'country' }],
    };
    const local = { ...base, inputBindings };
    const remote = { ...base, executionGate: 'closed' as const };
    expect(canvasDraftEdgeExecutionGate.mergeRemote(local, base, remote)).toEqual({
      ...local,
      executionGate: 'closed',
    });
    expect(buildCanvasCanonicalSnapshot([], [local]).canonicalEdges).toEqual([local]);
  });
  it('maps a second producer without changing consumer operations or Output', async () => {
    const draftSession = session();
    const authored = authoredConsumer();
    draftSession.localNodeCatalog![consumer.id] = authored;
    const before = JSON.stringify(authored.metadata?.transformAuthoring);
    const result = await bindCanvasInputField({
      draftSession,
      canonicalNodesById,
      source: { nodeId: second.id, columnId: 'id' },
      target: { nodeId: consumer.id },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.draftSession.localNodeCatalog).toBe(draftSession.localNodeCatalog);
    expect(result.draftSession.workingSet.visibleEdges[0]?.inputBindings).toBeUndefined();
    expect(
      JSON.stringify(
        result.draftSession.localNodeCatalog?.[consumer.id]?.metadata?.transformAuthoring
      )
    ).toBe(before);
    const inputs = projectCanvasInputBindings({
      targetNodeId: consumer.id,
      edges: result.draftSession.workingSet.visibleEdges,
      producers,
    });
    expect(inputs.map((input) => input.source)).toEqual([
      { nodeId: first.id, columnId: 'id' },
      { nodeId: first.id, columnId: 'country' },
      { nodeId: second.id, columnId: 'id' },
    ]);
    expect(new Set(inputs.map((input) => input.inputId)).size).toBe(3);
  });
  it('persists bindings through workspace serialization and working-set hydration', async () => {
    const result = await bindCanvasInputField({
      draftSession: session(),
      canonicalNodesById,
      source: { nodeId: second.id, columnId: 'country' },
      target: { nodeId: consumer.id },
    });
    if (result.outcome !== 'applied') throw new Error('Expected Input mapping.');
    const draft = WorkspaceGraphAuthoringDraftSchema.parse(
      JSON.parse(
        JSON.stringify(
          buildCanvasAuthoringDraft({
            canvas: { kind: 'transformation', title: 'Canvas' },
            nodeIds: nodes.map((node) => node.id),
            nodePositions: Object.fromEntries(nodes.map((node) => [node.id, { x: 0, y: 0 }])),
            canonicalNodes: nodes,
            canonicalEdges: [],
            visibleEdges: result.draftSession.workingSet.visibleEdges,
          })
        )
      )
    );
    const restored = canvasDraftSession.workingSet.buildFromDraft(draft);
    expect(restored.visibleEdges).toEqual(result.draftSession.workingSet.visibleEdges);
    expect(
      projectCanvasInputBindings({ targetNodeId: consumer.id, edges: draft.edges, producers })[2]
        ?.inputId
    ).toBe(canvasInputSlotId(second.id, 'country'));
  });
  it('removes one unconsumed Input without removing a dependency or writing outputs', async () => {
    const draftSession = session();
    const result = await removeCanvasInputField({
      draftSession,
      canonicalNodesById,
      target: { nodeId: consumer.id, inputId: canvasInputSlotId(first.id, 'id') },
    });
    expect(result.outcome).toBe('applied');
    if (result.outcome !== 'applied') return;
    expect(result.draftSession.localNodeCatalog).toBe(draftSession.localNodeCatalog);
    expect(result.draftSession.workingSet.visibleEdges).toHaveLength(2);
    expect(result.draftSession.workingSet.visibleEdges[0]?.inputBindings?.fields).toEqual([
      { inputId: canvasInputSlotId(first.id, 'country'), producerFieldId: 'country' },
    ]);
  });
  it('rejects unconnected or unknown published fields', async () => {
    const draftSession = session();
    draftSession.workingSet.visibleEdges = draftSession.workingSet.visibleEdges.slice(0, 1);
    expect(
      await bindCanvasInputField({
        draftSession,
        canonicalNodesById,
        source: { nodeId: second.id, columnId: 'id' },
        target: { nodeId: consumer.id },
      })
    ).toMatchObject({ outcome: 'rejected', reason: 'source_not_connected' });
    expect(
      await bindCanvasInputField({
        draftSession,
        canonicalNodesById,
        source: { nodeId: first.id, columnId: 'missing' },
        target: { nodeId: consumer.id },
      })
    ).toMatchObject({ outcome: 'rejected', reason: 'source_column_not_found' });
  });
  it('rejects a forged target slot and read-only mutation', async () => {
    const args = {
      draftSession: session(),
      canonicalNodesById,
      source: { nodeId: first.id, columnId: 'id' },
      target: { nodeId: consumer.id, inputId: 'output-field' },
    };
    expect(await bindCanvasInputField(args)).toMatchObject({
      outcome: 'rejected',
      reason: 'mapping_not_found',
    });
    expect(await bindCanvasInputField({ ...args, editable: false })).toMatchObject({
      outcome: 'rejected',
      reason: 'read_only',
    });
  });
  it.each([
    { sql: 'select id from clients' },
    { authority: 'dbt-project-files', dbt: { packageName: 'analytics' } },
  ])('never changes other authoring authorities (%j)', async (metadata) => {
    const draftSession = session();
    draftSession.localNodeCatalog![consumer.id] = { ...consumer, metadata };
    const before = JSON.stringify(draftSession);
    expect(
      await bindCanvasInputField({
        draftSession,
        canonicalNodesById,
        source: { nodeId: second.id, columnId: 'id' },
        target: { nodeId: consumer.id },
      })
    ).toMatchObject({ outcome: 'rejected' });
    expect(JSON.stringify(draftSession)).toBe(before);
  });
  it('keeps missing producer fields unresolved under the same Input identity', () => {
    const inputId = canvasInputSlotId(second.id, 'removed-field');
    const result = projectCanvasInputBindings({
      targetNodeId: consumer.id,
      producers,
      edges: [
        {
          sourceId: second.id,
          targetId: consumer.id,
          inputBindings: { version: 'v1', fields: [{ inputId, producerFieldId: 'removed-field' }] },
        },
      ],
    });
    expect(result).toEqual([
      {
        inputId,
        source: { nodeId: second.id, columnId: 'removed-field' },
        name: 'removed-field',
        type: 'unknown',
        state: 'unresolved',
      },
    ]);
  });
  it('never removes a semantic Read input by silently changing its published outputs', async () => {
    const draftSession = session();
    draftSession.localNodeCatalog![consumer.id] = authoredConsumer();
    const before = JSON.stringify(draftSession);
    expect(
      await removeCanvasInputField({
        draftSession,
        canonicalNodesById,
        target: { nodeId: consumer.id, inputId: canvasInputSlotId(first.id, 'id') },
      })
    ).toMatchObject({ outcome: 'rejected', reason: 'input_in_use' });
    expect(JSON.stringify(draftSession)).toBe(before);
  });
  it('reads only published model outputs using stable IDs, never excluded fields or aliases as identity', async () => {
    const authored = authoredConsumer();
    const fields = await readCanvasPublishedInputFields({
      node: authored,
      nodes: [first, authored],
      edges: [{ sourceId: first.id, targetId: authored.id }],
    });
    expect(fields).toEqual([{ columnId: 'published-id', name: 'alias', type: 'text' }]);
  });
  it('keeps explicit bindings through edge replacement and execution-gate changes', () => {
    const draftSession = session();
    const inputBindings = {
      version: 'v1' as const,
      fields: [{ inputId: 'slot', producerFieldId: 'country' }],
    };
    draftSession.workingSet.visibleEdges[0]!.inputBindings = inputBindings;
    const replaced = canvasDraftSession.workingSet.replaceEdges(draftSession, [
      { sourceId: first.id, targetId: consumer.id },
    ]);
    expect(replaced.workingSet.visibleEdges[0]?.inputBindings).toEqual(inputBindings);
    const closed = canvasDraftSession.workingSet.setEdgeExecutionGate(replaced, {
      sourceId: first.id,
      targetId: consumer.id,
      gate: 'closed',
    });
    expect(closed.workingSet.visibleEdges[0]?.inputBindings).toEqual(inputBindings);
  });
});
