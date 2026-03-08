/**
 * ADR baseline: ADR-0004-security-limits
 *
 * Design:
 *  - GraphNodeValidator  → SRP: validates a single node's shape (DDD invariant guard)
 *  - NodeRegistry        → SRP: indexes nodes, enforces uniqueness (DDD Repository-lite)
 *  - AdjacencyIndex      → SRP: tracks dependent relationships, sorts on demand
 *  - GraphBuilder        → Domain Service (Fowler) that orchestrates the above
 *
 * The public `buildGraph` function is a thin façade kept for backwards-compatibility.
 */
import { PlannerError, PlannerErrorCode } from '../errors.js';
import type { PlannerLimits } from '../limits.js';
import { throwLimitExceeded } from '../limits.js';
import { binaryCompare } from '../sorting.js';
import type { GraphNode } from '../types.js';

// ── Value object (result) ──────────────────────────────────────────────────────

export interface BuiltGraph {
  readonly nodesById: ReadonlyMap<string, GraphNode>;
  readonly dependentsById: ReadonlyMap<string, readonly string[]>;
  readonly nodeIdsSorted: readonly string[];
  readonly edgeCount: number;
}

// ── GraphNodeValidator ─────────────────────────────────────────────────────────
// SRP: only knows how to assert domain invariants on a single GraphNode.

class GraphNodeValidator {
  validate(node: GraphNode): void {
    this.assertNodeId(node);
    this.assertResourceType(node);
    this.assertDependsOnShape(node);
  }

  private assertNodeId(node: GraphNode): void {
    if (typeof node.nodeId !== 'string' || node.nodeId.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Every node.nodeId must be a non-empty string.'
      );
    }
  }

  private assertResourceType(node: GraphNode): void {
    if (typeof node.resourceType !== 'string' || node.resourceType.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Every node.resourceType must be a non-empty string.'
      );
    }
  }

  private assertDependsOnShape(node: GraphNode): void {
    if (!Array.isArray(node.dependsOn)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `Node ${node.nodeId} dependsOn must be an array.`
      );
    }
    for (const dep of node.dependsOn) {
      if (typeof dep !== 'string') {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          `Node ${node.nodeId} dependsOn must contain only strings.`
        );
      }
    }
  }
}

// ── NodeRegistry ───────────────────────────────────────────────────────────────
// SRP: indexes validated nodes and enforces uniqueness.
// Encapsulates the mutable map; exposes only what consumers need.

class NodeRegistry {
  private readonly store = new Map<string, GraphNode>();

  add(node: GraphNode): void {
    if (this.store.has(node.nodeId)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, `Duplicate nodeId: ${node.nodeId}`);
    }
    this.store.set(node.nodeId, node);
  }

  has(id: string): boolean {
    return this.store.has(id);
  }

  ids(): IterableIterator<string> {
    return this.store.keys();
  }

  nodes(): IterableIterator<GraphNode> {
    return this.store.values();
  }

  asReadonly(): ReadonlyMap<string, GraphNode> {
    return this.store;
  }
}

// ── AdjacencyIndex ─────────────────────────────────────────────────────────────
// SRP: accumulates dependent relationships and produces a sorted, immutable view.

class AdjacencyIndex {
  private readonly dependents = new Map<string, string[]>();

  seed(id: string): void {
    this.dependents.set(id, []);
  }

  recordEdge(fromNodeId: string, toDepId: string): void {
    this.dependents.get(toDepId)?.push(fromNodeId);
  }

  build(): ReadonlyMap<string, readonly string[]> {
    const result = new Map<string, readonly string[]>();
    for (const [id, deps] of this.dependents.entries()) {
      result.set(id, [...deps].sort(binaryCompare));
    }
    return result;
  }
}

// ── GraphBuilder ───────────────────────────────────────────────────────────────
// Domain Service (Fowler): orchestrates validation, indexing and adjacency.
// Does NOT know about persistence or presentation — pure domain logic.

export class GraphBuilder {
  private readonly validator = new GraphNodeValidator();

  build(nodes: readonly GraphNode[], limits: PlannerLimits): BuiltGraph {
    this.enforceNodeLimit(nodes.length, limits.maxNodes);

    const registry = this.buildRegistry(nodes);
    const { dependentsById, edgeCount } = this.buildAdjacency(registry, limits.maxEdges);
    const nodeIdsSorted = [...registry.ids()].sort(binaryCompare);

    return { nodesById: registry.asReadonly(), dependentsById, nodeIdsSorted, edgeCount };
  }

  private enforceNodeLimit(count: number, maxNodes: number): void {
    if (count > maxNodes) {
      throwLimitExceeded(`maxNodes exceeded: ${count} > ${maxNodes}`);
    }
  }

  private buildRegistry(nodes: readonly GraphNode[]): NodeRegistry {
    const registry = new NodeRegistry();
    for (const node of nodes) {
      this.validator.validate(node);
      registry.add(node);
    }
    return registry;
  }

  private buildAdjacency(
    registry: NodeRegistry,
    maxEdges: number
  ): { dependentsById: ReadonlyMap<string, readonly string[]>; edgeCount: number } {
    const index = new AdjacencyIndex();
    for (const id of registry.ids()) index.seed(id);

    let edgeCount = 0;
    for (const node of registry.nodes()) {
      edgeCount = this.registerNodeEdges(node, registry, index, edgeCount, maxEdges);
    }

    return { dependentsById: index.build(), edgeCount };
  }

  private registerNodeEdges(
    node: GraphNode,
    registry: NodeRegistry,
    index: AdjacencyIndex,
    edgeCount: number,
    maxEdges: number
  ): number {
    let count = edgeCount;
    for (const dep of node.dependsOn) {
      this.assertDependencyExists(node.nodeId, dep, registry);
      index.recordEdge(node.nodeId, dep);
      count += 1;
      if (count > maxEdges) {
        throwLimitExceeded(`maxEdges exceeded: ${count} > ${maxEdges}`);
      }
    }
    return count;
  }

  private assertDependencyExists(nodeId: string, dep: string, registry: NodeRegistry): void {
    if (!registry.has(dep)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `Node ${nodeId} dependsOn missing node: ${dep}`
      );
    }
  }
}

// ── Public façade ──────────────────────────────────────────────────────────────
// Backwards-compatible entry point. Callers can also instantiate GraphBuilder
// directly if they need to inject a custom validator or reuse the builder.

export function buildGraph(nodes: readonly GraphNode[], limits: PlannerLimits): BuiltGraph {
  return new GraphBuilder().build(nodes, limits);
}
