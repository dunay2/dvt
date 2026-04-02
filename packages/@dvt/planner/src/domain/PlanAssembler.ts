/**
 * Design (SOLID + DDD + CQRS):
 *
 *  CQRS segregation:
 *   - COMMAND side → AssemblePlanCommand (input VO)
 *   - QUERY side   → { plan: ExecutionPlan; canonicalPlanJson: string } (read model)
 *
 *  SRP: sole responsibility — hash inputs, assemble the immutable ExecutionPlan,
 *       attach observability layers. Knows nothing about graph topology or node selection.
 */
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
} from '@dvt/contracts';

import { sha256CanonicalJson } from './hashing.js';
import { throwLimitExceeded } from './limits.js';
import type { PlannerMetrics } from './metrics.js';
import type {
  ExecutionPlan,
  NormalizedPlannerInput,
  PlanCore,
  PlannerInputEnvelopeV2,
} from './types.js';

// ── COMMAND ────────────────────────────────────────────────────────────────────

export class AssemblePlanCommand {
  constructor(
    readonly normalizedInput: NormalizedPlannerInput,
    readonly normalizedSteps: PlanCore['steps'],
    readonly maxPlanSizeBytes: number
  ) {}
}

// ── PlanAssembler (Domain Service / Command Handler) ──────────────────────────

export class PlanAssembler {
  constructor(private readonly metrics: PlannerMetrics) {}

  async execute(
    command: AssemblePlanCommand
  ): Promise<{ plan: ExecutionPlan; canonicalPlanJson: string }> {
    const inputHashSha256 = await this.computeInputHash(command.normalizedInput);
    const planCore = this.buildPlanCore(command.normalizedSteps, inputHashSha256);

    const {
      canonical: canonicalPlanJson,
      sha256: planId,
      bytes,
    } = await sha256CanonicalJson(planCore);

    if (bytes > command.maxPlanSizeBytes) {
      throwLimitExceeded(`maxPlanSizeBytes exceeded: ${bytes} > ${command.maxPlanSizeBytes}`);
    }
    this.metrics.recordPlanSize(bytes);

    return {
      plan: this.assembleFinalPlan(planCore, planId, command.normalizedInput),
      canonicalPlanJson,
    };
  }

  private async computeInputHash(input: PlannerInputEnvelopeV2): Promise<string> {
    const semantic = {
      nodes: input.nodes,
      selection: input.selection,
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
