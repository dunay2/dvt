import { describe, expect, it } from 'vitest';
import { resolveDvtConnectionProvenance as resolve } from './canvasDvtConnectionProvenance';
import {
  connectionRef,
  edge,
  source,
  transform,
  permutations,
} from './canvasDvtConnectionProvenance.test-support';

describe('Canvas connection provenance graph invariants', () => {
  it.each([false, true])(
    'is invariant under every three-input and node permutation (conflict %s)',
    (conflict) => {
      const sources = ['s', 's2', 's3'].map((id) => ({
        ...source,
        id,
        metadata: {
          connectionRef: {
            ...connectionRef,
            connectionId: conflict && id === 's2' ? 'other' : connectionRef.connectionId,
          },
        },
      }));
      const expected = conflict
        ? { kind: 'ambiguous', sourceNodeIds: ['s', 's2', 's3'] }
        : { kind: 'resolved', connectionRef, sourceNodeIds: ['s', 's2', 's3'] };
      for (const nodes of permutations([...sources, transform])) {
        for (const edges of permutations(sources.map((node) => edge(node.id, 't')))) {
          expect(resolve({ node: transform, nodes, edges })).toEqual(expected);
        }
      }
    }
  );

  it('accepts a diamond, duplicate edges and a terminal Sink without conflating revisits with cycles', () => {
    const sink = { ...transform, id: 'sink', kind: 'dvt:sink' as const, role: 'output' as const };
    const nodes = [
      source,
      transform,
      { ...transform, id: 'left' },
      { ...transform, id: 'right' },
      sink,
    ];
    const edges = [
      edge('s', 'left'),
      edge('s', 'right'),
      edge('left', 't'),
      edge('right', 't'),
      edge('t', 'sink'),
      edge('s', 'left'),
    ];
    expect(resolve({ node: sink, nodes, edges })).toEqual({
      kind: 'resolved',
      connectionRef,
      sourceNodeIds: ['s'],
    });
  });

  it('fails closed for cycles with reachable Sources regardless of order', () => {
    const nodes = [source, transform, { ...transform, id: 'other' }];
    for (const edges of permutations([edge('s', 't'), edge('t', 'other'), edge('other', 't')])) {
      expect(resolve({ node: transform, nodes, edges })).toEqual({
        kind: 'invalid',
        reasons: ['cyclic-topology'],
        sourceNodeIds: ['s'],
      });
    }
  });

  it('reports all invalid branches deterministically rather than the first visited failure', () => {
    const bad = { ...source, id: 'bad', metadata: {} };
    const nodes = [bad, transform];
    for (const edges of permutations([edge('bad', 't'), edge('missing', 't'), edge('t', 't')])) {
      expect(resolve({ node: transform, nodes, edges })).toEqual({
        kind: 'invalid',
        reasons: ['cyclic-topology', 'invalid-source-connection', 'missing-node'],
        sourceNodeIds: ['bad'],
      });
    }
  });

  it('rejects incoming lineage on a Source instead of concealing a cycle behind its authority', () => {
    for (const edges of [
      [edge('s', 't'), edge('t', 's')],
      [edge('s', 't'), edge('missing', 's')],
    ]) {
      expect(resolve({ node: transform, nodes: [source, transform], edges })).toEqual({
        kind: 'invalid',
        reasons: ['source-has-inputs'],
        sourceNodeIds: ['s'],
      });
    }
  });

  it('rejects duplicate reachable identities and unsupported intermediate nodes', () => {
    for (const nodes of [
      [source, source, transform],
      [source, { ...source, metadata: {} }, transform],
    ]) {
      expect(resolve({ node: transform, nodes, edges: [edge('s', 't')] })).toMatchObject({
        kind: 'invalid',
        reasons: ['duplicate-node'],
      });
    }
    expect(
      resolve({
        node: transform,
        nodes: [source, transform, { ...transform, id: 'alien', pluginId: 'dbt' }],
        edges: [edge('s', 'alien'), edge('alien', 't')],
      })
    ).toMatchObject({ kind: 'invalid', reasons: ['unsupported-node'] });
  });

  it('walks a 20,000-node chain iteratively and preserves its input snapshot', () => {
    const chain = Array.from({ length: 20_000 }, (_, index) => ({ ...transform, id: `t${index}` }));
    const edges = chain.map((node, index) => edge(index === 0 ? 's' : `t${index - 1}`, node.id));
    const nodes = [source, ...chain];
    const snapshot = JSON.stringify({ nodes, edges });
    expect(resolve({ node: chain.at(-1)!, nodes, edges })).toEqual({
      kind: 'resolved',
      connectionRef,
      sourceNodeIds: ['s'],
    });
    expect(JSON.stringify({ nodes, edges })).toBe(snapshot);
  });
});
