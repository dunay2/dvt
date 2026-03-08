import { nowMs } from '../runtime/time.js';

import { asPlannerError, PlannerError, PlannerErrorCode } from './errors.js';
import { computeTopoDepth } from './graph/Depth.js';
import { BuildGraphCommand, GraphBuilder, type BuiltGraph } from './graph/GraphBuilder.js';
import { topoSort } from './graph/TopoSort.js';
import { sha256CanonicalJson } from './hashing.js';
import { resolveLimits, type PlannerLimits, throwLimitExceeded } from './limits.js';
import { deriveGraphNodesFromManifest } from './manifest.js';
import { NoopPlannerMetrics, type PlannerMetrics } from './metrics.js';
import { resolvePolicies } from './policies.js';
import { binaryCompare } from './sorting.js';
import { dbtStepFactory } from './stepFactory/dbtStepFactory.js';
import type { StepFactory } from './stepFactory/StepFactory.js';
import type {
  ExecutionPlanV2,
  PlannerInputEnvelopeV2,
  PlannerSelection,
  GraphNode,
  PlanCore,
} from './types.js';

type NormalizedPlannerInput = Omit<PlannerInputEnvelopeV2, 'nodes'> & {
  nodes: readonly GraphNode[];
};

export interface PlannerOptions {
  limits?: Partial<PlannerLimits>;
  metrics?: PlannerMetrics;
  /**
   * Deterministic abort hook owned by caller.
   * MUST be side-effect free and deterministic for given run context.
   */
  shouldAbort?: () => boolean;
  stepFactory?: StepFactory;
}

/**
 * Pure deterministic planner.
 *
 * Guarantees:
 * - planId = sha256(JCS(planCore)), where planCore = { metadata: { planVersion, inputHashSha256 }, steps }
 * - canonicalPlanJson = JCS(planCore), i.e. caller can verify sha256(canonicalPlanJson) === planId
 * - inputHashSha256 = sha256(JCS({ nodes, selection, policies })) excluding observability and volatile fields
 * - Same semantic input -> same planId across Node/Bun/Deno
 */
export class Planner {
  private readonly limits: PlannerLimits;
  private readonly metrics: PlannerMetrics;
  private readonly shouldAbort: () => boolean;
  private readonly stepFactory: StepFactory;

  constructor(options?: PlannerOptions) {
    this.limits = resolveLimits(options?.limits);
    this.metrics = options?.metrics ?? NoopPlannerMetrics;
    this.shouldAbort = options?.shouldAbort ?? (() => false);
    this.stepFactory = options?.stepFactory ?? dbtStepFactory;
  }

  public async buildPlan(
    input: PlannerInputEnvelopeV2
  ): Promise<{ plan: ExecutionPlanV2; canonicalPlanJson: string }> {
    const started = nowMs();

    try {
      this.checkAbort(started);
      this.validateInputEnvelope(input);

      const normalizedInput = this.normalizeInput(input);

      // 1) Build & validate graph
      const graph = new GraphBuilder().execute(
        new BuildGraphCommand(normalizedInput.nodes, this.limits)
      );
      this.metrics.recordNodeCount(graph.nodeIdsSorted.length);
      this.checkAbort(started);

      // 2) Resolve policies (known subset)
      const resolvedPolicies = resolvePolicies(normalizedInput.policies);
      this.checkAbort(started);

      // 3) Select nodes (upstream/downstream)
      const selected = selectNodes(
        graph.nodesById,
        graph.dependentsById,
        normalizedInput.selection
      );
      if (selected.length > this.limits.maxNodes) {
        throwLimitExceeded(
          `Selection exceeds maxNodes: ${selected.length} > ${this.limits.maxNodes}`
        );
      }
      this.checkAbort(started);

      // 4) Topological order
      const topo = topoSort(graph, selected);
      this.checkAbort(started);

      // 5) Depth limit
      const selectedSet = new Set(selected);
      const depth = computeTopoDepth(graph, topo, selectedSet);
      if (depth > this.limits.maxDepth) {
        throwLimitExceeded(`maxDepth exceeded: ${depth} > ${this.limits.maxDepth}`);
      }
      this.checkAbort(started);

      // 6) Build and normalize steps
      const normalizedSteps = this.buildNormalizedSteps(graph, topo, resolvedPolicies);

      // 7-10) Hash, assemble and verify plan
      const result = await this.hashAndFinalizePlan(normalizedInput, normalizedSteps);

      this.metrics.recordDuration(nowMs() - started);
      return result;
    } catch (err: unknown) {
      const pe = asPlannerError(err);
      this.metrics.recordFailure(pe.code);
      this.metrics.recordDuration(nowMs() - started);
      throw pe;
    }
  }

