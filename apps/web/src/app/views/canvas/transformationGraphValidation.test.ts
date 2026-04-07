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

describe('validateTransformationGraph', () => {
  it('accepts exactly one input, one transform, one output, and two ordered edges', () => {
    const nodes = [
      buildNode({ id: 'src', name: 'Source', role: 'input' }),
      buildNode({ id: 'tx', name: 'Transform', role: 'transform' }),
      buildNode({ id: 'sink', name: 'Sink', role: 'output' }),
    ];
    const edges = [
      buildEdge({ id: 'e1', sourceId: 'src', targetId: 'tx' }),
      buildEdge({ id: 'e2', sourceId: 'tx', targetId: 'sink' }),
    ];

    expect(validateTransformationGraph({ nodes, edges })).toEqual(
      expect.objectContaining({
        valid: true,
        summary: 'Transformation draft is valid for preview.',
      })
    );
  });

  it('rejects graphs with the wrong node count', () => {
    const nodes = [
      buildNode({ id: 'src', name: 'Source', role: 'input' }),
      buildNode({ id: 'tx', name: 'Transform', role: 'transform' }),
    ];

    expect(validateTransformationGraph({ nodes, edges: [] })).toEqual(
      expect.objectContaining({
        valid: false,
        summary: 'Plan requires exactly 3 nodes: source, sql_transform, and sink.',
      })
    );
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

    expect(validateTransformationGraph({ nodes, edges })).toEqual(
      expect.objectContaining({
        valid: false,
        summary: 'Plan supports only input, transform, and output nodes in this vertical.',
      })
    );
  });

  it('rejects graphs whose edges do not follow source -> sql_transform -> sink', () => {
    const nodes = [
      buildNode({ id: 'src', name: 'Source', role: 'input' }),
      buildNode({ id: 'tx', name: 'Transform', role: 'transform' }),
      buildNode({ id: 'sink', name: 'Sink', role: 'output' }),
    ];
    const edges = [
      buildEdge({ id: 'e1', sourceId: 'src', targetId: 'sink' }),
      buildEdge({ id: 'e2', sourceId: 'sink', targetId: 'tx' }),
    ];

    expect(validateTransformationGraph({ nodes, edges })).toEqual(
      expect.objectContaining({
        valid: false,
        summary: 'Plan edges must follow source -> sql_transform -> sink.',
      })
    );
  });
});
