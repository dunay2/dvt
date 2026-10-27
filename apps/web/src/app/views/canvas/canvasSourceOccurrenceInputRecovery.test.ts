import { describe, expect, it } from 'vitest';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createSourceJoin } from './canvasSourceJoin';
import { source } from './canvasRelationalOperator.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readCanvasInputBindings } from './canvasInputBindings';
import { prepareCanvasSourceOccurrenceInputRecovery } from './canvasSourceOccurrenceInputRecovery';
import { setDvtSourceOutputIncluded } from './canvasDvtSourceSemanticAuthoring';

async function fixture(): Promise<
  Parameters<typeof prepareCanvasSourceOccurrenceInputRecovery>[0] & {
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
  }
> {
  const columns = [
    [
      { name: 'client_id', type: 'text' },
      { name: 'country', type: 'text' },
    ],
    [
      { name: 'order_id', type: 'bigint' },
      { name: 'client_id', type: 'text' },
      { name: 'customer', type: 'text' },
      { name: 'amount', type: 'double' },
    ],
  ];
  const producers: CanonicalNode[] = ['client', 'orders'].map((name, index) => ({
    id: name,
    name,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'public',
      tableName: name,
      connectedSourceRef: source(name).sourceRef,
      columns: columns[index],
    },
  }));
  const initial = createSourceJoin({
    left: {
      source: source('client'),
      fields: ['client_id', 'country'],
      fieldTypes: ['string', 'string'],
    },
    right: {
      source: source('orders'),
      fields: ['order_id', 'client_id', 'customer', 'amount'],
      fieldTypes: ['i64', 'string', 'string', 'fp64'],
    },
    leftFieldName: 'client_id',
    rightFieldName: 'client_id',
    targetNodeId: 'model',
  });
  const session = new CanvasRelationAnalysisSession('legacy-recovery-fixture');
  session.receive(initial);
  const document = await changeSelectedRelationOutputs(session, {
    relationId: session.rootId,
    expectedRevision: 0,
    outputs: [0, 2, 5].map((slot) => ({ slot })),
  });
  session.dispose();
  const model = applyDvtSubstraitSemanticDocument(
    {
      id: 'model',
      name: 'Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {},
    },
    encodeDvtSubstraitSemanticDocument(document)
  );
  const edges: CanonicalEdge[] = producers.map((node, index) => ({
    id: `${node.id}-model`,
    sourceId: node.id,
    targetId: model.id,
    relation: 'lineage',
    metadata: {
      inputBindings: {
        version: 'v1',
        fields: (index === 0 ? ['client_id'] : ['order_id', 'client_id', 'amount']).map((name) => ({
          inputId: `input:${node.id}:${name}`,
          producerFieldId: name,
        })),
      },
    },
  }));
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  const read = [...indexed.index.relations.values()].find(
    (entry) => entry.binding.displayName === 'client'
  )!;
  const country = read.fields.find((field) => field.displayName === 'country')!;
  return {
    nodeId: model.id,
    nodes: [...producers, model],
    edges,
    document,
    relationId: read.binding.relationId,
    fieldId: country.fieldId,
    sourceNodeId: 'client',
    additions: [],
  };
}

describe('explicit legacy Source Input recovery candidate', () => {
  it('admits the missing published Input and exact occurrence Output without publishing or changing sibling semantics', async () => {
    const args = await fixture();
    const original = structuredClone(args);
    const candidate = await prepareCanvasSourceOccurrenceInputRecovery(args);
    expect(
      readCanvasInputBindings(candidate.edges[0]!)?.fields.map((field) => field.producerFieldId)
    ).toEqual(['client_id', 'country']);
    expect(candidate.edges[1]).toEqual(args.edges[1]);
    expect(candidate.additions).toEqual([{ nodeId: 'client', columnId: 'country' }]);
    const oracle = new CanvasRelationAnalysisSession('recovered-output');
    oracle.receive(candidate.document);
    expect((await oracle.query(null)).bindings.map((field) => field.displayName)).toEqual([
      'client_id',
      'order_id',
      'amount',
      'country',
    ]);
    const before = indexSubstraitRelations(args.document);
    const after = indexSubstraitRelations(candidate.document);
    if (!before.ok || !after.ok) throw new Error('Expected canonical JOIN documents.');
    for (const [id, entry] of before.index.relations) {
      const actual = after.index.relations.get(id)!;
      if (id !== before.index.rootId) expect(actual).toEqual(entry);
      else if (actual.relation.relType.case === 'join' && entry.relation.relType.case === 'join')
        expect(actual.relation.relType.value.expression).toEqual(
          entry.relation.relType.value.expression
        );
    }
    expect(args).toEqual(original);
    oracle.dispose();
  });

  it.each(['withdrawn', 'disconnected', 'foreign', 'cancelled'] as const)(
    'rejects %s recovery without altering the original graph',
    async (failure) => {
      const args = await fixture();
      if (failure === 'withdrawn') {
        const removed = setDvtSourceOutputIncluded(args.nodes[0]!, 'country', false);
        if (removed.outcome !== 'applied')
          throw new Error('Expected producer publication removal.');
        args.nodes[0] = removed.node;
      }
      if (failure === 'disconnected') args.edges = args.edges.slice(1);
      const sourceNodeId = failure === 'foreign' ? 'orders' : args.sourceNodeId;
      const controller = new AbortController();
      if (failure === 'cancelled') controller.abort();
      const original = structuredClone(args);
      await expect(
        prepareCanvasSourceOccurrenceInputRecovery({
          ...args,
          sourceNodeId,
          signal: controller.signal,
        })
      ).rejects.toThrow();
      expect(args).toEqual(original);
    }
  );
});
