/**
 * ADR baseline: ADR-0004-security-limits
 *
 * Design (SOLID + DDD + CQRS):
 *
 *  CQRS segregation:
 *   - COMMAND side → BuildGraphCommand (input VO) + GraphBuilder.execute()
 *   - QUERY side   → BuiltGraph (read model, fully immutable)
 *
 *  Sub-responsibilities (SRP):
 *   - GraphNodeValidator  → invariant guard for a single GraphNode
 *   - NodeRegistry        → uniqueness-enforcing index (DDD Repository-lite)
 *   - AdjacencyIndex      → accumulates + projects dependent relationships
 *   - GraphBuilder        → Domain Service (Fowler) coordinating the above
 */
import { PlannerError, PlannerErrorCode } from '../errors.js';
import type { PlannerLimits } from '../limits.js';
import { throwLimitExceeded } from '../limits.js';
import { binaryCompare } from '../sorting.js';
import type { GraphNode } from '../types.js';

// ── COMMAND ────────────────────────────────────────────────────────────────────
// Immutable value object expressing the intent to build a graph.
// Carries all inputs needed by the command handler; nothing more.

export class BuildGraphCommand {
  constructor(
    readonly nodes: readonly GraphNode[],
    readonly limits: PlannerLimits
  ) {}
}

// ── READ MODEL (Query side) ────────────────────────────────────────────────────
// Fully immutable projection produced by the command handler.
// Callers only READ this — they never mutate it.

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
  private count = 0;

  constructor(private readonly maxEdges: number) {}

  seed(id: string): void {
    this.dependents.set(id, []);
  }

  recordEdge(fromNodeId: string, toDepId: string): void {
    this.count += 1;
    if (this.count > this.maxEdges) {
      throwLimitExceeded(`maxEdges exceeded: ${this.count} > ${this.maxEdges}`);
    }
    this.dependents.get(toDepId)?.push(fromNodeId);
  }

  get edgeCount(): number {
    return this.count;
  }

  build(): ReadonlyMap<string, readonly string[]> {
    const result = new Map<string, readonly string[]>();
    for (const [id, deps] of this.dependents.entries()) {
      result.set(id, [...deps].sort(binaryCompare));
    }
    return result;
  }
}

// ── GraphBuilder (Command Handler) ───────────────────────────────────────────
// Domain Service (Fowler / CQRS): handles BuildGraphCommand and returns
// the BuiltGraph read model. No persistence, no side effects, deterministic.

export class GraphBuilder {
  private readonly validator = new GraphNodeValidator();

  /**
   * COMMAND handler: receives a BuildGraphCommand, validates all domain
   * invariants, and produces a BuiltGraph read model.
   * QUERY concerns live only in the returned BuiltGraph.
   */
  execute(command: BuildGraphCommand): BuiltGraph {
    this.enforceNodeLimit(command.nodes.length, command.limits.maxNodes);

    const registry = this.buildRegistry(command.nodes);
    const { dependentsById, edgeCount } = this.buildAdjacency(registry, command.limits.maxEdges);
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
    const index = new AdjacencyIndex(maxEdges);
    for (const id of registry.ids()) index.seed(id);
    for (const node of registry.nodes()) this.registerNodeEdges(node, registry, index);
    return { dependentsById: index.build(), edgeCount: index.edgeCount };
  }

  private registerNodeEdges(node: GraphNode, registry: NodeRegistry, index: AdjacencyIndex): void {
    for (const dep of node.dependsOn) {
      this.assertDependencyExists(node, dep, registry);
      index.recordEdge(node.nodeId, dep);
    }
  }

  private assertDependencyExists(node: GraphNode, dep: string, registry: NodeRegistry): void {
    if (!registry.has(dep)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        `Node ${node.nodeId} dependsOn missing node: ${dep}`
      );
    }
  }
}