  private assertEnvelopeShape(input: PlannerInputEnvelopeV2): void {
    if (typeof input !== 'object' || input === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input must be an object.');
    }
    if (input.manifest === undefined && !Array.isArray(input.nodes)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'input.nodes must be an array when manifest is not provided.'
      );
    }
  }

  private assertSelectionShape(selection: PlannerInputEnvelopeV2['selection']): void {
    if (typeof selection !== 'object' || selection === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input.selection must be an object.');
    }
    if (!Array.isArray(selection.selectedNodeIds)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'selection.selectedNodeIds must be an array.'
      );
    }
    for (const id of selection.selectedNodeIds) {
      if (typeof id !== 'string') {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          'selection.selectedNodeIds must contain only strings.'
        );
      }
    }
  }

  private validateInputEnvelope(input: PlannerInputEnvelopeV2): void {
    this.assertEnvelopeShape(input);
    this.assertSelectionShape(input.selection);
  }

  private normalizeInput(input: PlannerInputEnvelopeV2): NormalizedPlannerInput {
    let nodes: readonly GraphNode[];
    if (Array.isArray(input.nodes) && input.nodes.length > 0) {
      nodes = input.nodes;
    } else if (input.manifest === undefined) {
      nodes = [];
    } else {
      nodes = deriveGraphNodesFromManifest(input.manifest);
    }

    if (nodes.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Planner requires non-empty nodes (directly or derived from manifest).'
      );
    }

    return {
      ...input,
      nodes,
    };
  }

  private buildNormalizedSteps(
    graph: BuiltGraph,
    topo: readonly string[],
    resolvedPolicies: ReturnType<typeof resolvePolicies>
  ): PlanCore['steps'] {
    const steps = topo.map((nodeId) => {
      const node = graph.nodesById.get(nodeId);
      if (node === undefined) {
        throw new PlannerError(PlannerErrorCode.INTERNAL_ERROR, `Missing node ${nodeId} in graph`);
      }
      return this.stepFactory(node, resolvedPolicies);
    });
    return steps.map((s) => ({
      ...s,
      dependsOn: [...s.dependsOn].sort(binaryCompare),
    }));
  }

  private async hashAndFinalizePlan(
    normalizedInput: NormalizedPlannerInput,
    normalizedSteps: PlanCore['steps']
  ): Promise<{ plan: ExecutionPlanV2; canonicalPlanJson: string }> {
    const inputHashSha256 = await computeInputHashSha256(normalizedInput);

    const planCore: PlanCore = {
      metadata: { planVersion: '2.3', inputHashSha256 },
      steps: normalizedSteps,
    };

    const {
      canonical: canonicalPlanJson,
      sha256: planId,
      bytes,
    } = await sha256CanonicalJson(planCore);

    if (bytes > this.limits.maxPlanSizeBytes) {
      throwLimitExceeded(`maxPlanSizeBytes exceeded: ${bytes} > ${this.limits.maxPlanSizeBytes}`);
    }
    this.metrics.recordPlanSize(bytes);

    const planBase: ExecutionPlanV2 = {
      ...planCore,
      metadata: { ...planCore.metadata, planId, createdAtIso: new Date().toISOString() },
    };

    const plan: ExecutionPlanV2 =
      normalizedInput.observability === undefined
        ? planBase
        : { ...planBase, observability: normalizedInput.observability };

    const layerBoundaries = computeLayerBoundaries(normalizedSteps);
    if (layerBoundaries.length > 0) {
      plan.observability = {
        ...plan.observability,
        extra: {
          ...plan.observability?.extra,
          plannerLayers: layerBoundaries,
        },
      };
    }

    return { plan, canonicalPlanJson };
  }

  private checkAbort(startedMs: number): void {
    if (this.shouldAbort()) {
      throw new PlannerError(PlannerErrorCode.TIMEOUT, 'Planning aborted by caller hook.');
    }
    const elapsed = nowMs() - startedMs;
    if (elapsed > this.limits.timeoutMs) {
      throw new PlannerError(
        PlannerErrorCode.TIMEOUT,
        `Planning exceeded timeout: ${elapsed.toFixed(2)}ms > ${this.limits.timeoutMs}ms`
      );
    }
  }
}

