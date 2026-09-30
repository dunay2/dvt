import { describe, expect, it } from 'vitest';
import { resolveDvtConnectionProvenance as resolve } from './canvasDvtConnectionProvenance';
import {
  connectionRef,
  edge,
  source,
  transform,
} from './canvasDvtConnectionProvenance.test-support';

describe('Complete Canvas connection provenance', () => {
  it('resolves a Source directly through the existing authority', () => {
    expect(resolve({ node: source, nodes: [source], edges: [] })).toEqual({
      kind: 'resolved',
      connectionRef,
      sourceNodeIds: ['s'],
    });
  });
  it('resolves all inputs of a chained join, independent of edge order', () => {
    const nodes = [source, { ...source, id: 's2' }, { ...transform, id: 't2' }, transform];
    const edges = [edge('s', 't2'), edge('s2', 't2'), edge('t2', 't')];
    const expected = { kind: 'resolved', connectionRef, sourceNodeIds: ['s', 's2'] };
    expect(resolve({ node: transform, nodes, edges })).toEqual(expected);
    expect(resolve({ node: transform, nodes, edges: [...edges].reverse() })).toEqual(expected);
  });

  it.each([
    { metadata: undefined, kind: 'invalid' },
    { metadata: { connectionRef: { ...connectionRef, connectionId: 'other' } }, kind: 'ambiguous' },
    { metadata: { connectionRef: { ...connectionRef, provider: 'snowflake' } }, kind: 'invalid' },
    { metadata: { connectionRef: { connectionId: 'malformed' } }, kind: 'invalid' },
  ])(
    'refuses missing, conflicting or unsupported source binding $metadata',
    ({ metadata, kind }) => {
      const other = { ...source, id: 's2', metadata };
      expect(
        resolve({
          node: transform,
          nodes: [source, other, transform],
          edges: [edge('s', 't'), edge('s2', 't')],
        })
      ).toMatchObject({ kind, sourceNodeIds: ['s', 's2'] });
    }
  );

  it.each([
    { edges: [], kind: 'none' },
    { edges: [edge('missing', 't')], kind: 'invalid' },
    { edges: [edge('s', 't'), edge('t', 't')], kind: 'invalid' },
  ])('does not guess through an unbound, broken or cyclic graph: $edges', ({ edges, kind }) => {
    expect(resolve({ node: transform, nodes: [source, transform], edges })).toMatchObject({ kind });
  });

  it('accepts imported authority, rejects competing authorities and never mutates metadata', () => {
    const connectedSourceRef = {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef,
      sourceObjectId: 'public.orders',
    };
    const imported = {
      ...source,
      pluginId: 'dvt.warehouse-source',
      metadata: { connectedSourceRef },
    };
    const args = { node: transform, nodes: [imported, transform], edges: [edge('s', 't')] };
    const snapshot = structuredClone(args);
    expect(resolve(args)).toEqual({ kind: 'resolved', connectionRef, sourceNodeIds: ['s'] });
    expect(args).toEqual(snapshot);
    expect(
      resolve({
        ...args,
        nodes: [{ ...imported, metadata: { connectedSourceRef, connectionRef } }, transform],
      })
    ).toEqual({
      kind: 'invalid',
      reasons: ['invalid-source-connection'],
      sourceNodeIds: ['s'],
    });
  });

  it('does not inherit from unrelated relation kinds or disconnected invalid components', () => {
    expect(
      resolve({
        node: transform,
        nodes: [source, transform],
        edges: [{ ...edge('s', 't'), relation: 'validation' }],
      })
    ).toEqual({ kind: 'none' });
    expect(
      resolve({
        node: source,
        nodes: [source, transform],
        edges: [edge('t', 't'), edge('missing', 't')],
      })
    ).toEqual({
      kind: 'resolved',
      connectionRef,
      sourceNodeIds: ['s'],
    });
  });

  it('never hides an unbound branch beside a bound Source', () => {
    expect(
      resolve({
        node: transform,
        nodes: [source, transform, { ...transform, id: 'unbound' }],
        edges: [edge('s', 't'), edge('unbound', 't')],
      })
    ).toEqual({
      kind: 'invalid',
      reasons: ['incomplete-lineage'],
      sourceNodeIds: ['s'],
    });
  });
});
