import type { Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { guardTransformationConnection } from './transformationConnectionGuard';

function buildNode(
  id: string,
  role: CanonicalNode['role'],
  kind: CanonicalNode['kind'] = 'dbt:model'
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'plugin',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

function buildEdge(source: string, target: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
  };
}

describe('guardTransformationConnection', () => {
  const source = buildNode('source', 'input');
  const transform = buildNode('tx', 'transform');
  const sink = buildNode('sink', 'output');
  const constrainedNodes = [source, transform, sink];

  it('allows source -> transform in constrained mode', () => {
    const result = guardTransformationConnection({
      sourceNode: source,
      targetNode: transform,
      canonicalNodes: constrainedNodes,
      edges: [],
    });

    expect(result).toEqual({ allowed: true });
  });

  it('rejects invalid direction in constrained mode', () => {
    const result = guardTransformationConnection({
      sourceNode: source,
      targetNode: sink,
      canonicalNodes: constrainedNodes,
      edges: [],
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'Plan edges must follow source -> sql_transform -> sink.',
    });
  });

  it('rejects duplicate allowed edge', () => {
    const result = guardTransformationConnection({
      sourceNode: source,
      targetNode: transform,
      canonicalNodes: constrainedNodes,
      edges: [buildEdge('source', 'tx')],
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'Dependency already exists in this transformation draft.',
    });
  });

  it('rejects new edges when constrained graph already has two edges', () => {
    const result = guardTransformationConnection({
      sourceNode: source,
      targetNode: transform,
      canonicalNodes: constrainedNodes,
      edges: [buildEdge('source', 'tx'), buildEdge('tx', 'sink')],
    });

    expect(result).toEqual({
      allowed: false,
      reason: 'Plan requires exactly 2 edges: source -> sql_transform and sql_transform -> sink.',
    });
  });

  it('does not enforce transformation restrictions outside constrained mode', () => {
    const check = buildNode('check', 'check');
    const result = guardTransformationConnection({
      sourceNode: source,
      targetNode: check,
      canonicalNodes: [source, check],
      edges: [],
    });

    expect(result).toEqual({ allowed: true });
  });
});
