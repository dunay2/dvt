import { describe, expect, it } from 'vitest';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveDvtResultTargetConnection } from './canvasDvtResultTargetConnection';

const connectionRef = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;
const transform: CanonicalNode = {
  id: 't',
  name: 'T',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};
const source: CanonicalNode = {
  ...transform,
  id: 's',
  kind: 'dvt:source',
  role: 'input',
  metadata: { connectionRef },
};
const edge = (sourceId: string, targetId: string): CanonicalEdge => ({
  id: `${sourceId}-${targetId}`,
  sourceId,
  targetId,
  relation: 'lineage',
});

describe('Explicit Transform destination connection candidate', () => {
  it('resolves all inputs of a chained join, independent of edge order', () => {
    const nodes = [source, { ...source, id: 's2' }, { ...transform, id: 't2' }, transform];
    const edges = [edge('s', 't2'), edge('s2', 't2'), edge('t2', 't')];
    expect(resolveDvtResultTargetConnection({ node: transform, nodes, edges })).toEqual(
      connectionRef
    );
    expect(
      resolveDvtResultTargetConnection({ node: transform, nodes, edges: [...edges].reverse() })
    ).toEqual(connectionRef);
  });

  it.each([
    undefined,
    { connectionRef: { ...connectionRef, connectionId: 'other' } },
    { connectionRef: { ...connectionRef, provider: 'snowflake' } },
    { connectionRef: { connectionId: 'malformed' } },
  ])('refuses missing, conflicting or unsupported source binding %j', (metadata) => {
    const other = { ...source, id: 's2', metadata };
    expect(
      resolveDvtResultTargetConnection({
        node: transform,
        nodes: [source, other, transform],
        edges: [edge('s', 't'), edge('s2', 't')],
      })
    ).toBeUndefined();
  });

  it.each(
    [[], [edge('missing', 't')], [edge('s', 't'), edge('t', 't')]].map((edges) => ({ edges }))
  )('does not guess through an unbound, broken or cyclic graph: $edges', ({ edges }) => {
    expect(
      resolveDvtResultTargetConnection({ node: transform, nodes: [source, transform], edges })
    ).toBeUndefined();
  });
});