/**
 * Node selection expansion.
 *
 * - includeUpstream (default true): include transitive dependencies.
 * - includeDownstream (default false): include transitive dependents.
 * - If both true: upstream expansion from seeds, then downstream expansion from expanded set.
 */
function assertSeedsExist(
  nodesById: ReadonlyMap<string, GraphNode>,
  selectedNodeIds: readonly string[]
): void {
  for (const id of selectedNodeIds) {
    if (!nodesById.has(id)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, `Selected node does not exist: ${id}`);
    }
  }
}

function visitUpstreamNode(
  id: string,
  nodesById: ReadonlyMap<string, GraphNode>,
  out: Set<string>,
  stack: string[]
): void {
  (nodesById.get(id)?.dependsOn ?? [])
    .filter((dep) => !out.has(dep))
    .forEach((dep) => {
      out.add(dep);
      stack.push(dep);
    });
}

function expandUpstream(nodesById: ReadonlyMap<string, GraphNode>, out: Set<string>): void {
  const stack = [...out];
  while (stack.length) visitUpstreamNode(stack.pop()!, nodesById, out, stack);
}

function visitDownstreamNode(
  id: string,
  dependentsById: ReadonlyMap<string, readonly string[]>,
  out: Set<string>,
  stack: string[]
): void {
  (dependentsById.get(id) ?? [])
    .filter((child) => !out.has(child))
    .forEach((child) => {
      out.add(child);
      stack.push(child);
    });
}

function expandDownstream(
  dependentsById: ReadonlyMap<string, readonly string[]>,
  out: Set<string>
): void {
  const stack = [...out];
  while (stack.length) visitDownstreamNode(stack.pop()!, dependentsById, out, stack);
}

function selectNodes(
  nodesById: ReadonlyMap<string, GraphNode>,
  dependentsById: ReadonlyMap<string, readonly string[]>,
  selection: PlannerSelection
): readonly string[] {
  const out = new Set<string>(selection.selectedNodeIds);
  assertSeedsExist(nodesById, selection.selectedNodeIds);

  if (selection.includeUpstream ?? true) expandUpstream(nodesById, out);
  if (selection.includeDownstream ?? false) expandDownstream(dependentsById, out);

  return [...out].sort(binaryCompare);
}

/**
 * Semantic input hash includes: nodes, selection, policies.
 * Excludes: observability, requestedBy, requestId, requestedAtIso.
 */
async function computeInputHashSha256(input: PlannerInputEnvelopeV2): Promise<string> {
  const semantic = {
    nodes: input.nodes,
    selection: input.selection,
    policies: input.policies,
  };
  const { sha256 } = await sha256CanonicalJson(semantic);
  return sha256;
}

function computeLayerBoundaries(
  steps: readonly { stepId: string; dependsOn: readonly string[] }[]
): number[] {
  if (steps.length === 0) return [];

  const depthByStepId = new Map<string, number>();
  let maxDepth = 0;

  for (const step of steps) {
    let bestParentDepth = 0;
    for (const dep of step.dependsOn) {
      const depDepth = depthByStepId.get(dep);
      if (depDepth !== undefined && depDepth > bestParentDepth) {
        bestParentDepth = depDepth;
      }
    }
    const depth = bestParentDepth + 1;
    depthByStepId.set(step.stepId, depth);
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }

  const layers = Array.from({ length: maxDepth }, () => 0);
  for (const depth of depthByStepId.values()) {
    layers[depth - 1] = (layers[depth - 1] ?? 0) + 1;
  }

  return layers;
}
