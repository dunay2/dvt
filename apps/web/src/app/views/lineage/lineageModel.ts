import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';

export function bfsReachable(
  startId: string,
  edges: CanonicalEdge[],
  direction: 'upstream' | 'downstream'
): Set<string> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const [from, to] =
      direction === 'downstream' ? [edge.sourceId, edge.targetId] : [edge.targetId, edge.sourceId];
    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    adjacency.get(from)?.push(to);
  }

  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      queue.push(neighbor);
    }
  }
  visited.delete(startId);
  return visited;
}

export function assignLevels(nodes: CanonicalNode[], edges: CanonicalEdge[]): Map<string, number> {
  const inDegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  const children = new Map<string, string[]>();

  for (const edge of edges) {
    inDegree.set(edge.targetId, (inDegree.get(edge.targetId) ?? 0) + 1);
    if (!children.has(edge.sourceId)) {
      children.set(edge.sourceId, []);
    }
    children.get(edge.sourceId)?.push(edge.targetId);
  }

  const levels = new Map<string, number>();
  const queue = nodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  for (const id of queue) {
    levels.set(id, 0);
  }

  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) {
      continue;
    }
    const level = levels.get(id) ?? 0;
    for (const childId of children.get(id) ?? []) {
      levels.set(childId, Math.max(levels.get(childId) ?? 0, level + 1));
      queue.push(childId);
    }
  }
  return levels;
}

export function kindStyle(kind: string) {
  const styles: Record<string, { badge: string }> = {
    'dbt:source': { badge: 'SOURCE' },
    'dbt:seed': { badge: 'SEED' },
    'dbt:model': { badge: 'MODEL' },
    'dbt:snapshot': { badge: 'SNAPSHOT' },
    'dbt:test': { badge: 'TEST' },
    'dbt:exposure': { badge: 'EXPOSURE' },
    'dbt:metric': { badge: 'METRIC' },
    'dbt:macro': { badge: 'MACRO' },
  };
  return (
    styles[kind] ?? {
      badge: kind.split(':')[1]?.toUpperCase() ?? kind,
    }
  );
}

export function groupNodesByLevel(nodes: CanonicalNode[], levels: Map<string, number>) {
  const grouped = new Map<number, CanonicalNode[]>();
  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    if (!grouped.has(level)) {
      grouped.set(level, []);
    }
    grouped.get(level)?.push(node);
  }
  return [...grouped.entries()].sort(([a], [b]) => a - b);
}
