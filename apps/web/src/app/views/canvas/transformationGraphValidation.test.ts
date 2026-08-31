import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createDvtSubstraitInnerJoinDraft,
  encodeDvtSubstraitInnerJoinDocument,
} from './canvasDvtSubstraitJoinComposition';
import { validateTransformationGraph } from './transformationGraphValidation';

function buildNode(
  overrides: Partial<CanonicalNode> & Pick<CanonicalNode, 'id' | 'name' | 'role'>
): CanonicalNode {
  return {
    pluginId: 'dvt',
    kind: 'dvt:test',
    status: 'idle',
    tags: [],
    ...overrides,
  };
}

function buildEdge(
  overrides: Partial<CanonicalEdge> & Pick<CanonicalEdge, 'id' | 'sourceId' | 'targetId'>
): CanonicalEdge {
  return {
    relation: 'lineage',
    ...overrides,
  };
}

function buildValidTransformationNodes(args?: {
  transformNode?: Partial<CanonicalNode>;
  extraNodes?: CanonicalNode[];
}): CanonicalNode[] {
  return [
    buildNode({ id: 'src', name: 'Source', role: 'input' }),
    buildNode({
      id: 'tx',
      name: 'Transform',
      role: 'transform',
      ...(args?.transformNode ?? {}),
    }),
    buildNode({ id: 'sink', name: 'Sink', role: 'output' }),
    ...(args?.extraNodes ?? []),
  ];
}

function buildOrderedTransformationEdges(): CanonicalEdge[] {
  return [
    buildEdge({ id: 'e1', sourceId: 'src', targetId: 'tx' }),
    buildEdge({ id: 'e2', sourceId: 'tx', targetId: 'sink' }),
  ];
}

