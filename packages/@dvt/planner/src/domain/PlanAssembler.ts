/**
 * Design (SOLID + DDD + CQRS):
 *
 *  CQRS segregation:
 *   - COMMAND side → AssemblePlanCommand (input VO)
 *   - QUERY side   → { plan: ExecutionPlan; executionPolicy: RunExecutionPolicy; canonicalPlanCoreJson: string }
 *
 *  SRP: sole responsibility — hash inputs, assemble the immutable ExecutionPlan,
 *       attach observability layers. Knows nothing about graph topology or node selection.
 */
import {
  asNonBlankString,
  asSha256HexString,
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  type RunExecutionPolicy,
} from '@dvt/contracts';

import { sha256CanonicalJson } from './hashing.js';
import { throwLimitExceeded } from './limits.js';
import type { PlannerMetrics } from './metrics.js';
import type { ExecutionPlan, NormalizedPlannerInput, PlanCore } from './types.js';

// ── COMMAND ────────────────────────────────────────────────────────────────────

export class AssemblePlanCommand {
  constructor(
    readonly normalizedInput: NormalizedPlannerInput,
    readonly normalizedSteps: PlanCore['steps'],
    readonly maxPlanSizeBytes: number,
    readonly requiredCapabilities: readonly string[] = []
  ) {}
}

// ── PlanAssembler (Domain Service / Command Handler) ──────────────────────────

export class PlanAssembler {
  constructor(private readonly metrics: PlannerMetrics) {}

  async execute(command: AssemblePlanCommand): Promise<{
    plan: ExecutionPlan;
    executionPolicy: RunExecutionPolicy;
    canonicalPlanCoreJson: string;
  }> {
    const inputHashSha256 = await this.computeInputHash(command.normalizedInput);
    const pluginCompatibilityFingerprint = await this.computePluginCompatibilityFingerprint(
      command.normalizedSteps
    );
    const planCore = this.buildPlanCore(command.normalizedSteps, inputHashSha256);

    const {
      canonical: canonicalPlanCoreJson,
      sha256: planId,
      bytes,
    } = await sha256CanonicalJson(planCore);

    if (bytes > command.maxPlanSizeBytes) {
      throwLimitExceeded(`maxPlanSizeBytes exceeded: ${bytes} > ${command.maxPlanSizeBytes}`);
    }
    this.metrics.recordPlanSize(bytes);

    return {
      plan: this.assembleFinalPlan(planCore, planId, command.normalizedInput),
      executionPolicy: this.buildExecutionPolicy(
        pluginCompatibilityFingerprint,
        command.requiredCapabilities
      ),
      canonicalPlanCoreJson,
    };
  }

  private async computeInputHash(input: NormalizedPlannerInput): Promise<string> {
    const normalizedNodes = [...input.nodes]
      .sort((left, right) => left.nodeId.localeCompare(right.nodeId))
      .map((node) => ({
        nodeId: node.nodeId,
        stepKind: node.stepKind,
        dependsOn: [...node.dependsOn].sort((left, right) => left.localeCompare(right)),
        ...(node.stepTypeConfig === undefined ? {} : { stepTypeConfig: node.stepTypeConfig }),
      }));

    const semantic = {
      nodes: normalizedNodes,
      selection: {
        ...input.selection,
        selectedNodeIds: [...input.selection.selectedNodeIds].sort((left, right) =>
          left.localeCompare(right)
        ),
      },
      policies: input.policies,
    };
    const { sha256 } = await sha256CanonicalJson(semantic);
    return sha256;
  }

  private buildPlanCore(steps: PlanCore['steps'], inputHashSha256: string): PlanCore {
    return { metadata: { planVersion: CURRENT_EXECUTION_PLAN_VERSION, inputHashSha256 }, steps };
  }

  private assembleFinalPlan(
    planCore: PlanCore,
    planId: string,
    input: NormalizedPlannerInput
  ): ExecutionPlan {
    const planBase: ExecutionPlan = {
      ...planCore,
      metadata: {
        ...planCore.metadata,
        schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
        contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
        planId,
        createdAtIso: new Date().toISOString(),
        ...(input.ownership === undefined ? {} : { ownership: input.ownership }),
      },
    };

    const plan: ExecutionPlan =
      input.observability === undefined
        ? planBase
        : { ...planBase, observability: input.observability };

    const layerBoundaries = computeLayerBoundaries(planCore.steps);
    if (layerBoundaries.length > 0) {
      plan.observability = {
        ...plan.observability,
        extra: { ...plan.observability?.extra, plannerLayers: layerBoundaries },
      };
    }

    return plan;
  }

  private buildExecutionPolicy(
    pluginCompatibilityFingerprint: string,
    requiredCapabilities: readonly string[]
  ): RunExecutionPolicy {
    return {
      pluginCompatibilityFingerprint: asSha256HexString(pluginCompatibilityFingerprint),
      ...(requiredCapabilities.length > 0
        ? {
            requiresCapabilities: [...requiredCapabilities].map((value) => asNonBlankString(value)),
          }
        : {}),
    };
  }

  private async computePluginCompatibilityFingerprint(
    steps: readonly {
      stepId: string;
      kind: string;
      stepTypeConfig?: Record<string, unknown>;
    }[]
  ): Promise<string> {
    const normalized = [...steps]
      .sort((left, right) => left.stepId.localeCompare(right.stepId))
      .map((step) => ({
        stepId: step.stepId,
        kind: step.kind,
        stepTypeConfigKeys: Object.keys(step.stepTypeConfig ?? {}).sort((left, right) =>
          left.localeCompare(right)
        ),
      }));
    const { sha256 } = await sha256CanonicalJson({
      compatibilitySurfaceVersion: 1,
      steps: normalized,
    });
    return sha256;
  }
}

// ── Module-private helper ──────────────────────────────────────────────────────

function computeLayerBoundaries(
  steps: readonly { stepId: string; dependsOn: readonly string[] }[]
): number[] {
  if (steps.length === 0) return [];

  const depthByStepId = new Map<string, number>();
  let maxDepth = 0;

  for (const step of steps) {
    let bestParentDepth = 0;
    for (const dep of step.dependsOn) {
      const d = depthByStepId.get(dep);
      if (d !== undefined && d > bestParentDepth) bestParentDepth = d;
    }
    const depth = bestParentDepth + 1;
    depthByStepId.set(step.stepId, depth);
    if (depth > maxDepth) maxDepth = depth;
  }

  const layers = Array.from({ length: maxDepth }, () => 0);
  for (const depth of depthByStepId.values()) {
    layers[depth - 1] = (layers[depth - 1] ?? 0) + 1;
  }
  return layers;
}
