/** Resolves connection provenance from the complete scoped Canvas lineage, without effects. */
import type { ConnectionRef } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  DVT_AUTHORING_PLUGIN_ID,
  DVT_WAREHOUSE_SOURCE_PLUGIN_ID,
  resolveEffectiveDvtConnectionRef,
} from './canvasDvtSourceAuthoring';

type InvalidLineageReason =
  | 'cyclic-topology'
  | 'duplicate-node'
  | 'missing-node'
  | 'unsupported-node'
  | 'source-has-inputs'
  | 'invalid-source-connection'
  | 'incomplete-lineage';

export type DvtInheritedConnectionResolution =
  | Readonly<{ kind: 'none' }>
  | Readonly<{ kind: 'resolved'; connectionRef: ConnectionRef; sourceNodeIds: readonly string[] }>
  | Readonly<{ kind: 'ambiguous'; sourceNodeIds: readonly string[] }>
  | Readonly<{
      kind: 'invalid';
      reasons: readonly InvalidLineageReason[];
      sourceNodeIds: readonly string[];
    }>;

export function resolveDvtConnectionProvenance(
  args: Readonly<{
    node: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): DvtInheritedConnectionResolution {
  const nodes = new Map<string, CanonicalNode>();
  const duplicateIds = new Set<string>();
  for (const node of args.nodes) {
    if (nodes.has(node.id)) duplicateIds.add(node.id);
    nodes.set(node.id, node);
  }
  const inputs = new Map<string, string[]>();
  for (const edge of args.edges) {
    if (edge.relation !== 'lineage') continue;
    const upstream = inputs.get(edge.targetId) ?? [];
    upstream.push(edge.sourceId);
    inputs.set(edge.targetId, upstream);
  }

  const active = new Set<string>();
  const completed = new Set<string>();
  const sources = new Set<string>();
  const reasons = new Set<InvalidLineageReason>();
  const stack = [{ id: args.node.id, leaving: false }];
  let connection: ConnectionRef | undefined;
  let conflicting = false;
  let unboundBranch = false;

  while (stack.length > 0) {
    const frame = stack.pop()!;
    if (frame.leaving) {
      active.delete(frame.id);
      completed.add(frame.id);
      continue;
    }
    if (completed.has(frame.id)) continue;
    if (active.has(frame.id)) {
      reasons.add('cyclic-topology');
      continue;
    }
    const node = nodes.get(frame.id);
    if (node == null || duplicateIds.has(frame.id)) {
      reasons.add(node == null ? 'missing-node' : 'duplicate-node');
      completed.add(frame.id);
      continue;
    }
    if (node.kind === 'dvt:source') {
      sources.add(node.id);
      completed.add(node.id);
      if ((inputs.get(node.id)?.length ?? 0) > 0) reasons.add('source-has-inputs');
      if (
        node.pluginId !== DVT_AUTHORING_PLUGIN_ID &&
        node.pluginId !== DVT_WAREHOUSE_SOURCE_PLUGIN_ID
      ) {
        reasons.add('unsupported-node');
        continue;
      }
      try {
        const candidate = resolveEffectiveDvtConnectionRef(node);
        if (candidate == null) reasons.add('invalid-source-connection');
        else if (connection == null) connection = candidate;
        else if (!hasSameConnectionRef(connection, candidate)) conflicting = true;
      } catch {
        // Only Source authority validation can reject here; never conceal traversal errors.
        reasons.add('invalid-source-connection');
      }
      continue;
    }
    if (
      node.pluginId !== DVT_AUTHORING_PLUGIN_ID ||
      (node.kind !== 'dvt:transform' && !(node.kind === 'dvt:sink' && node.id === args.node.id))
    ) {
      reasons.add('unsupported-node');
      completed.add(node.id);
      continue;
    }
    active.add(node.id);
    stack.push({ id: node.id, leaving: true });
    const upstream = inputs.get(node.id) ?? [];
    if (upstream.length === 0) unboundBranch = true;
    for (const id of upstream) stack.push({ id, leaving: false });
  }

  const sourceNodeIds = [...sources].sort();
  if (unboundBranch && sources.size > 0) reasons.add('incomplete-lineage');
  if (reasons.size > 0) return { kind: 'invalid', reasons: [...reasons].sort(), sourceNodeIds };
  if (conflicting) return { kind: 'ambiguous', sourceNodeIds };
  return connection == null
    ? { kind: 'none' }
    : { kind: 'resolved', connectionRef: connection, sourceNodeIds };
}
