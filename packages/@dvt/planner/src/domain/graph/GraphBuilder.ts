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

// ── helpers ────────────────────────────────────────────────────────────────────

function assertDependsOnIsArray(n: GraphNode): void {
  if (!Array.isArray(n.dependsOn)) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      `Node ${n.nodeId} dependsOn must be an array.`
    );
  }
}

function assertDependsOnStrings(n: GraphNode): void {
  for (const d of n.dependsOn) {
    if (typeof d !== 'string') {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `Node ${n.nodeId} dependsOn must contain only strings.`
      );
    }
  }
}

function validateNodeShape(n: GraphNode): void {
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
  assertDependsOnIsArray(n);
  assertDependsOnStrings(n);
}

function indexNodes(nodes: readonly GraphNode[]): Map<string, GraphNode> {
  const nodesById = new Map<string, GraphNode>();
  for (const n of nodes) {
    validateNodeShape(n);
    if (nodesById.has(n.nodeId)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, `Duplicate nodeId: ${n.nodeId}`);
    }
    nodesById.set(n.nodeId, n);
  }
  return nodesById;
}

interface EdgeContext {
  nodesById: Map<string, GraphNode>;
  dependents: Map<string, string[]>;
  maxEdges: number;
}

function checkDepReference(dep: string, nodeId: string, count: number, ctx: EdgeContext): number {
  if (!ctx.nodesById.has(dep)) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      `Node ${nodeId} dependsOn missing node: ${dep}`
    );
  }
  ctx.dependents.get(dep)?.push(nodeId);
  const next = count + 1;
  if (next > ctx.maxEdges) {
    throwLimitExceeded(`maxEdges exceeded: ${next} > ${ctx.maxEdges}`);
  }
  return next;
}

function countEdges(n: GraphNode, edgeCount: number, ctx: EdgeContext): number {
  let count = edgeCount;
  for (const dep of n.dependsOn) {
    count = checkDepReference(dep, n.nodeId, count, ctx);
  }
  return count;
}

function buildDependencies(
  nodesById: Map<string, GraphNode>,
  maxEdges: number
): { dependentsById: Map<string, readonly string[]>; edgeCount: number } {
  const dependents = new Map<string, string[]>();
  for (const id of nodesById.keys()) dependents.set(id, []);

  const ctx: EdgeContext = { nodesById, dependents, maxEdges };
  let edgeCount = 0;
  for (const n of nodesById.values()) {
    edgeCount = countEdges(n, edgeCount, ctx);
  }

  const dependentsById = new Map<string, readonly string[]>();
  for (const [k, arr] of dependents.entries()) {
    const sorted = [...arr].sort(binaryCompare);
    dependentsById.set(k, sorted);
  }

  return { dependentsById, edgeCount };
}

// ── public API ─────────────────────────────────────────────────────────────────

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

  const nodesById = indexNodes(nodes);
  const { dependentsById, edgeCount } = buildDependencies(nodesById, limits.maxEdges);
  const nodeIdsSorted = [...nodesById.keys()].sort(binaryCompare);

  return { nodesById, dependentsById, nodeIdsSorted, edgeCount };
}
