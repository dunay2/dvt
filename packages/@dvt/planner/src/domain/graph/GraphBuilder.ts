/**
 * ADR baseline: ADR-0004-security-limits
 */
import { PlannerError, PlannerErrorCode } from '../errors.js';
import type { PlannerLimits } from '../limits.js';
import { throwLimitExceeded } from '../limits.js';
import { binaryCompare } from '../sorting.js';
import type { GraphNode } from '../types.js';

export interface BuiltGraph {
  nodesById: ReadonlyMap<string, GraphNode>;
  dependentsById: ReadonlyMap<string, readonly string[]>;
  nodeIdsSorted: readonly string[];
  edgeCount: number;
}

/**
 * Build and validate graph.
 * - Enforces node uniqueness
 * - Validates dependsOn: string[] and references exist
 * - Enforces maxNodes / maxEdges
 */
export function buildGraph(nodes: readonly GraphNode[], limits: PlannerLimits): BuiltGraph {
  if (nodes.length > limits.maxNodes) {
    throwLimitExceeded(`maxNodes exceeded: ${nodes.length} > ${limits.maxNodes}`);
  }

  const nodesById = new Map<string, GraphNode>();
  for (const n of nodes) {
    if (typeof n.nodeId !== 'string' || n.nodeId.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Every node.nodeId must be a non-empty string.'
      );
    }
    if (typeof n.resourceType !== 'string' || n.resourceType.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Every node.resourceType must be a non-empty string.'
      );
    }
    if (!Array.isArray(n.dependsOn)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `Node ${n.nodeId} dependsOn must be an array.`
      );
    }
    for (const d of n.dependsOn) {
      if (typeof d !== 'string') {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          `Node ${n.nodeId} dependsOn must contain only strings.`
        );
      }
    }
    if (nodesById.has(n.nodeId)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, `Duplicate nodeId: ${n.nodeId}`);
    }
    nodesById.set(n.nodeId, n);
  }

  // validate references + build dependents adjacency
  const dependents = new Map<string, string[]>();
  for (const id of nodesById.keys()) dependents.set(id, []);

  let edgeCount = 0;
  for (const n of nodesById.values()) {
    for (const dep of n.dependsOn) {
      if (!nodesById.has(dep)) {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          `Node ${n.nodeId} dependsOn missing node: ${dep}`
        );
      }
      dependents.get(dep)?.push(n.nodeId);
      edgeCount += 1;
      if (edgeCount > limits.maxEdges) {
        throwLimitExceeded(`maxEdges exceeded: ${edgeCount} > ${limits.maxEdges}`);
      }
    }
  }

  // deterministically sort dependents lists
  const dependentsById = new Map<string, readonly string[]>();
  for (const [k, arr] of dependents.entries()) {
    dependentsById.set(k, arr.sort(binaryCompare));
  }

  const nodeIdsSorted = [...nodesById.keys()].sort(binaryCompare);

  return { nodesById, dependentsById, nodeIdsSorted, edgeCount };
}
