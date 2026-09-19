import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtNodeAuthoringMetadata } from './canvasDvtAuthoringModel';
import {
  appendDvtSubstraitJoinInput,
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  resolveDvtSubstraitJoinEntry,
  resolveDvtSubstraitJoinAppendCandidates,
} from './canvasDvtSubstraitJoinSourceResolution';

function sourceNode(args: {
  id: string;
  table: string;
  connectionId?: string;
  columns: readonly string[];
}): CanonicalNode {
  return {
    id: args.id,
    name: args.table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      schema: 'raw',
      tableName: args.table,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: args.connectionId ?? 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: `raw.${args.table}`,
      },
      columns: args.columns.map((name) => ({ name, type: 'string' })),
    },
  };
}

function joinSource(
  node: CanonicalNode
): Parameters<typeof createDvtSubstraitJoinDraft>[0]['left'] {
  const metadata = node.metadata!;
  return {
    nodeId: node.id,
    schema: metadata.schema as string,
    table: metadata.tableName as string,
    sourceRef: metadata.connectedSourceRef as never,
  };
}

describe('canvasDvtSubstraitJoinSourceResolution', () => {
  function fixture(): {
    targetNode: CanonicalNode;
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
    draft: ReturnType<typeof createDvtSubstraitJoinDraft>;
  } {
    const customers = sourceNode({
      id: 'customers',
      table: 'customers',
      columns: ['customer_id', 'name'],
    });
    const orders = sourceNode({
      id: 'orders',
      table: 'orders',
      columns: ['order_id', 'customer_id'],
    });
    const payments = sourceNode({
      id: 'payments',
      table: 'payments',
      columns: ['payment_id', 'customer_id'],
    });
    const shipments = sourceNode({
      id: 'shipments',
      table: 'shipments',
      connectionId: 'warehouse-other',
      columns: ['shipment_id', 'customer_id'],
    });
    const target: CanonicalNode = {
      id: 'join',
      name: 'Join',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    };
    const draft = createDvtSubstraitJoinDraft({
      left: joinSource(customers),
      right: joinSource(orders),
      targetNodeId: target.id,
    });

    return {
      targetNode: target,
      nodes: [customers, orders, payments, shipments, target],
      edges: [
        { id: 'e-customers', sourceId: customers.id, targetId: target.id, relation: 'lineage' },
        { id: 'e-orders', sourceId: orders.id, targetId: target.id, relation: 'lineage' },
        { id: 'e-payments', sourceId: payments.id, targetId: target.id, relation: 'lineage' },
        { id: 'e-shipments', sourceId: shipments.id, targetId: target.id, relation: 'lineage' },
      ] satisfies CanonicalEdge[],
      draft,
    };
  }

  function binaryFixture(): ReturnType<typeof fixture> {
    const args = fixture();
    args.edges = args.edges.filter(
      (edge) => edge.sourceId === 'customers' || edge.sourceId === 'orders'
    );
    return args;
  }

  function persistDraft(
    targetNode: CanonicalNode,
    draft: ReturnType<typeof createDvtSubstraitJoinDraft>
  ): CanonicalNode {
    return applyDvtNodeAuthoringMetadata(targetNode, {
      kind: 'transform',
      materialized: 'view',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      shape: 'inner_join',
      plan: draft.plan,
      sidecar: draft.sidecar,
    });
  }

  it('returns only connected, same-connection Sources not already present in the JOIN draft', () => {
    const args = fixture();
    const unconnected = sourceNode({ id: 'unconnected', table: 'unconnected', columns: ['id'] });
    args.nodes.push(unconnected);
    args.edges.push({
      id: 'elsewhere',
      sourceId: unconnected.id,
      targetId: 'elsewhere',
      relation: 'lineage',
    });
    const candidates = resolveDvtSubstraitJoinAppendCandidates(args);

    expect(candidates).toEqual([
      expect.objectContaining({
        source: joinSource(args.nodes[2]!),
        fields: ['payment_id', 'customer_id'],
      }),
    ]);
  });

  it('orders by table then node ID without mutating graph, plan, sidecar or identities', () => {
    const args = fixture();
    const additions = [
      sourceNode({ id: 'z', table: 'a', columns: ['id'] }),
      sourceNode({ id: 'a', table: 'a', columns: ['id'] }),
      { ...args.nodes[0]!, id: 'same-source-another-node' },
    ];
    args.nodes.push(...additions);
    args.edges.push(
      ...additions.map((node): CanonicalEdge => ({
        id: node.id,
        sourceId: node.id,
        targetId: 'join',
        relation: 'lineage',
      }))
    );
    const before = structuredClone(args);
    const candidates = resolveDvtSubstraitJoinAppendCandidates(args);
    expect(candidates.map((input) => input.source.nodeId)).toEqual(['a', 'z', 'payments']);
    expect(
      resolveDvtSubstraitJoinAppendCandidates({
        ...args,
        nodes: [...args.nodes].reverse(),
        edges: [...args.edges].reverse(),
      })
    ).toEqual(candidates);
    expect(args).toEqual(before);
  });

  it('resolves the historical binary JOIN independently of node and edge order without mutation', () => {
    const args = binaryFixture();
    const expected = {
      left: joinSource(args.nodes[0]!),
      right: joinSource(args.nodes[1]!),
      targetNodeId: 'join',
    };
    const before = structuredClone(args);

    expect(resolveDvtSubstraitJoinEntry(args)).toEqual(expected);
    expect(
      resolveDvtSubstraitJoinEntry({
        ...args,
        nodes: [...args.nodes].reverse(),
        edges: [...args.edges].reverse(),
      })
    ).toEqual(expected);
    expect(args).toEqual(before);
  });

  it('rejects binary JOIN graph ambiguity and incompatible source connections', () => {
    const ambiguous = fixture();
    ambiguous.edges = ambiguous.edges.filter((edge) => edge.sourceId !== 'shipments');
    expect(resolveDvtSubstraitJoinEntry(ambiguous)).toBeNull();

    const incompatible = binaryFixture();
    incompatible.nodes[1] = sourceNode({
      id: 'orders',
      table: 'orders',
      connectionId: 'warehouse-other',
      columns: ['order_id', 'customer_id'],
    });
    expect(resolveDvtSubstraitJoinEntry(incompatible)).toBeNull();
  });

  it('requires persisted binary authority to match the connected graph identities', () => {
    const args = binaryFixture();
    args.targetNode = persistDraft(args.targetNode, args.draft);

    expect(resolveDvtSubstraitJoinEntry({ ...args, requirePersistedAuthority: true })).toEqual({
      left: joinSource(args.nodes[0]!),
      right: joinSource(args.nodes[1]!),
      targetNodeId: 'join',
    });

    args.nodes[1] = sourceNode({
      id: 'orders',
      table: 'orders_v2',
      columns: ['order_id', 'customer_id'],
    });
    expect(resolveDvtSubstraitJoinEntry({ ...args, requirePersistedAuthority: true })).toBeNull();
  });

  it('does not admit valid N-input JOIN authority as the historical binary entry', () => {
    const args = binaryFixture();
    const inspection = inspectDvtSubstraitJoinDraft(args.draft);
    if (!inspection.ok) throw new Error('Expected valid binary JOIN fixture.');
    const leftCustomerId = inspection.projection.outputs.find(
      (output) => output.source.inputIndex === 0 && output.source.name === 'customer_id'
    )?.source.fieldId;
    if (leftCustomerId == null) throw new Error('Expected customer_id source identity.');
    const payment = args.nodes[2]!;
    const nInputDraft = appendDvtSubstraitJoinInput(args.draft, {
      source: joinSource(payment),
      fields: ['payment_id', 'customer_id'],
      predicate: { leftSourceFieldId: leftCustomerId, rightFieldName: 'customer_id' },
      selectedFields: ['payment_id'],
    });
    expect(inspectDvtSubstraitJoinDraft(nInputDraft).ok).toBe(true);
    args.targetNode = persistDraft(args.targetNode, nInputDraft);

    expect(resolveDvtSubstraitJoinEntry({ ...args, requirePersistedAuthority: true })).toBeNull();
  });

  it.each([
    [[], []],
    [
      [
        { name: ' id ', type: 'string' },
        { name: 'id', type: 'string' },
      ],
      ['id', 'id'],
    ],
    [[{ name: 'id', type: 'text' }], null],
    [[{ name: 'id', dataType: 'string' }], null],
    [[{ name: 'id', type: 'numeric' }], null],
    [[{ name: ' ', type: 'string' }], null],
    [[null], null],
    [[[]], null],
    [undefined, null],
  ])('preserves historical column admission for %j', (columns, fields) => {
    const args = fixture();
    args.nodes[2] = { ...args.nodes[2]!, metadata: { ...args.nodes[2]!.metadata, columns } };
    const candidates = resolveDvtSubstraitJoinAppendCandidates(args);
    expect(candidates.map((input) => input.fields)).toEqual(fields == null ? [] : [fields]);
  });

  it.each([{ kind: 'dvt:transform' }, { role: 'transform' }, { metadata: {} }])(
    'rejects an invalid Source %j',
    (patch) => {
      const args = fixture();
      args.nodes[2] = { ...args.nodes[2]!, ...patch } as CanonicalNode;
      expect(resolveDvtSubstraitJoinAppendCandidates(args)).toEqual([]);
    }
  );

  it.each([{ pluginId: 'other' }, { kind: 'dvt:source' }, { role: 'input' }])(
    'rejects an invalid target %j',
    (patch) => {
      const args = fixture();
      args.targetNode = { ...args.targetNode, ...patch } as CanonicalNode;
      expect(resolveDvtSubstraitJoinAppendCandidates(args)).toEqual([]);
    }
  );

  it('rejects a stale semantic hash', () => {
    const args = fixture();
    args.draft = {
      ...args.draft,
      sidecar: { ...args.draft.sidecar, semanticPlanSha256: '1'.repeat(64) },
    };
    expect(resolveDvtSubstraitJoinAppendCandidates(args)).toEqual([]);
  });
});
