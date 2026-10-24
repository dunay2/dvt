import { describe, expect, it, vi } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { createDbtNodeAuthoringMetadata } from './canvasDbtAuthoringModel';
import { createDbtModelArtifactProjector } from './canvasDbtModelArtifactProjection';
import { buildDbtWorkspaceArtifacts } from './canvasDbtWorkspaceArtifacts';
import * as sqlIdentifier from './canvasSqlIdentifier';

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres',
        provider: 'postgres',
      },
      sourceObjectId: 'relation/raw/orders',
    },
    sourceName: 'raw',
    schema: 'raw',
    tableName: 'orders',
    columns: [
      { name: 'order_id', type: 'integer' },
      { name: 'customer', type: 'text' },
    ],
  },
};

function model(
  id: string,
  selectedSourceId: string,
  projectionColumns?: readonly Readonly<{ name: string; output: boolean }>[]
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      dbt: {
        selectedSourceId,
        ...(projectionColumns == null ? {} : { projectionColumns }),
      },
    },
  };
}

function projectionGraph(shape: 'chain' | 'fan-out'): {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
  first: CanonicalNode;
  second: CanonicalNode;
  third: CanonicalNode;
} {
  const first = model('model-1', source.id, [
    { name: 'customer', output: true },
    { name: 'order_id', output: false },
  ]);
  const second = model('model-2', first.id);
  const third = model('model-3', shape === 'chain' ? second.id : first.id);
  const nodes = [source, first, second, third];
  const edges: CanonicalEdge[] = [
    { id: 'e1', sourceId: source.id, targetId: first.id, relation: 'lineage' },
    { id: 'e2', sourceId: first.id, targetId: second.id, relation: 'lineage' },
    {
      id: 'e3',
      sourceId: shape === 'chain' ? second.id : first.id,
      targetId: third.id,
      relation: 'lineage',
    },
  ];
  return { nodes, edges, first, second, third };
}

