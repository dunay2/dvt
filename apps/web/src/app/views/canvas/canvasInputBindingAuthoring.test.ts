/**
 * Owned concern: prove existing Input admission and explicit retained producer identity repair.
 * @baseline ADR-0064 / GH-3628: a replacement publication has a new stable FieldId.
 * @decision Exercise real commands and preserve both aggregate components on rejection.
 * @consequence Implicit and explicit repairs retain consumer semantics through successive edits.
 * @version 1.1.0
 */
/**
 * Owned concern: prove exact Input provenance and atomic repair of retained producer references.
 * @baseline ADR-0064 / GH-3628: new publication IDs never replace consumer identities implicitly.
 * @decision Exercise real documents, partial repair and unchanged rejected aggregates.
 * @consequence Schema, scope and publication failures cannot leave half-written bindings.
 * @version 1.0.0
 */
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
import {
  createProducerInput,
  deriveSubstraitSchemas,
  resolveProducerInput,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { createSourceDocument } from './canvasSourceDocument';
import { SOURCE, TRANSFORM } from './canvasOutputProjection.test-support';
import { resolveDvtSubstraitProjectionSource } from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

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

function repairFixture(explicit = false): Readonly<{
  document: SubstraitDocument;
  draftSession: CanvasDraftSession;
  inputId: string;
  publisher: CanonicalNode;
  retained: CanonicalNode;
}> {
  const source = resolveDvtSubstraitProjectionSource(SOURCE)!;
  const publication = (prefix: string): SubstraitDocument =>
    createDvtSubstraitProjectionDraft({
      source,
      targetNodeId: 'publisher',
      outputs: ['order_id', 'customer'].map((name) => ({
        fieldId: `${prefix}:${name}`,
        name,
        sourceFieldName: name,
      })),
    });
  const retainedRead = createProducerInput(
    { nodeId: 'publisher', name: 'Publisher', document: publication('old') },
    1
  );
  const document = createSourceDocument([retainedRead], retainedRead);
  const publisher = applyDvtSubstraitSemanticDocument(
    { ...TRANSFORM, id: 'publisher' },
    encodeDvtSubstraitSemanticDocument(publication('new'))
  );
  const retained = applyDvtSubstraitSemanticDocument(
    consumer,
    encodeDvtSubstraitSemanticDocument(document)
  );
  const inputId = explicit
    ? 'stable-original-slot'
    : canvasInputSlotId(publisher.id, 'old:order_id');
  const draftSession: CanvasDraftSession = {
    ...session(),
    localNodeCatalog: { [SOURCE.id]: SOURCE, publisher, consumer: retained },
    workingSet: {
      visibleNodeIds: [SOURCE.id, publisher.id, consumer.id],
      pendingExplicitNodeIds: [],
      visibleEdges: [
        { sourceId: SOURCE.id, targetId: publisher.id },
        {
          sourceId: publisher.id,
          targetId: consumer.id,
          ...(explicit
            ? {
                inputBindings: {
                  version: 'v1' as const,
                  fields: [{ inputId, producerFieldId: 'old:order_id' }],
                },
              }
            : {}),
        },
      ],
    },
  };
  return { document, draftSession, inputId, publisher, retained };
}

describe('explicit repair of retained model Input identities', () => {
  it.each([false, true])(
    'repairs a consumed missing identity atomically (explicit edge: %s)',
    async (explicit) => {
      const fixture = repairFixture(explicit);
      const before = structuredClone(fixture.draftSession);
      const result = await bindCanvasInputField({
        draftSession: fixture.draftSession,
        canonicalNodesById: new Map(Object.entries(fixture.draftSession.localNodeCatalog!)),
        source: { nodeId: fixture.publisher.id, columnId: 'new:order_id' },
        target: { nodeId: consumer.id, inputId: fixture.inputId },
      });
      expect(result.outcome).toBe('applied');
      if (result.outcome !== 'applied') throw new Error('Expected admitted repair');
      const repaired = decodeDvtSubstraitSemanticDocument(
        readDvtTransformAuthoringAuthority(result.draftSession.localNodeCatalog!.consumer!)!
          .semanticDocument
      );
      expect(repaired.plan).toEqual(fixture.document.plan);
      expect(repaired.sidecar.fields).toEqual(fixture.document.sidecar.fields);
      expect(repaired.sidecar.relations[0]!.producerRef!.fields).toEqual(
        fixture.document.sidecar.relations[0]!.producerRef!.fields.map((mapping) => ({
          ...mapping,
          producerFieldId:
            mapping.producerFieldId === 'old:order_id' ? 'new:order_id' : mapping.producerFieldId,
        }))
      );
      expect(result.draftSession.workingSet.visibleEdges[1]!.inputBindings!.fields).toContainEqual({
        inputId: fixture.inputId,
        producerFieldId: 'new:order_id',
      });
      expect(fixture.draftSession).toEqual(before);
    }
  );
  it('repairs successive missing slots while retaining their original IDs after the edge becomes explicit', async () => {
    const fixture = repairFixture();
    let current = fixture.draftSession;
    for (const name of ['order_id', 'customer']) {
      const result = await bindCanvasInputField({
        draftSession: current,
        canonicalNodesById: new Map(Object.entries(fixture.draftSession.localNodeCatalog!)),
        source: { nodeId: fixture.publisher.id, columnId: `new:${name}` },
        target: {
          nodeId: consumer.id,
          inputId: canvasInputSlotId(fixture.publisher.id, `old:${name}`),
        },
      });
      expect(result.outcome).toBe('applied');
      if (result.outcome !== 'applied') throw new Error('Expected admitted repair');
      current = result.draftSession;
    }
    const repaired = decodeDvtSubstraitSemanticDocument(
      readDvtTransformAuthoringAuthority(current.localNodeCatalog!.consumer!)!.semanticDocument
    );
    const published = decodeDvtSubstraitSemanticDocument(
      readDvtTransformAuthoringAuthority(fixture.publisher)!.semanticDocument
    );
    const index = deriveSubstraitSchemas(repaired).index;
    expect(() => resolveProducerInput(index.relations.get(index.rootId)!, published)).not.toThrow();
    expect(current.workingSet.visibleEdges[1]!.inputBindings!.fields).toEqual(
      ['order_id', 'customer'].map((name) => ({
        inputId: canvasInputSlotId(fixture.publisher.id, `old:${name}`),
        producerFieldId: `new:${name}`,
      }))
    );
    expect(repaired.plan).toEqual(fixture.document.plan);
    expect(repaired.sidecar.fields).toEqual(fixture.document.sidecar.fields);
  });
  it.each(['type', 'foreign', 'consumed-duplicate', 'forged', 'readonly', 'aborted'])(
    'rejects %s atomically',
    async (scenario) => {
      const fixture = repairFixture();
      let source = { nodeId: fixture.publisher.id, columnId: 'new:order_id' };
      let inputId = fixture.inputId;
      if (scenario === 'type') source = { ...source, columnId: 'new:customer' };
      if (scenario === 'foreign') source = { nodeId: SOURCE.id, columnId: 'order_id' };
      if (scenario === 'forged') inputId = 'not-a-retained-slot';
      if (scenario === 'consumed-duplicate') {
        const retained = decodeDvtSubstraitSemanticDocument(
          readDvtTransformAuthoringAuthority(fixture.retained)!.semanticDocument
        );
        retained.sidecar.relations[0]!.producerRef!.fields[1]!.producerFieldId = 'new:order_id';
        fixture.draftSession.localNodeCatalog!.consumer = applyDvtSubstraitSemanticDocument(
          fixture.retained,
          encodeDvtSubstraitSemanticDocument(retained)
        );
      }
      const before = structuredClone(fixture.draftSession);
      const signal = scenario === 'aborted' ? AbortSignal.abort() : undefined;
      const result = bindCanvasInputField({
        draftSession: fixture.draftSession,
        canonicalNodesById: new Map(Object.entries(fixture.draftSession.localNodeCatalog!)),
        source,
        target: { nodeId: consumer.id, inputId },
        editable: scenario !== 'readonly',
        signal,
      });
      if (scenario === 'aborted') await expect(result).rejects.toThrow();
      else expect(await result).toMatchObject({ outcome: 'rejected' });
      expect(fixture.draftSession).toEqual(before);
    }
  );
});

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
