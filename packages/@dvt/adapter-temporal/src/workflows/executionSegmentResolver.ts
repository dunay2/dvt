/**
 * @file packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver.ts
 * @ownedConcern PlanRef execution-segment projection from canonical plans
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Resolve executable workflow segments from the canonical DVT execution plan, not from Temporal provider state
 * @consequence Temporal receives bounded layer metadata while DVT retains execution-plan authority
 * @version 1.2.0
 */
import type { ExecutionPlan, ExecutionStep, TransformationExecutor } from '@dvt/contracts';
import { collectDownstreamStepIds, planExecutionLayers } from '@dvt/plan-interpreter';

import { resolveTransformationExecutor } from './workflowArtifactHelpers.js';
import { normalizeDependsOn, validateGatewayDependencies } from './workflowGatewayHelpers.js';
import { resolvePlanMaxInFlight } from './workflowPlanConcurrency.js';

export interface ResolvedExecutionSegment {
  layerIndex: number;
  totalLayerCount: number;
  runtimeExecutor?: TransformationExecutor;
  maxInFlight?: number;
  steps: ExecutionStep[];
  downstreamStepIdsByGatewayStepId: Record<string, string[]>;
  retainedGatewayDependencyStepIds: string[];
  completedStepCountBeforeLayer: number;
}

export interface ExecutionSegmentIndex {
  readonly layerStepIndices: ReadonlyArray<ReadonlyArray<number>>;
  readonly completedStepCountsBeforeLayer: ReadonlyArray<number>;
  readonly maxInFlight: number | undefined;
  readonly runtimeExecutor: TransformationExecutor | undefined;
}

export function prepareExecutionSegmentIndex(plan: ExecutionPlan): ExecutionSegmentIndex {
  const maxInFlight = resolvePlanMaxInFlight(plan.steps);
  validateGatewayDependencies(plan.steps);
  const executionLayers = planExecutionLayers<ExecutionStep>(plan.steps);
  const runtimeExecutor = resolveTransformationExecutor(plan);
  const indexByStep = new Map(plan.steps.map((step, index) => [step, index]));
  let completedSteps = 0;
  const completedStepCountsBeforeLayer = executionLayers.map((layer) => {
    const countBeforeLayer = completedSteps;
    completedSteps += layer.length;
    return countBeforeLayer;
  });

  return {
    layerStepIndices: executionLayers.map((layer) => layer.map((step) => indexByStep.get(step)!)),
    completedStepCountsBeforeLayer,
    maxInFlight,
    runtimeExecutor,
  };
}

export function resolveExecutionSegmentFromPlan(
  plan: ExecutionPlan,
  layerIndex: number,
  index: ExecutionSegmentIndex = prepareExecutionSegmentIndex(plan)
): ResolvedExecutionSegment {
  const { layerStepIndices, runtimeExecutor, maxInFlight } = index;

  assertLayerIndexInRange(layerIndex, layerStepIndices.length);

  if (layerStepIndices.length === 0) {
    return buildEmptyExecutionSegment(layerIndex, runtimeExecutor);
  }

  const stepIndices = layerStepIndices[layerIndex];
  if (stepIndices === undefined) {
    throw new TypeError('INVALID_WORKFLOW_STATE: nextLayerIndex_out_of_range');
  }
  const layer = stepIndices.map((stepIndex) => plan.steps[stepIndex]!);

  return {
    layerIndex,
    totalLayerCount: layerStepIndices.length,
    runtimeExecutor,
    ...(maxInFlight === undefined ? {} : { maxInFlight }),
    steps: layer,
    downstreamStepIdsByGatewayStepId: buildGatewayDownstreamMap(plan.steps, layer),
    retainedGatewayDependencyStepIds: resolveRetainedGatewayDependencyStepIds(
      plan.steps,
      layerStepIndices,
      layerIndex
    ),
    completedStepCountBeforeLayer: index.completedStepCountsBeforeLayer[layerIndex]!,
  };
}

function assertLayerIndexInRange(layerIndex: number, totalLayerCount: number): void {
  if (layerIndex < 0) {
    throw new TypeError('INVALID_WORKFLOW_STATE: nextLayerIndex_out_of_range');
  }

  if (totalLayerCount === 0 && layerIndex !== 0) {
    throw new TypeError('INVALID_WORKFLOW_STATE: nextLayerIndex_out_of_range');
  }
}

function buildEmptyExecutionSegment(
  layerIndex: number,
  runtimeExecutor: TransformationExecutor | undefined
): ResolvedExecutionSegment {
  return {
    layerIndex,
    totalLayerCount: 0,
    runtimeExecutor,
    steps: [],
    downstreamStepIdsByGatewayStepId: {},
    retainedGatewayDependencyStepIds: [],
    completedStepCountBeforeLayer: 0,
  };
}

function buildGatewayDownstreamMap(
  planSteps: ReadonlyArray<ExecutionStep>,
  layer: ReadonlyArray<ExecutionStep>
): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  for (const step of layer) {
    if (step.type !== 'gateway') {
      continue;
    }

    map[step.stepId] = [...collectDownstreamStepIds(planSteps, step.stepId)];
  }

  return map;
}

function resolveRetainedGatewayDependencyStepIds(
  planSteps: ReadonlyArray<ExecutionStep>,
  layerStepIndices: ReadonlyArray<ReadonlyArray<number>>,
  layerIndex: number
): string[] {
  const retained = new Set<string>();

  for (let index = layerIndex + 1; index < layerStepIndices.length; index += 1) {
    for (const stepIndex of layerStepIndices[index]!) {
      addGatewayDependencyStepIds(retained, planSteps[stepIndex]!);
    }
  }

  return [...retained];
}

function addGatewayDependencyStepIds(retained: Set<string>, step: ExecutionStep): void {
  if (step.type !== 'gateway') {
    return;
  }

  for (const dependencyStepId of normalizeDependsOn(step.dependsOn)) {
    retained.add(dependencyStepId);
  }
}
