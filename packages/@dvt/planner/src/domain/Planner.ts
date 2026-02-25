import { nowMs } from '../runtime/time.js';

import { asPlannerError, PlannerError, PlannerErrorCode } from './errors.js';
import { computeTopoDepth } from './graph/Depth.js';
import { buildGraph } from './graph/GraphBuilder.js';
import { topoSort } from './graph/TopoSort.js';
import { sha256CanonicalJson } from './hashing.js';
import { resolveLimits, type PlannerLimits, throwLimitExceeded } from './limits.js';
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

      // 1) Build & validate graph
      const graph = buildGraph(input.nodes, this.limits);
      this.metrics.recordNodeCount(graph.nodeIdsSorted.length);
      this.checkAbort(started);

      // 2) Resolve policies (known subset)
      const resolvedPolicies = resolvePolicies(input.policies);
      this.checkAbort(started);

      // 3) Select nodes (upstream/downstream)
      const selected = selectNodes(graph.nodesById, graph.dependentsById, input.selection);
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

      // 6) Steps
      const steps = topo.map((nodeId) => {
        const node = graph.nodesById.get(nodeId);
        if (node === undefined) {
          throw new PlannerError(
            PlannerErrorCode.INTERNAL_ERROR,
            `Missing node ${nodeId} in graph`
          );
        }
        return this.stepFactory(node, resolvedPolicies);
      });

      // Normalize dependsOn ordering deterministically
      const normalizedSteps = steps.map((s) => ({
        ...s,
        dependsOn: [...s.dependsOn].sort(binaryCompare),
      }));

      // 7) Semantic input hash (only nodes, selection, policies)
      const inputHashSha256 = await computeInputHashSha256(input);
      this.checkAbort(started);

      // 8) Build planCore (the hashed object; no planId / createdAt / observability)
      const planCore: PlanCore = {
        metadata: {
          planVersion: '2.3',
          inputHashSha256,
        },
        steps: normalizedSteps,
      };

      // 9) planId = sha256(JCS(planCore)); canonicalPlanJson MUST be JCS(planCore)
      const {
        canonical: canonicalPlanJson,
        sha256: planId,
        bytes,
      } = await sha256CanonicalJson(planCore);

      if (bytes > this.limits.maxPlanSizeBytes) {
        throwLimitExceeded(`maxPlanSizeBytes exceeded: ${bytes} > ${this.limits.maxPlanSizeBytes}`);
      }
      this.metrics.recordPlanSize(bytes);

      // 10) Build final plan (post-hash provenance fields)
      const planBase: ExecutionPlanV2 = {
        ...planCore,
        metadata: {
          ...planCore.metadata,
          planId,
          createdAtIso: new Date().toISOString(),
        },
      };

      const plan: ExecutionPlanV2 =
        input.observability === undefined
          ? planBase
          : {
              ...planBase,
              observability: input.observability,
            };

      this.metrics.recordDuration(nowMs() - started);
      return { plan, canonicalPlanJson };
    } catch (err: unknown) {
      const pe = asPlannerError(err);
      this.metrics.recordFailure(pe.code);
      this.metrics.recordDuration(nowMs() - started);
      throw pe;
    }
  }

  private validateInputEnvelope(input: PlannerInputEnvelopeV2): void {
    if (typeof input !== 'object' || input === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input must be an object.');
    }
    if (!Array.isArray(input.nodes)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input.nodes must be an array.');
    }
    if (typeof input.selection !== 'object' || input.selection === null) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, 'input.selection must be an object.');
    }
    if (!Array.isArray(input.selection.selectedNodeIds)) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'selection.selectedNodeIds must be an array.'
      );
    }
    for (const id of input.selection.selectedNodeIds) {
      if (typeof id !== 'string') {
        throw new PlannerError(
          PlannerErrorCode.INVALID_INPUT,
          'selection.selectedNodeIds must contain only strings.'
        );
      }
    }
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
function selectNodes(
  nodesById: ReadonlyMap<string, GraphNode>,
  dependentsById: ReadonlyMap<string, readonly string[]>,
  selection: PlannerSelection
): readonly string[] {
  const includeUpstream = selection.includeUpstream ?? true;
  const includeDownstream = selection.includeDownstream ?? false;

  const out = new Set<string>(selection.selectedNodeIds);

  // validate seeds exist
  for (const id of selection.selectedNodeIds) {
    if (!nodesById.has(id)) {
      throw new PlannerError(PlannerErrorCode.INVALID_INPUT, `Selected node does not exist: ${id}`);
    }
  }

  if (includeUpstream) {
    const stack = [...out];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) break;
      const node = nodesById.get(id);
      if (node === undefined) continue;
      for (const dep of node.dependsOn) {
        if (!out.has(dep)) {
          out.add(dep);
          stack.push(dep);
        }
      }
    }
  }

  if (includeDownstream) {
    const stack = [...out];
    while (stack.length > 0) {
      const id = stack.pop();
      if (id === undefined) break;
      const deps = dependentsById.get(id) ?? [];
      for (const child of deps) {
        if (!out.has(child)) {
          out.add(child);
          stack.push(child);
        }
      }
    }
  }

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
