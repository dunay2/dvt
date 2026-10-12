import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export const connectionRef = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;
export const transform: CanonicalNode = {
  id: 't',
  name: 'T',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};
export const source: CanonicalNode = {
  ...transform,
  id: 's',
  kind: 'dvt:source',
  role: 'input',
  metadata: { connectionRef },
};
export function edge(sourceId: string, targetId: string): CanonicalEdge {
  return { id: `${sourceId}-${targetId}`, sourceId, targetId, relation: 'lineage' };
}
export function permutations<T>(items: readonly T[]): T[][] {
  return items.length === 0
    ? [[]]
    : items.flatMap((item, index) =>
        permutations(items.filter((_, candidate) => candidate !== index)).map((rest) => [
          item,
          ...rest,
        ])
      );
}
