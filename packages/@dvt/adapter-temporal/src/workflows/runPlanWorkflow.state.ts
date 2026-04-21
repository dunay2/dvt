import type { RunPlanWorkflowInput, WorkflowControlInput } from './runPlanWorkflow.types.js';
import { resolveMaterializationEvidence } from './workflowArtifactHelpers.js';
import {
  parseOptionalNonNegativeInt,
  parseOptionalStringArray,
  parseRequiredPositiveInt,
} from './workflowInputParsingHelpers.js';

export function parseWorkflowControlInput(input: RunPlanWorkflowInput): WorkflowControlInput {
  const cursor = input.cursor;

  return {
    maxContinueAsNewPayloadBytes: parseMaxContinueAsNewPayloadBytes(
      input.maxContinueAsNewPayloadBytes
    ),
    continueAsNewAfterLayerCount: parseContinueAsNewAfterLayerCount(
      input.continueAsNewAfterLayerCount
    ),
    ...parseWorkflowCursor(cursor),
  };
}

function parseMaxContinueAsNewPayloadBytes(value: unknown): number {
  return parseRequiredPositiveInt(value, 'maxContinueAsNewPayloadBytes');
}

function parseContinueAsNewAfterLayerCount(value: unknown): number {
  return parseOptionalNonNegativeInt(value, 'continueAsNewAfterLayerCount');
}

function parseWorkflowCursor(
  cursor: RunPlanWorkflowInput['cursor']
): Omit<WorkflowControlInput, 'continueAsNewAfterLayerCount' | 'maxContinueAsNewPayloadBytes'> {
  return {
    nextLayerIndex: parseOptionalNonNegativeInt(cursor?.nextLayerIndex, 'nextLayerIndex'),
    continuedAsNewCount: parseOptionalNonNegativeInt(
      cursor?.continuedAsNewCount,
      'continuedAsNewCount'
    ),
    gatewayDecisions: cloneGatewayDecisions(cursor?.gatewayDecisions),
    gatewayDependencyFacts: cloneStepResults(cursor?.gatewayDependencyFacts),
    skippedStepIds: parseOptionalStringArray(cursor?.skippedStepIds, 'skippedStepIds'),
    processedControlSignalIds: parseOptionalStringArray(
      cursor?.processedControlSignalIds,
      'processedControlSignalIds'
    ),
    latestResultEvidence: resolveMaterializationEvidence(cursor?.latestResultEvidence),
  };
}

function cloneGatewayDecisions(
  gatewayDecisions: Record<string, boolean> | undefined
): Record<string, boolean> {
  return gatewayDecisions ? { ...gatewayDecisions } : {};
}

export function cloneStepResults(
  value: Record<string, Record<string, unknown>> | undefined
): Record<string, Record<string, unknown>> {
  if (!value) {
    return {};
  }

  const cloned: Record<string, Record<string, unknown>> = {};
  for (const [stepId, result] of Object.entries(value)) {
    cloned[stepId] = { ...result };
  }
  return cloned;
}
