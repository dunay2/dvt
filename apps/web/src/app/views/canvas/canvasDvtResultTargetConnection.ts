/** Resolves a connection candidate for explicit confirmation, never a saved default. */
import type { ConnectionRef } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveEffectiveDvtConnectionRef } from './canvasDvtSourceAuthoring';

export function resolveDvtResultTargetConnection(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): ConnectionRef | undefined {
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  const visiting = new Set<string>();
  const resolved = new Map<string, ConnectionRef | undefined>();
  const visit = (id: string): ConnectionRef | undefined => {
    if (visiting.has(id)) return undefined;
    if (resolved.has(id)) return resolved.get(id);
    const node = nodes.get(id);
    if (node == null) return undefined;
    if (node.kind === 'dvt:source') {
      if (node.pluginId !== 'dvt' && node.pluginId !== 'dvt.warehouse-source') return undefined;
      return resolveEffectiveDvtConnectionRef(node);
    }
    if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return undefined;
    visiting.add(id);
    const inputs = args.edges.filter((edge) => edge.targetId === id && edge.relation === 'lineage');
    let connection: ConnectionRef | undefined;
    for (const input of inputs) {
      const candidate = visit(input.sourceId);
      if (
        candidate == null ||
        (connection != null && !hasSameConnectionRef(connection, candidate))
      ) {
        visiting.delete(id);
        resolved.set(id, undefined);
        return undefined;
      }
      connection = candidate;
    }
    visiting.delete(id);
    resolved.set(id, connection);
    return connection;
  };
  try {
    return visit(args.node.id);
  } catch {
    // Malformed or competing source authorities cannot offer a destination.
    return undefined;
  }
}
