/**
 * Design (SOLID + DDD + CQRS):
 *
 *  CQRS segregation:
 *   - COMMAND side → BuildPlanCommand (input VO) + Planner.execute()
 *   - QUERY side   → { plan: ExecutionPlan; executionPolicy: RunExecutionPolicy; canonicalPlanCoreJson: string }
 *
 *  Delegated sub-responsibilities (SRP):
 *   - InputEnvelopeValidator → validates shape of the input envelope
 *   - GraphBuilder           → builds and validates the canonical dependency graph
 *   - NodeSelector           → resolves which nodes participate in the run
 *   - PlanAssembler          → hashes inputs and assembles the immutable plan
 *
 *  Source adapters own translation into GenericGraphSource before this boundary.
 *  Planner consumes admitted logical node identity verbatim and never derives it
 *  from manifest keys, names, paths, providers, or other physical bindings.
 *
 *  This class is the entry-point Domain Service: it orchestrates the pipeline
 *  and owns cross-cutting concerns (abort, metrics, limits).
 */
import {
  collectRequiredCapabilitiesForSteps,
  createDefaultStepTypeRegistry,
  type IStepTypeRegistry,
  validateHttpJsonArtifactHandoffs,
} from '@dvt/contracts';

import { nowMs } from '../runtime/time.js';

import { asPlannerError, PlannerError, PlannerErrorCode } from './errors.js';
import { computeTopoDepth } from './graph/Depth.js';
import { BuildGraphCommand, GraphBuilder } from './graph/GraphBuilder.js';
import { topoSort } from './graph/TopoSort.js';
import { InputEnvelopeValidator } from './InputEnvelopeValidator.js';
import { resolveLimits, type PlannerLimits, throwLimitExceeded } from './limits.js';
import { NoopPlannerMetrics, type PlannerMetrics } from './metrics.js';
import { NodeSelector, SelectNodesCommand } from './NodeSelector.js';
import { AssemblePlanCommand, PlanAssembler } from './PlanAssembler.js';
import { projectPlanExecutionDecisions } from './PlanExecutionDecisionProjector.js';
import { resolvePolicies } from './policies.js';
import { binaryCompare } from './sorting.js';
import { dbtStepFactory } from './stepFactory/dbtStepFactory.js';
import type { StepFactory } from './stepFactory/StepFactory.js';
import type {
  ExecutionPlan,
  GraphNode,
  NormalizedPlannerInput,
  PlanCore,
  PlannerInputEnvelopeV1,
} from './types.js';

// ── COMMAND ────────────────────────────────────────────────────────────────────
// Immutable value object expressing the intent to build an execution plan.

export class BuildPlanCommand {
  constructor(readonly input: PlannerInputEnvelopeV1) {}
}

// ── Options ────────────────────────────────────────────────────────────────────

export interface PlannerOptions {
  limits?: Partial<PlannerLimits>;
  metrics?: PlannerMetrics;
  /**
   * Deterministic abort hook owned by caller.
   * MUST be side-effect free and deterministic for given run context.
   */
  shouldAbort?: () => boolean;
  stepFactory?: StepFactory;
  /**
   * Registry used to validate stepTypeConfig per step kind at plan build-time (G9).
   * Defaults to the built-in registry (DBT_MODEL, DBT_TEST, DBT_SNAPSHOT).
   * Known kinds with invalid config throw INVALID_STEP_CONFIG.
   * Unknown kinds are rejected at the registry boundary.
   */
  stepTypeRegistry?: IStepTypeRegistry;
}

// ── Planner (Domain Service / Command Handler) ─────────────────────────────────
/**
 * Pure deterministic planner.
 *
 * Guarantees:
 * - planId = sha256(JCS(planCore)), where planCore = { metadata: { planVersion, inputHashSha256 }, steps }
 * - canonicalPlanCoreJson = JCS(planCore), i.e. caller can verify
 *   sha256(canonicalPlanCoreJson) === planId
 * - inputHashSha256 = sha256(JCS({ nodes, selection, policies })) excluding observability and volatile fields
 * - Same semantic input -> same planId across Node/Bun/Deno
 */
export class Planner {
  private readonly limits: PlannerLimits;
  private readonly metrics: PlannerMetrics;
  private readonly shouldAbort: () => boolean;
  private readonly stepFactory: StepFactory;
  private readonly stepTypeRegistry: IStepTypeRegistry;
  private readonly validator = new InputEnvelopeValidator();
  private readonly selector = new NodeSelector();
  private readonly assembler: PlanAssembler;

  constructor(options?: PlannerOptions) {
    this.limits = resolveLimits(options?.limits);
    this.metrics = options?.metrics ?? NoopPlannerMetrics;
    this.shouldAbort = options?.shouldAbort ?? (() => false);
    this.stepFactory = options?.stepFactory ?? dbtStepFactory;
    this.stepTypeRegistry = options?.stepTypeRegistry ?? createDefaultStepTypeRegistry();
    this.assembler = new PlanAssembler(this.metrics);
  }

