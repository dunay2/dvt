import type { CanonicalEdge, CanonicalNode, CoreNodeRole } from '../../types/canonical';
import type { PluginConnectionRule, PluginDataPort } from './PluginManifest';

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

export type ConnectionRuleReasonCode =
  | 'plugin_rule_blocked'
  | 'cross_plugin_bridge_missing'
  | 'self_connection'
  | 'duplicate_edge'
  | 'cycle_detected';

export type ConnectionRuleResult =
  | { allowed: true }
  | {
      allowed: false;
      reasonCode: 'plugin_rule_blocked';
      reason?: string;
    }
  | {
      allowed: false;
      reasonCode: 'cross_plugin_bridge_missing';
      sourcePluginId: string;
      sourceRole: CoreNodeRole;
      targetPluginId: string;
      targetRole: CoreNodeRole;
    }
  | {
      allowed: false;
      reasonCode: 'self_connection' | 'duplicate_edge' | 'cycle_detected';
    };

export type PluginPortDescriptor = {
  connectionRules: readonly PluginConnectionRule[];
  produces: readonly PluginDataPort[];
  consumes: readonly PluginDataPort[];
};

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
    const adjacentTargets = adj.get(e.sourceId);
    if (adjacentTargets) {
      adjacentTargets.push(e.targetId);
      continue;
    }
    adj.set(e.sourceId, [e.targetId]);
  }

  const visited = new Set<string>();
  const queue: string[] = [targetId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }
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
        : {
            allowed: false,
            reasonCode: 'plugin_rule_blocked',
            ...(rule.reason ? { reason: rule.reason } : {}),
          };
    }
  }
  // No rule matched — allow by default
  return { allowed: true };
}

function portSupportsRole(port: PluginDataPort, role: CanonicalNode['role']): boolean {
  return port.forRoles.includes(role);
}

function portsShareType(producer: PluginDataPort, consumer: PluginDataPort): boolean {
  return consumer.portType === producer.portType;
}

function producerCanBridgeToTarget(
  producer: PluginDataPort,
  sourceRole: CoreNodeRole,
  targetRole: CoreNodeRole,
  consumerPorts: readonly PluginDataPort[]
): boolean {
  if (!portSupportsRole(producer, sourceRole)) {
    return false;
  }

  return consumerPorts.some(
    (consumer) => portsShareType(producer, consumer) && portSupportsRole(consumer, targetRole)
  );
}

function hasCompatibleCrossPluginBridge(
  source: CanonicalNode,
  target: CanonicalNode,
  producerPorts: readonly PluginDataPort[],
  consumerPorts: readonly PluginDataPort[]
): boolean {
  return producerPorts.some((producer) =>
    producerCanBridgeToTarget(producer, source.role, target.role, consumerPorts)
  );
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
  producerPorts: readonly PluginDataPort[],
  consumerPorts: readonly PluginDataPort[]
): ConnectionRuleResult {
  if (hasCompatibleCrossPluginBridge(source, target, producerPorts, consumerPorts)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reasonCode: 'cross_plugin_bridge_missing',
    sourcePluginId: source.pluginId,
    sourceRole: source.role,
    targetPluginId: target.pluginId,
    targetRole: target.role,
  };
}

// ---------------------------------------------------------------------------
// Shell connection evaluator — single entry point used by the canvas
// ---------------------------------------------------------------------------

export type PluginPortMap = ReadonlyMap<
  string,
  PluginPortDescriptor
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
    return { allowed: false, reasonCode: 'self_connection' };
  }

  // SHELL-003
  if (hasDuplicateEdge(source.id, target.id, currentEdges)) {
    return { allowed: false, reasonCode: 'duplicate_edge' };
  }

  // SHELL-001
  if (wouldCreateCycle(source.id, target.id, currentEdges)) {
    return { allowed: false, reasonCode: 'cycle_detected' };
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
