import { describe, expect, it } from 'vitest';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import type { CanonicalNode, CanonicalEdge } from '../../types/canonical';
import { SOURCE, TRANSFORM } from './canvasOutputProjection.test-support';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitProjectionSource,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import { configureCanvasStagedComposition } from './canvasStagedCompositionConfiguration';
import { decodeCanvasStagedOperation } from './canvasStagedOperationDocument';
import { createPendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import { compositionKinds } from './canvasCompositionSequence.test-support';
import { readCanvasStagedCompositionSignature } from './canvasStagedOperation';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { projectDvtSubstraitTransformOutputToPostgresSql } from './canvasDvtSubstraitOutputProjection';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { sourceOccurrenceAppendRejection } from './relational-source-occurrence/sourceOccurrencePolicy';
import { composeSourceRelation } from './canvasComposeSourceRelation';
import { renameSourceOccurrence } from './relational-source-occurrence/renameSourceOccurrence';
import { createCanvasInputRead } from './canvasSourceRelation';

function fixture(
  models: 1 | 2,
  otherConnection = false
): {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  consumer: CanonicalNode;
  targetNodeId: string;
  selectedInputIds: string[];
  inputs: ReturnType<typeof resolveCanvasDvtCompositionInputs>;
} {
  const sources: CanonicalNode[] = ['left', 'right'].map((id) => ({
    ...SOURCE,
    id,
    name: id,
    metadata: {
      ...SOURCE.metadata,
      columns: [
        { name: 'id', type: 'text' },
        { name: 'value', type: 'text' },
      ],
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        sourceObjectId: 'raw.orders',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          provider: 'postgres',
          connectionId: id === 'right' && otherConnection ? 'other' : 'warehouse',
        },
      },
    },
  }));
  const producers = sources.map((source) =>
    applyDvtSubstraitSemanticDocument(
      { ...TRANSFORM, id: 'model-' + source.id, name: 'Model ' + source.id },
      encodeDvtSubstraitSemanticDocument(
        createDvtSubstraitProjectionDraft({
          source: resolveDvtSubstraitProjectionSource(source)!,
          targetNodeId: 'model-' + source.id,
          outputs: ['id', 'value'].map((name) => ({
            fieldId: source.id + ':' + name,
            name,
            sourceFieldName: name,
          })),
        })
      )
    )
  );
  const consumer = { ...TRANSFORM, id: 'consumer' };
  const selectedInputIds = [producers[0]!.id, models === 2 ? producers[1]!.id : sources[1]!.id];
  const edges: CanonicalEdge[] = sources
    .map<CanonicalEdge>((source, i) => ({
      id: 'publish-' + source.id,
      sourceId: source.id,
      targetId: producers[i]!.id,
      relation: 'lineage',
    }))
    .concat(
      selectedInputIds.map<CanonicalEdge>((sourceId) => ({
        id: sourceId + '-consumer',
        sourceId,
        targetId: consumer.id,
        relation: 'lineage',
      }))
    );
  const nodes = [...sources, ...producers, consumer];
  return {
    nodes,
    edges,
    consumer,
    targetNodeId: consumer.id,
    selectedInputIds,
    inputs: resolveCanvasDvtCompositionInputs({ nodes, edges, targetNodeId: consumer.id }),
  };
}