function buildValidSubstraitInnerJoinGraph(): {
  nodes: CanonicalNode[];
  edges: CanonicalEdge[];
} {
  const connectionRef = {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-a',
    provider: 'postgres',
  };
  const connectedSourceRef = (table: string): ConnectedSourceRef => ({
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef,
    sourceObjectId: `public.${table}`,
  });
  const source = (id: string, table: string, columns: readonly string[]): CanonicalNode => ({
    id,
    name: table,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      sourceName: table,
      schema: 'public',
      tableName: table,
      columns: columns.map((name) => ({ name, type: 'string' })),
      connectedSourceRef: connectedSourceRef(table),
    },
  });
  const draft = createDvtSubstraitInnerJoinDraft({
    left: {
      nodeId: 'customers',
      schema: 'public',
      table: 'customers',
      sourceRef: connectedSourceRef('customers'),
    },
    right: {
      nodeId: 'orders',
      schema: 'public',
      table: 'orders',
      sourceRef: connectedSourceRef('orders'),
    },
    targetNodeId: 'join',
  });
  const transform = applyDvtSubstraitSemanticDocument(
    {
      id: 'join',
      name: 'Customer orders',
      pluginId: 'dvt',
      kind: 'dvt:sql_transform',
      role: 'transform',
      status: 'idle',
      tags: ['authoring'],
      path: 'models/customer-orders.sql',
      metadata: { config: { dialect: 'postgres' } },
    },
    encodeDvtSubstraitInnerJoinDocument(draft)
  );
  const nodes = [
    source('customers', 'customers', ['customer_id', 'name']),
    source('orders', 'orders', ['order_id', 'customer_id']),
    transform,
    buildNode({
      id: 'sink',
      name: 'Customer orders sink',
      kind: 'dvt:sink',
      role: 'output',
      metadata: {
        config: {
          schema: 'analytics',
          table: 'customer_orders',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    }),
  ];
  const edges = [
    buildEdge({ id: 'customers-join', sourceId: 'customers', targetId: 'join' }),
    buildEdge({ id: 'orders-join', sourceId: 'orders', targetId: 'join' }),
    buildEdge({ id: 'join-sink', sourceId: 'join', targetId: 'sink' }),
  ];
  return { nodes, edges };
}

function expectValidationSummary(
  result: ReturnType<typeof validateTransformationGraph>,
  args: {
    valid: boolean;
    summaryCode: ReturnType<typeof validateTransformationGraph>['summaryCode'];
    scopedNodeIds?: string[];
    scopedEdgeIds?: string[];
  }
): void {
  expect(result).toEqual(expect.objectContaining(args));
}

describe('validateTransformationGraph', () => {
  it('accepts exactly one input, one transform, one output, and two ordered edges', () => {
    const nodes = buildValidTransformationNodes();
    const edges = buildOrderedTransformationEdges();

    expectValidationSummary(validateTransformationGraph({ nodes, edges }), {
      valid: true,
      summaryCode: 'valid',
    });
  });

  it('accepts the exact persisted two-source Substrait INNER JOIN path', () => {
    const { nodes, edges } = buildValidSubstraitInnerJoinGraph();

    expectValidationSummary(
      validateTransformationGraph({
        nodes,
        edges,
        selectedNodeIds: nodes.map((node) => node.id),
        workspaceNodeIds: nodes.map((node) => node.id),
      }),
      {
        valid: true,
        summaryCode: 'valid',
        scopedNodeIds: ['customers', 'orders', 'join', 'sink'],
        scopedEdgeIds: ['customers-join', 'orders-join', 'join-sink'],
      }
    );
  });

  it('accepts an executable path inside a larger DVT authoring canvas', () => {
    const nodes = buildValidTransformationNodes({
      extraNodes: [
        buildNode({ id: 'src-copy-1', name: 'Source copy 1', role: 'input' }),
        buildNode({ id: 'src-copy-2', name: 'Source copy 2', role: 'input' }),
      ],
    });
    const edges = buildOrderedTransformationEdges();

    expectValidationSummary(validateTransformationGraph({ nodes, edges }), {
      valid: true,
      summaryCode: 'valid',
      scopedNodeIds: ['src', 'tx', 'sink'],
      scopedEdgeIds: ['e1', 'e2'],
    });
  });

  it('rejects a larger canvas when the discovered executable path has extra scoped edges', () => {
    const nodes = buildValidTransformationNodes({
      extraNodes: [buildNode({ id: 'note', name: 'Unrelated note', role: 'check' })],
    });
    const edges = [
      ...buildOrderedTransformationEdges(),
      buildEdge({ id: 'e3', sourceId: 'src', targetId: 'sink' }),
    ];

    expectValidationSummary(validateTransformationGraph({ nodes, edges }), {
      valid: false,
      summaryCode: 'requires_two_edges',
      scopedNodeIds: ['src', 'tx', 'sink'],
      scopedEdgeIds: ['e1', 'e2', 'e3'],
    });
  });

  it('fails closed when a larger canvas has multiple executable paths and no explicit selection', () => {
    const nodes = buildValidTransformationNodes({
      extraNodes: [buildNode({ id: 'src-copy', name: 'Source copy', role: 'input' })],
    });
    const edges = [
      ...buildOrderedTransformationEdges(),
      buildEdge({ id: 'e3', sourceId: 'src-copy', targetId: 'tx' }),
    ];

    expectValidationSummary(validateTransformationGraph({ nodes, edges }), {
      valid: false,
      summaryCode: 'ambiguous_executable_paths',
    });
  });

  it('fails closed when one transform can reach multiple sinks without explicit selection', () => {
    const nodes = buildValidTransformationNodes({
      extraNodes: [buildNode({ id: 'sink-copy', name: 'Sink copy', role: 'output' })],
    });
    const edges = [
      ...buildOrderedTransformationEdges(),
      buildEdge({ id: 'e3', sourceId: 'tx', targetId: 'sink-copy' }),
    ];

    expectValidationSummary(validateTransformationGraph({ nodes, edges }), {
      valid: false,
      summaryCode: 'ambiguous_executable_paths',
    });
  });

  it('blocks partial DVT authoring graphs by executable path instead of canvas node count', () => {
    const nodes = [
      buildNode({ id: 'src', name: 'Source', role: 'input' }),
      buildNode({ id: 'tx', name: 'Transform', role: 'transform' }),
    ];

    expectValidationSummary(validateTransformationGraph({ nodes, edges: [] }), {
      valid: false,
      summaryCode: 'requires_executable_path',
    });
  });

  it('rejects graphs with unsupported node roles', () => {
    const nodes = [
      buildNode({ id: 'src', name: 'Source', role: 'input' }),
      buildNode({ id: 'tx', name: 'Transform', role: 'transform' }),
      buildNode({ id: 'chk', name: 'Check', role: 'check' }),
    ];
    const edges = [
      buildEdge({ id: 'e1', sourceId: 'src', targetId: 'tx' }),
      buildEdge({ id: 'e2', sourceId: 'tx', targetId: 'chk' }),
    ];

    expectValidationSummary(validateTransformationGraph({ nodes, edges }), {
      valid: false,
      summaryCode: 'unsupported_roles',
    });
  });

  it('rejects graphs whose edges do not follow source -> sql_transform -> sink', () => {
    const nodes = buildValidTransformationNodes();
    const edges = [
      buildEdge({ id: 'e1', sourceId: 'src', targetId: 'sink' }),
      buildEdge({ id: 'e2', sourceId: 'sink', targetId: 'tx' }),
    ];

    expectValidationSummary(validateTransformationGraph({ nodes, edges }), {
      valid: false,
      summaryCode: 'invalid_edge_order',
    });
  });

  it('accepts a selected transformation subgraph within a larger canvas', () => {
    const nodes = buildValidTransformationNodes({
      extraNodes: [buildNode({ id: 'qa', name: 'Quality check', role: 'check' })],
    });
    const edges = [
      ...buildOrderedTransformationEdges(),
      buildEdge({ id: 'e3', sourceId: 'sink', targetId: 'qa' }),
    ];

    expectValidationSummary(
      validateTransformationGraph({
        nodes,
        edges,
        selectedNodeIds: ['src', 'tx', 'sink'],
        workspaceNodeIds: nodes.map((node) => node.id),
      }),
      {
        valid: true,
        summaryCode: 'valid',
        scopedNodeIds: ['src', 'tx', 'sink'],
        scopedEdgeIds: ['e1', 'e2'],
      }
    );
  });

  it('falls back to the workspace transformation graph when selection is only a partial edit focus', () => {
    const nodes = buildValidTransformationNodes();
    const edges = buildOrderedTransformationEdges();

    expectValidationSummary(
      validateTransformationGraph({
        nodes,
        edges,
        selectedNodeIds: ['src'],
        workspaceNodeIds: nodes.map((node) => node.id),
      }),
      {
        valid: true,
        summaryCode: 'valid',
        scopedNodeIds: ['src', 'tx', 'sink'],
        scopedEdgeIds: ['e1', 'e2'],
      }
    );
  });

  it('changes draftSignature when projected graph source changes without changing ids', () => {
    const nodes = buildValidTransformationNodes({
      transformNode: { kind: 'dvt:sql_transform' },
    });
    const edges = buildOrderedTransformationEdges();
    const [sourceNode, transformNode, sinkNode] = nodes;

    const baseline = validateTransformationGraph({ nodes, edges });
    const renamed = validateTransformationGraph({
      nodes: [
        sourceNode!,
        {
          ...transformNode!,
          name: 'Transform renamed',
          path: 'models/transform.sql',
        },
        sinkNode!,
      ],
      edges,
    });

    expect(baseline.valid).toBe(true);
    expect(renamed.valid).toBe(true);
    expect(renamed.draftSignature).not.toBe(baseline.draftSignature);
  });

  it('keeps draftSignature stable when only raw metadata changes outside the preview projection', () => {
    const nodes = buildValidTransformationNodes({
      transformNode: { kind: 'dvt:sql_transform' },
    });
    const edges = buildOrderedTransformationEdges();
    const [sourceNode, transformNode, sinkNode] = nodes;

    const baseline = validateTransformationGraph({ nodes, edges });
    const metadataOnly = validateTransformationGraph({
      nodes: [
        sourceNode!,
        {
          ...transformNode!,
          metadata: { uiHint: 'changed', nonPreviewField: 'ignored' },
        },
        sinkNode!,
      ],
      edges,
    });

    expect(baseline.valid).toBe(true);
    expect(metadataOnly.valid).toBe(true);
    expect(metadataOnly.draftSignature).toBe(baseline.draftSignature);
  });
});
