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

export interface ResolvedExecutionSegment {
  layerIndex: number;
  totalLayerCount: number;
  runtimeExecutor?: TransformationExecutor;
  steps: ExecutionStep[];
  downstreamStepIdsByGatewayStepId: Record<string, string[]>;
  retainedGatewayDependencyStepIds: string[];
  completedStepCountBeforeLayer: number;
}

export function resolveExecutionSegmentFromPlan(
  plan: ExecutionPlan,
  layerIndex: number
): ResolvedExecutionSegment {
  validateGatewayDependencies(plan.steps);
  const executionLayers = planExecutionLayers<ExecutionStep>(plan.steps);
  const runtimeExecutor = resolveTransformationExecutor(plan);

  assertLayerIndexInRange(layerIndex, executionLayers.length);

  if (executionLayers.length === 0) {
    return buildEmptyExecutionSegment(layerIndex, runtimeExecutor);
  }

  const layer = executionLayers[layerIndex];
  if (layer === undefined) {
    throw new TypeError('INVALID_WORKFLOW_STATE: nextLayerIndex_out_of_range');
  }

  return {
    layerIndex,
    totalLayerCount: executionLayers.length,
    runtimeExecutor,
    steps: [...layer],
    downstreamStepIdsByGatewayStepId: buildGatewayDownstreamMap(plan.steps, layer),
    retainedGatewayDependencyStepIds: resolveRetainedGatewayDependencyStepIds(
      executionLayers,
      layerIndex
    ),
    completedStepCountBeforeLayer: countStepsBeforeLayer(executionLayers, layerIndex),
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
  executionLayers: ReadonlyArray<ReadonlyArray<ExecutionStep>>,
  layerIndex: number
): string[] {
  const retained = new Set<string>();

  for (const futureLayer of executionLayers.slice(layerIndex + 1)) {
    addGatewayDependencyStepIds(retained, futureLayer);
  }

  return [...retained];
}

function addGatewayDependencyStepIds(
  retained: Set<string>,
  layer: ReadonlyArray<ExecutionStep>
): void {
  for (const step of layer) {
    if (step.type !== 'gateway') {
      continue;
    }

    for (const dependencyStepId of normalizeDependsOn(step.dependsOn)) {
      retained.add(dependencyStepId);
    }
  }
}

function countStepsBeforeLayer(
  layers: ReadonlyArray<ReadonlyArray<ExecutionStep>>,
  layerIndex: number
): number {
  let total = 0;
  for (let index = 0; index < layerIndex; index += 1) {
    total += layers[index]?.length ?? 0;
  }
  return total;
}
