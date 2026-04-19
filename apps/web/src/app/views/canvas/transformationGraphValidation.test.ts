import { describe, expect, it } from 'vitest';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
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

  it('rejects graphs with the wrong node count', () => {
    const nodes = [
      buildNode({ id: 'src', name: 'Source', role: 'input' }),
      buildNode({ id: 'tx', name: 'Transform', role: 'transform' }),
    ];

    expectValidationSummary(validateTransformationGraph({ nodes, edges: [] }), {
      valid: false,
      summaryCode: 'requires_three_nodes',
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
