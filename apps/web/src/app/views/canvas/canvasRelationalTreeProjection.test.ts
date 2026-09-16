import { describe, expect, it } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  appendDvtSubstraitInnerJoinInput,
  applyDvtSubstraitInnerJoinGrouping,
  createDvtSubstraitInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitJoinSource,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitUnionAllDraft,
  encodeDvtSubstraitUnionAllDocument,
  type DvtSubstraitUnionAllSource,
} from './canvasDvtSubstraitSetComposition';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  projectCanvasRelationalTree,
  type CanvasRelationalTreeNode,
} from './canvasRelationalTreeProjection';

const TARGET_ID = 'transform-orders';

function sourceRef(table: string): ConnectedSourceRef {
  return {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: `public.${table}`,
  };
}

function joinSource(nodeId: string, table: string): DvtSubstraitJoinSource {
  return { nodeId, schema: 'public', table, sourceRef: sourceRef(table) };
}

function sourceNode(nodeId: string, table: string, fields: readonly string[]): CanonicalNode {
  return {
    id: nodeId,
    name: table,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      schema: 'public',
      tableName: table,
      connectedSourceRef: sourceRef(table),
      columns: fields.map((name) => ({ name, type: 'string' })),
    },
  };
}

function targetNode(): CanonicalNode {
  return {
    id: TARGET_ID,
    name: 'Orders',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

function edge(sourceId: string): CanonicalEdge {
  return {
    id: `${sourceId}-${TARGET_ID}`,
    sourceId,
    targetId: TARGET_ID,
    relation: 'lineage',
  };
}

function project(node: CanonicalNode, sources: readonly CanonicalNode[]) {
  return projectCanvasRelationalTree({
    node,
    nodes: [...sources, node],
    edges: sources.map((source) => edge(source.id)),
  });
}

function flatten(root: CanvasRelationalTreeNode): readonly CanvasRelationalTreeNode[] {
  return [root, ...root.children.flatMap((child) => flatten(child.node))];
}

function threeInputJoin(): DvtSubstraitInnerJoinDraft {
  const initial = createDvtSubstraitInnerJoinDraft({
    left: joinSource('customers', 'customers'),
    right: joinSource('orders', 'orders'),
    targetNodeId: TARGET_ID,
  });
  const inspection = inspectDvtSubstraitNInputJoinDraft(initial);
  if (!inspection.ok) throw new Error('Expected an admitted base JOIN.');
  const customerId = inspection.projection.outputs.find((output) => output.name === 'customer_id')
    ?.source.fieldId;
  if (customerId == null) throw new Error('Expected the customer_id output.');
  return appendDvtSubstraitInnerJoinInput(initial, {
    source: joinSource('shipments', 'shipments'),
    fields: ['shipment_id', 'customer_id'],
    predicate: { leftSourceFieldId: customerId, rightFieldName: 'customer_id' },
    selectedFields: ['shipment_id'],
  });
}

describe('ProjectCanvasRelationalTree', () => {
  it('projects a recursive N-input JOIN with canonical child order and stable identity', () => {
    const draft = threeInputJoin();
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitInnerJoinDocument(draft)
    );
    const sources = [
      sourceNode('customers', 'customers', ['customer_id', 'name', 'country']),
      sourceNode('orders', 'orders', ['order_id', 'customer_id', 'amount']),
      sourceNode('shipments', 'shipments', ['shipment_id', 'customer_id']),
    ];

    const first = project(transform, sources);
    const second = project(structuredClone(transform), structuredClone(sources));
    expect(first).toEqual(second);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.projection.root.operator).toBe('join');
    expect(first.projection.root.children.map((child) => child.role)).toEqual(['left', 'right']);
    expect(first.projection.root.children[0]?.node.operator).toBe('join');
    expect(first.projection.inputs.map((input) => input.state)).toEqual([
      'participating',
      'participating',
      'participating',
    ]);
    const relationIds = new Set(draft.sidecar.relations.map((relation) => relation.relationId));
    for (const relation of flatten(first.projection.root)) {
      expect(relation.locator).toContain(first.projection.semanticDigest);
      expect(relation.relationId == null || relationIds.has(relation.relationId)).toBe(true);
    }
  });

  it('projects every ordered child of an N-ary SetRel', () => {
    const inputs: readonly DvtSubstraitUnionAllSource[] = [
      'north_customers',
      'south_customers',
      'west_customers',
    ].map((table) => ({
      nodeId: table,
      schema: 'public',
      table,
      fields: ['customer_id', 'name', 'country'].map((name) => ({
        name,
        type: 'string' as const,
      })),
      sourceRef: sourceRef(table),
    }));
    const draft = createDvtSubstraitUnionAllDraft({ inputs, targetNodeId: TARGET_ID });
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitUnionAllDocument(draft)
    );
    const result = project(
      transform,
      inputs.map((input) =>
        sourceNode(
          input.nodeId,
          input.table,
          input.fields.map((field) => field.name)
        )
      )
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projection.root.operator).toBe('set');
    expect(result.projection.root.children.map(({ role, ordinal }) => ({ role, ordinal }))).toEqual(
      [
        { role: 'primary', ordinal: 0 },
        { role: 'secondary', ordinal: 1 },
        { role: 'secondary', ordinal: 2 },
      ]
    );
  });

  it('keeps an AggregateRel as a unary operator over a binary JOIN', () => {
    const initial = createDvtSubstraitInnerJoinDraft({
      left: joinSource('customers', 'customers'),
      right: joinSource('orders', 'orders'),
      targetNodeId: TARGET_ID,
    });
    const inspection = inspectDvtSubstraitNInputJoinDraft(initial);
    if (!inspection.ok) throw new Error('Expected an admitted JOIN.');
    const groupFieldId = inspection.projection.outputs.find(
      (output) => output.name === 'name'
    )?.fieldId;
    if (groupFieldId == null) throw new Error('Expected the name output.');
    const grouped = applyDvtSubstraitInnerJoinGrouping(initial, {
      groupFieldId,
      countOutputName: 'customer_count',
    });
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitInnerJoinDocument(grouped)
    );
    const result = project(transform, [
      sourceNode('customers', 'customers', ['customer_id', 'name', 'country']),
      sourceNode('orders', 'orders', ['order_id', 'customer_id', 'amount']),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.projection.root.operator).toBe('aggregate');
    expect(result.projection.root.children).toHaveLength(1);
    expect(result.projection.root.children[0]).toMatchObject({
      role: 'input',
      ordinal: 0,
      node: { operator: 'join' },
    });
    expect(result.projection.output.fields).toHaveLength(2);
  });

  it('classifies topology-only and canonical-only sources without fabricating children', () => {
    const draft = createDvtSubstraitInnerJoinDraft({
      left: joinSource('customers', 'customers'),
      right: joinSource('orders', 'orders'),
      targetNodeId: TARGET_ID,
    });
    const transform = applyDvtSubstraitSemanticDocument(
      targetNode(),
      encodeDvtSubstraitInnerJoinDocument(draft)
    );
    const result = project(transform, [
      sourceNode('customers', 'customers', ['customer_id', 'name', 'country']),
      sourceNode('payments', 'payments', ['payment_id', 'customer_id']),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.projection.inputs.map(({ sourceRef: ref, state }) => ({
        source: ref.sourceObjectId,
        state,
      }))
    ).toEqual([
      { source: 'public.customers', state: 'participating' },
      { source: 'public.orders', state: 'missing' },
      { source: 'public.payments', state: 'pending' },
    ]);
    expect(flatten(result.projection.root).filter((node) => node.operator === 'read')).toHaveLength(
      2
    );
  });

  it('returns one explicit failure for invalid canonical authority', () => {
    const invalid = {
      ...targetNode(),
      metadata: {
        transformAuthoring: {
          version: 'v1',
          mode: 'substrait',
          semanticDocument: { broken: true },
        },
      },
    } satisfies CanonicalNode;

    expect(() => project(invalid, [])).not.toThrow();
    expect(project(invalid, [])).toEqual({
      ok: false,
      failure: { code: 'invalid-semantic-authority' },
    });
  });
});