describe('DBT model chain projection', () => {
  it('carries active outputs through an arbitrary generated-model chain', () => {
    const { nodes, edges, third } = projectionGraph('chain');
    expect(createDbtModelArtifactProjector({ nodes, edges })({ modelNode: third })).toMatchObject({
      ok: true,
      artifact: {
        outputColumns: ['customer'],
        body: 'select\n  origin."customer" as "customer"\nfrom {{ ref(\'model_2\') }} as origin',
      },
    });
  });

  it.each(['chain', 'fan-out'] as const)(
    'generates each model SQL once for %s in either traversal order',
    (shape) => {
      const { nodes, edges } = projectionGraph(shape);
      const quote = vi.spyOn(sqlIdentifier, 'quoteSqlIdentifier');
      try {
        const artifactsByOrder = [nodes, nodes.slice().reverse()].map((orderedNodes) => {
          quote.mockClear();
          const result = buildDbtWorkspaceArtifacts({
            nodes: orderedNodes,
            edges,
            scopedNodeIds: nodes.map((node) => node.id),
          });
          expect(result.ok).toBe(true);
          if (!result.ok) throw new Error(result.message);
          const modelArtifacts = result.artifacts.filter((artifact) => artifact.language === 'sql');
          expect(modelArtifacts).toHaveLength(3);
          for (const artifact of modelArtifacts) {
            expect(artifact.content).toContain('origin."customer" as "customer"');
            expect(artifact.content).not.toContain('origin."order_id"');
          }
          expect(quote.mock.calls).toEqual([['customer'], ['customer'], ['customer']]);
          return modelArtifacts.sort((left, right) => left.path.localeCompare(right.path));
        });
        expect(artifactsByOrder[1]).toEqual(artifactsByOrder[0]);
      } finally {
        quote.mockRestore();
      }
    }
  );

  it('regenerates a changed source in a later evaluation without retaining earlier artifacts', () => {
    const { nodes, edges } = projectionGraph('chain');
    const args = { nodes, edges, scopedNodeIds: nodes.map((node) => node.id) };
    const quote = vi.spyOn(sqlIdentifier, 'quoteSqlIdentifier');
    try {
      const original = buildDbtWorkspaceArtifacts(args);
      const changed = buildDbtWorkspaceArtifacts({
        ...args,
        nodes: nodes.map((node) =>
          node === source
            ? {
                ...source,
                metadata: { ...source.metadata, tableName: 'orders_current' },
              }
            : node
        ),
      });
      expect(original.ok).toBe(true);
      expect(changed.ok).toBe(true);
      if (!original.ok || !changed.ok) throw new Error('Expected complete model artifacts.');
      expect(original.artifacts[1]?.content).toContain("'orders'");
      expect(changed.artifacts[1]?.content).toContain("'orders_current'");
      expect(quote).toHaveBeenCalledTimes(6);
    } finally {
      quote.mockRestore();
    }
  });

  it('propagates unavailable source columns through the chain without generated SQL', () => {
    const { nodes, edges, third } = projectionGraph('chain');
    expect(
      createDbtModelArtifactProjector({
        nodes: nodes.map((node) =>
          node === source
            ? {
                ...source,
                metadata: { ...source.metadata, columns: [] },
              }
            : node
        ),
        edges,
      })({ modelNode: third })
    ).toEqual({
      ok: false,
      reason: 'origin_columns_unavailable',
      message: 'DBT model origin "Orders" does not expose canonical columns.',
    });
  });

  it.each(['authoring metadata', 'external model object'] as const)(
    'does not reuse canonical success to hide a cycle introduced by %s',
    (edit) => {
      const { nodes, edges, first, second } = projectionGraph('chain');
      const project = createDbtModelArtifactProjector({
        nodes,
        edges: [...edges, { sourceId: second.id, targetId: first.id }],
      });
      const original = project({ modelNode: second });
      expect(original.ok).toBe(true);
      const metadata = {
        ...createDbtNodeAuthoringMetadata(first),
        selectedSourceId: second.id,
        projectionColumns: [{ name: 'customer', output: true }],
      };
      const query =
        edit === 'authoring metadata'
          ? { modelNode: first, authoringMetadata: metadata }
          : { modelNode: { ...first, metadata: { dbt: metadata } } };
      expect(project(query)).toEqual({
        ok: false,
        reason: 'origin_required',
        message: 'DBT model "model-1" cannot use a cyclic model origin.',
      });
      expect(project({ modelNode: second })).toBe(original);
    }
  );

  it('isolates successful and rejected authoring overrides from the canonical artifact', () => {
    const { nodes, edges, first } = projectionGraph('chain');
    const project = createDbtModelArtifactProjector({ nodes, edges });
    const original = project({ modelNode: first });
    expect(original).toMatchObject({ ok: true, artifact: { outputColumns: ['customer'] } });
    const metadata = createDbtNodeAuthoringMetadata(first);
    expect(
      project({
        modelNode: first,
        authoringMetadata: {
          ...metadata,
          materialized: 'view',
          projectionColumns: [
            { name: 'order_id', output: true },
            { name: 'customer', output: false },
          ],
        },
      })
    ).toMatchObject({ ok: true, artifact: { materialized: 'view', outputColumns: ['order_id'] } });
    expect(
      project({
        modelNode: first,
        authoringMetadata: {
          ...metadata,
          projectionColumns: [{ name: 'missing', output: true }],
        },
      })
    ).toMatchObject({ ok: false, reason: 'projection_columns_invalid' });
    expect(project({ modelNode: first })).toBe(original);
  });

  it.each([1, 2])('preserves the queried root diagnostic for a cycle of %i models', (length) => {
    const first = model('first', length === 1 ? 'first' : 'second');
    const nodes = length === 1 ? [first] : [first, model('second', first.id)];
    const edges = nodes.map((node, index) => ({
      id: `cycle-${index}`,
      sourceId: nodes[(index + 1) % nodes.length]!.id,
      targetId: node.id,
    }));
    const project = createDbtModelArtifactProjector({ nodes, edges });
    for (const node of nodes) {
      expect(project({ modelNode: node })).toEqual({
        ok: false,
        reason: 'origin_required',
        message: `DBT model "${node.name}" cannot use a cyclic model origin.`,
      });
    }
  });
});