describe('explicit composition consumes producer references', () => {
  it('excludes, reopens and reorders model outputs without changing their producer', async () => {
    const graph = fixture(1);
    const producers = structuredClone(graph.nodes);
    const input = graph.inputs.find((candidate) => candidate.producer != null)!;
    const initial = createCanvasRelationalTreeProjectionDraft({
      input,
      targetNodeId: graph.targetNodeId,
    });
    const session = new CanvasRelationAnalysisSession('consumer', input.producer!.connection);
    const reopened = new CanvasRelationAnalysisSession('reopened', input.producer!.connection);
    try {
      session.receive(initial);
      const root = session.locate(session.rootId, session.revision);
      const readId = root.inputs[0]!;
      const read = await session.query(readId);
      const binding = session.locate(readId, session.revision).binding;
      const outputs = relationOutputSlots(root, [read])
        .filter((slot) => slot.output != null)
        .map(({ slot, name }) => ({ slot, alias: name }));
      expect(outputs).toHaveLength(2);
      const subset = await changeSelectedRelationOutputs(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        outputs: [outputs[0]!],
      });
      expect((await session.query(null)).bindings.map((field) => field.fieldId)).toEqual([
        root.fields[0]!.fieldId,
      ]);
      reopened.receive(
        decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(subset))
      );
      await changeSelectedRelationOutputs(reopened, {
        relationId: reopened.rootId,
        expectedRevision: reopened.revision,
        outputs: [...outputs].reverse(),
      });
      const restored = await reopened.query(null);
      expect(restored.bindings.map((field) => field.displayName)).toEqual(['value', 'id']);
      expect(restored.bindings[1]!.fieldId).toBe(root.fields[0]!.fieldId);
      const reordered = await changeSelectedRelationOutputs(reopened, {
        relationId: reopened.rootId,
        expectedRevision: reopened.revision,
        outputs,
      });
      const result = await reopened.query(null);
      expect(result.bindings.map((field) => field.fieldId)).toEqual(
        [...restored.bindings].reverse().map((field) => field.fieldId)
      );
      expect(result.fields).toEqual(
        deriveSubstraitSchemas(reordered).schemas.get(root.binding.relationId)
      );
      expect(result.fields.map((field) => field.type)).toEqual(
        read.fields.map((field) => field.type)
      );
      expect((await reopened.query(readId)).bindings).toEqual(read.bindings);
      expect(reopened.locate(readId, reopened.revision).binding).toEqual(binding);
      expect(reopened.locate(reopened.rootId, reopened.revision).inputs).toEqual(root.inputs);
      expect(graph.nodes).toEqual(producers);
    } finally {
      session.dispose();
      reopened.dispose();
    }
  });
  it('keeps independent aliases for repeated model inputs without copying their operations', async () => {
    const graph = fixture(2);
    const input = graph.inputs[0]!;
    const initial = createCanvasRelationalTreeProjectionDraft({
      input,
      targetNodeId: graph.targetNodeId,
    });
    const session = new CanvasRelationAnalysisSession('consumer', input.producer!.connection);
    session.receive(initial);
    const composed = await composeSourceRelation(session, {
      input,
      relationId: session.rootId,
      expectedRevision: session.revision,
      operation: 'cross_join',
    });
    const reads = composed.sidecar.relations.filter((binding) => binding.producerRef != null);
    expect(reads).toHaveLength(2);
    expect(new Set(reads.map((binding) => binding.displayName)).size).toBe(2);
    expect(new Set(reads.map((binding) => binding.relationId)).size).toBe(2);
    const renamed = await renameSourceOccurrence(session, {
      relationId: reads[1]!.relationId,
      expectedRevision: session.revision,
      alias: 'Other customer',
    });
    expect(renamed.plan).toEqual(composed.plan);
    expect(
      renamed.sidecar.relations.find((binding) => binding.relationId === reads[1]!.relationId)
    ).toEqual({ ...reads[1], displayName: 'Other customer' });
    await expect(
      renameSourceOccurrence(session, {
        relationId: reads[1]!.relationId,
        expectedRevision: session.revision,
        alias: reads[0]!.displayName!,
      })
    ).rejects.toThrow(/already in use/);
    expect(deriveSubstraitSchemas(renamed).index.relations.size).toBe(4);
    session.dispose();
  });
  it('rejects a pending occurrence with a stale producer FieldId before changing the session', async () => {
    const graph = fixture(2);
    const initial = createCanvasRelationalTreeProjectionDraft({
      input: graph.inputs[0]!,
      targetNodeId: graph.targetNodeId,
    });
    const input = graph.inputs[1]!;
    const session = new CanvasRelationAnalysisSession('consumer', input.producer!.connection);
    session.receive(initial);
    const occurrence = createCanvasInputRead(input, 10);
    occurrence.binding.producerRef!.fields[0]!.producerFieldId = 'removed-field';
    const revision = session.revision;
    await expect(
      composeSourceRelation(session, {
        input,
        occurrence,
        relationId: session.rootId,
        expectedRevision: revision,
        operation: 'cross_join',
      })
    ).rejects.toThrow(/producer field/);
    expect(session.revision).toBe(revision);
    session.dispose();
  });
  it.each([1, 2] as const)(
    'does not clone operations for %i model producers and emits SQL through the existing profile',
    async (models) => {
      const graph = fixture(models);
      const before = JSON.stringify(graph.nodes);
      const sources = graph.inputs.map(createPendingSourceOccurrence);
      for (const operation of [
        'inner_join',
        'cross_join',
        'union_all',
        'union_distinct',
        'intersect_distinct',
        'except_distinct',
      ] as const) {
        const configured = configureCanvasStagedComposition(
          {
            id: 'composition',
            operation,
            inputs: sources.map((source) => source.read.binding.relationId),
          },
          [...graph.inputs].reverse(),
          sources,
          []
        );
        const document = decodeCanvasStagedOperation(configured)!;
        const { index } = deriveSubstraitSchemas(document);
        expect(index.relations.get(index.rootId)!.inputs).toEqual(configured.inputs);
        expect(index.relations.size).toBe(3);
        expect(
          [...index.relations.values()].filter((entry) => entry.binding.producerRef != null)
        ).toHaveLength(models);
        expect(
          [...index.relations.values()].some((entry) => entry.relation.relType.case === 'project')
        ).toBe(false);
        const consumer = applyDvtSubstraitSemanticDocument(
          graph.consumer,
          encodeDvtSubstraitSemanticDocument(document)
        );
        const nodes = graph.nodes.map((node) => (node.id === consumer.id ? consumer : node));
        expect(
          resolveCanvasSubstraitGraphBindings({ node: consumer, nodes, edges: graph.edges })
            .connection.connectionId
        ).toBe('warehouse');
        const sql = await projectDvtSubstraitTransformOutputToPostgresSql({
          transformNode: consumer,
          nodes,
          edges: graph.edges,
        });
        expect(sql.match(/FROM raw\.orders/g)).toHaveLength(2);
      }
      expect(JSON.stringify(graph.nodes)).toBe(before);
    }
  );
  it.each([1, 2] as const)(
    'rejects different execution connections with %i model producers',
    (models) => {
      const graph = fixture(models, true);
      const sources = graph.inputs.map(createPendingSourceOccurrence);
      const before = JSON.stringify({ graph, sources });
      for (const operation of compositionKinds.filter(
        (kind) => readCanvasStagedCompositionSignature(kind).configuration === 'composition'
      )) {
        const pending = {
          id: 'composition',
          operation,
          inputs: sources.map((source) => source.read.binding.relationId),
        };
        const configured = configureCanvasStagedComposition(pending, graph.inputs, sources, []);
        expect(configured).toBe(pending);
        expect(decodeCanvasStagedOperation(configured)).toBeNull();
      }
      expect(JSON.stringify({ graph, sources })).toBe(before);
    }
  );
  it('appends a second model through the canonical composition command and rejects a foreign connection', async () => {
    const graph = fixture(2);
    const initial = createCanvasRelationalTreeProjectionDraft({
      input: graph.inputs[0]!,
      targetNodeId: graph.targetNodeId,
    });
    const first = graph.inputs[0]!.producer!;
    const session = new CanvasRelationAnalysisSession('consumer', first.connection);
    session.receive(initial);
    const request = {
      input: graph.inputs[1]!,
      relationId: session.rootId,
      expectedRevision: session.revision,
      operation: 'cross_join' as const,
    };
    const output = await session.query(null);
    expect(
      sourceOccurrenceAppendRejection({
        editable: true,
        output,
        session,
        revision: session.revision,
        input: request.input,
        operation: request.operation,
      })
    ).toBeNull();
    const foreign = fixture(2, true).inputs[1]!;
    expect(
      sourceOccurrenceAppendRejection({
        editable: true,
        output,
        session,
        revision: session.revision,
        input: foreign,
        operation: request.operation,
      })
    ).toBe('unavailable');
    const document = await composeSourceRelation(session, request);
    expect(deriveSubstraitSchemas(document).index.relations.size).toBe(4);
    expect(
      document.sidecar.relations.filter((binding) => binding.producerRef != null)
    ).toHaveLength(2);
    session.dispose();
  });
});
