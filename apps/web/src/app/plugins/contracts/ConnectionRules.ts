import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PluginConnectionRule } from './PluginManifest';

// ---------------------------------------------------------------------------
// Shell-level graph invariants (non-overridable)
// ---------------------------------------------------------------------------
//
// SHELL-001: No cycles — full BFS traversal before confirming an edge
// SHELL-002: No self-connections (source.id === target.id)
// SHELL-003: No duplicate edges (same source + target)
//
// These rules are always evaluated FIRST, before plugin connection rules.
// ---------------------------------------------------------------------------

export type ConnectionRuleResult = { allowed: true } | { allowed: false; reason: string };

/**
 * Full cycle detection via BFS.
 * Returns true if adding (sourceId → targetId) would create a cycle.
 */
export function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  edges: readonly CanonicalEdge[]
): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (!adj.has(e.sourceId)) adj.set(e.sourceId, []);
    adj.get(e.sourceId)!.push(e.targetId);
  }

  const visited = new Set<string>();
  const queue: string[] = [targetId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const n of adj.get(current) ?? []) queue.push(n);
  }
  return false;
}

/**
 * Returns true if an edge with the same source and target already exists.
 */
export function hasDuplicateEdge(
  sourceId: string,
  targetId: string,
  edges: readonly CanonicalEdge[]
): boolean {
  return edges.some((e) => e.sourceId === sourceId && e.targetId === targetId);
}

// ---------------------------------------------------------------------------
// Plugin connection rule evaluator (intra-plugin)
// ---------------------------------------------------------------------------

/**
 * Evaluates the plugin's own connectionRules for a given source → target pair.
 * Rules are evaluated in declaration order; first match wins.
 * If no rule matches, the connection is allowed by default.
 */
export function evaluatePluginConnectionRules(
  source: CanonicalNode,
  target: CanonicalNode,
  rules: readonly PluginConnectionRule[]
): ConnectionRuleResult {
  for (const rule of rules) {
    const sourceMatches = rule.sourceKind === '*' || rule.sourceKind === source.kind;
    const targetMatches = rule.targetKind === '*' || rule.targetKind === target.kind;
    if (sourceMatches && targetMatches) {
      return rule.allowed
        ? { allowed: true }
        : { allowed: false, reason: rule.reason ?? 'Connection not permitted by plugin rules' };
    }
  }
  // No rule matched — allow by default
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Cross-plugin bridge evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluates whether a cross-plugin connection is allowed via data port bridge.
 * Source must produce a portType that target consumes, with compatible roles.
 */
export function evaluateCrossPluginBridge(
  source: CanonicalNode,
  target: CanonicalNode,
  producerPorts: ReadonlyArray<{ portType: string; forRoles: string[] }>,
  consumerPorts: ReadonlyArray<{ portType: string; forRoles: string[] }>
): ConnectionRuleResult {
  for (const producer of producerPorts) {
    if (!producer.forRoles.includes(source.role)) continue;
    for (const consumer of consumerPorts) {
      if (consumer.portType !== producer.portType) continue;
      if (!consumer.forRoles.includes(target.role)) continue;
      return { allowed: true };
    }
  }
  return {
    allowed: false,
    reason: `No compatible data port bridge between ${source.pluginId} (${source.role}) and ${target.pluginId} (${target.role})`,
  };
}

// ---------------------------------------------------------------------------
// Shell connection evaluator — single entry point used by the canvas
// ---------------------------------------------------------------------------

export type PluginPortMap = ReadonlyMap<
  string,
  {
    connectionRules: PluginConnectionRule[];
    produces: { portType: string; forRoles: string[] }[];
    consumes: { portType: string; forRoles: string[] }[];
  }
>;

/**
 * Full connection evaluation pipeline:
 *
 *   1. SHELL-002: no self-connections
 *   2. SHELL-003: no duplicate edges
 *   3. SHELL-001: no cycles (BFS)
 *   4a. intra-plugin: evaluatePluginConnectionRules()
 *   4b. cross-plugin: evaluateCrossPluginBridge()
 *
 * @param source        canonical source node
 * @param target        canonical target node
 * @param currentEdges  current canonical edges in the graph
 * @param pluginPorts   map from pluginId to its connection rules and data ports
 */
export function evaluateConnection(
  source: CanonicalNode,
  target: CanonicalNode,
  currentEdges: readonly CanonicalEdge[],
  pluginPorts: PluginPortMap
): ConnectionRuleResult {
  // SHELL-002
  if (source.id === target.id) {
    return { allowed: false, reason: 'Self-connections are not allowed' };
  }

  // SHELL-003
  if (hasDuplicateEdge(source.id, target.id, currentEdges)) {
    return { allowed: false, reason: 'Connection already exists' };
  }

  // SHELL-001
  if (wouldCreateCycle(source.id, target.id, currentEdges)) {
    return { allowed: false, reason: 'Would create a cycle in the DAG' };
  }

  // Intra-plugin
  if (source.pluginId === target.pluginId) {
    const plugin = pluginPorts.get(source.pluginId);
    const rules = plugin?.connectionRules ?? [];
    return evaluatePluginConnectionRules(source, target, rules);
  }

  // Cross-plugin bridge
  const sourcePlugin = pluginPorts.get(source.pluginId);
  const targetPlugin = pluginPorts.get(target.pluginId);
  return evaluateCrossPluginBridge(
    source,
    target,
    sourcePlugin?.produces ?? [],
    targetPlugin?.consumes ?? []
  );
}