  /** CQRS command handler entry point. */
  execute(command: BuildPlanCommand): Promise<{
    plan: ExecutionPlan;
    executionPolicy: import('@dvt/contracts').RunExecutionPolicy;
    canonicalPlanCoreJson: string;
  }> {
    return this.buildPlan(command.input);
  }

  /** Domain build API. Public callers enter through PlannerFacade. */
  public async buildPlan(input: PlannerInputEnvelopeV1): Promise<{
    plan: ExecutionPlan;
    executionPolicy: import('@dvt/contracts').RunExecutionPolicy;
    canonicalPlanCoreJson: string;
  }> {
    const started = nowMs();
    try {
      this.checkAbort(started);
      this.validator.validate(input);

      const normalizedInput = this.normalizeInput(input);

      // 1) Graph
      const graph = new GraphBuilder().execute(
        new BuildGraphCommand(normalizedInput.nodes, this.limits)
      );
      this.metrics.recordNodeCount(graph.nodeIdsSorted.length);
      this.checkAbort(started);

      // 2) Policies
      const resolvedPolicies = resolvePolicies(normalizedInput.policies);
      this.checkAbort(started);

      // 3) Node selection
      const selected = this.selector.execute(
        new SelectNodesCommand(graph.nodesById, graph.dependentsById, normalizedInput.selection)
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
      const depth = computeTopoDepth(graph, topo, new Set(selected));
      if (depth > this.limits.maxDepth) {
        throwLimitExceeded(`maxDepth exceeded: ${depth} > ${this.limits.maxDepth}`);
      }
      this.checkAbort(started);

      // 6) Build steps + validate configs via registry (G9)
      const normalizedSteps = this.buildNormalizedSteps(graph.nodesById, topo, resolvedPolicies);
      this.validateStepConfigs(normalizedSteps, normalizedInput.ownership);
      this.validateArtifactHandoffs(normalizedSteps);

      // 7) Assemble plan
      const requiredCapabilities = collectRequiredCapabilitiesForSteps(
        this.stepTypeRegistry,
        normalizedSteps
      );
      const decisions =
        normalizedInput.decisionScope === undefined
          ? []
          : projectPlanExecutionDecisions({
              allNodeIds: normalizedInput.decisionScope.nodeIds,
              selectedNodeIds: selected,
              selectedRootNodeIds:
                normalizedInput.decisionScope.requestedRootNodeIds ??
                normalizedInput.selection.selectedNodeIds,
            });
      const result = await this.assembler.execute(
        new AssemblePlanCommand(
          normalizedInput,
          normalizedSteps,
          this.limits.maxPlanSizeBytes,
          requiredCapabilities,
          decisions
        )
      );

      this.metrics.recordDuration(nowMs() - started);
      return result;
    } catch (err: unknown) {
      const pe = asPlannerError(err);
      this.metrics.recordFailure(pe.code);
      this.metrics.recordDuration(nowMs() - started);
      throw pe;
    }
  }

  private normalizeInput(input: PlannerInputEnvelopeV1): NormalizedPlannerInput {
    const nodes: readonly GraphNode[] = input.graphSource.nodes;
    if (nodes.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Planner requires non-empty nodes from graphSource.'
      );
    }
    const decisionScope = input.decisionScope
      ? {
          nodeIds: [...input.decisionScope.nodeIds].sort(binaryCompare),
          ...(input.decisionScope.requestedRootNodeIds === undefined
            ? {}
            : {
                requestedRootNodeIds: [...input.decisionScope.requestedRootNodeIds].sort(
                  binaryCompare
                ),
              }),
        }
      : undefined;
    return {
      ...input,
      nodes,
      ...(decisionScope === undefined ? {} : { decisionScope }),
    };
  }

  private buildNormalizedSteps(
    nodesById: ReadonlyMap<string, GraphNode>,
    topo: readonly string[],
    resolvedPolicies: ReturnType<typeof resolvePolicies>
  ): PlanCore['steps'] {
    return topo
      .map((nodeId) => {
        const node = nodesById.get(nodeId);
        if (node === undefined) {
          throw new PlannerError(
            PlannerErrorCode.INTERNAL_ERROR,
            `Missing node ${nodeId} in graph`
          );
        }
        return this.stepFactory(node, resolvedPolicies);
      })
      .map((s) => ({ ...s, dependsOn: [...s.dependsOn].sort(binaryCompare) }));
  }

  private validateStepConfigs(
    steps: PlanCore['steps'],
    planOwnership: NormalizedPlannerInput['ownership']
  ): void {
    for (const step of steps) {
      const result = this.stepTypeRegistry.validate(step.kind, step.stepTypeConfig, {
        ...(planOwnership === undefined ? {} : { planOwnership }),
      });
      if (!result.success) {
        throw new PlannerError(PlannerErrorCode.INVALID_STEP_CONFIG, result.error);
      }
    }
  }

  private validateArtifactHandoffs(steps: PlanCore['steps']): void {
    const error = validateHttpJsonArtifactHandoffs(steps);
    if (error !== undefined) {
      throw new PlannerError(PlannerErrorCode.INVALID_STEP_CONFIG, error);
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
