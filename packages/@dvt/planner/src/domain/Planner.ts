/**
 * Design (SOLID + DDD + CQRS):
 *
 *  CQRS segregation:
 *   - COMMAND side → BuildPlanCommand (input VO) + Planner.execute()
 *   - QUERY side   → { plan: ExecutionPlanV2; canonicalPlanJson: string } (read model)
 *
 *  Delegated sub-responsibilities (SRP):
 *   - InputEnvelopeValidator → validates shape of the input envelope
 *   - ManifestGraphDeriver   → derives GraphNodes from a dbt manifest
 *   - GraphBuilder           → builds and validates the dependency graph
 *   - NodeSelector           → resolves which nodes participate in the run
 *   - PlanAssembler          → hashes inputs and assembles the immutable plan
 *
 *  This class is the entry-point Domain Service: it orchestrates the pipeline
 *  and owns cross-cutting concerns (abort, metrics, limits).
 */
import { createDefaultStepTypeRegistry, type IStepTypeRegistry } from '@dvt/contracts';

import { nowMs } from '../runtime/time.js';

import { asPlannerError, PlannerError, PlannerErrorCode } from './errors.js';
import { computeTopoDepth } from './graph/Depth.js';
import { BuildGraphCommand, GraphBuilder } from './graph/GraphBuilder.js';
import { topoSort } from './graph/TopoSort.js';
import { InputEnvelopeValidator } from './InputEnvelopeValidator.js';
import { resolveLimits, type PlannerLimits, throwLimitExceeded } from './limits.js';
import { DeriveNodesCommand, ManifestGraphDeriver } from './manifest.js';
import { NoopPlannerMetrics, type PlannerMetrics } from './metrics.js';
import { NodeSelector, SelectNodesCommand } from './NodeSelector.js';
import { AssemblePlanCommand, PlanAssembler } from './PlanAssembler.js';
import { resolvePolicies } from './policies.js';
import { binaryCompare } from './sorting.js';
import { dbtStepFactory } from './stepFactory/dbtStepFactory.js';
import type { StepFactory } from './stepFactory/StepFactory.js';
import type {
  ExecutionPlanV2,
  GraphNode,
  NormalizedPlannerInput,
  PlanCore,
  PlannerInputEnvelopeV2,
} from './types.js';

// ── COMMAND ────────────────────────────────────────────────────────────────────
// Immutable value object expressing the intent to build an execution plan.

export class BuildPlanCommand {
  constructor(readonly input: PlannerInputEnvelopeV2) {}
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
   * Unknown kinds pass through (fail-open per ADR-0006).
   */
  stepTypeRegistry?: IStepTypeRegistry;
}

// ── Planner (Domain Service / Command Handler) ─────────────────────────────────
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
  execute(
    command: BuildPlanCommand
  ): Promise<{ plan: ExecutionPlanV2; canonicalPlanJson: string }> {
    return this.buildPlan(command.input);
  }

  /**
   * Primary public API (retained for call-site compatibility).
   * Internally delegates to the CQRS collaborators.
   */
  public async buildPlan(
    input: PlannerInputEnvelopeV2
  ): Promise<{ plan: ExecutionPlanV2; canonicalPlanJson: string }> {
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
      this.validateStepConfigs(normalizedSteps);

      // 7) Assemble plan
      const result = await this.assembler.execute(
        new AssemblePlanCommand(normalizedInput, normalizedSteps, this.limits.maxPlanSizeBytes)
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

  private normalizeInput(input: PlannerInputEnvelopeV2): NormalizedPlannerInput {
    let nodes: readonly GraphNode[];
    if (Array.isArray(input.nodes) && input.nodes.length > 0) {
      nodes = input.nodes;
    } else if (input.manifest === undefined) {
      nodes = [];
    } else {
      nodes = new ManifestGraphDeriver().execute(new DeriveNodesCommand(input.manifest));
    }
    if (nodes.length === 0) {
      throw new PlannerError(
        PlannerErrorCode.INVALID_INPUT,
        'Planner requires non-empty nodes (directly or derived from manifest).'
      );
    }
    return { ...input, nodes };
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

  private validateStepConfigs(steps: PlanCore['steps']): void {
    for (const step of steps) {
      const result = this.stepTypeRegistry.validate(step.kind, step.stepTypeConfig);
      if (!result.success) {
        throw new PlannerError(PlannerErrorCode.INVALID_STEP_CONFIG, result.error);
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
