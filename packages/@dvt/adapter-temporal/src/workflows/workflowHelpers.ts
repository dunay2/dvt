/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
 *
 * Pure, deterministic helpers used by RunPlanWorkflow.
 * No Temporal runtime imports - safe to test outside the Temporal sandbox.
 */

// ---------------------------------------------------------------------------
// normalizeDependsOn
// ---------------------------------------------------------------------------

import { CompiledCodeRefSchema, type CompiledCodeRef } from '@dvt/contracts';

export function normalizeDependsOn(dependsOn: unknown): string[] {
  if (!Array.isArray(dependsOn)) return [];
  return dependsOn.filter((d): d is string => typeof d === 'string' && d.trim().length > 0);
}

// ---------------------------------------------------------------------------
// validateGatewayDependencies
// ---------------------------------------------------------------------------

export function validateGatewayDependencies(
  steps: ReadonlyArray<{ stepId: string; type?: unknown; dependsOn?: unknown }>
): void {
  for (const step of steps) {
    if (step.type !== 'gateway') continue;
    const deps = normalizeDependsOn(step.dependsOn);
    if (deps.length !== 1) {
      throw new TypeError(
        `INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:${step.stepId}`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// buildGatewayContext
// ---------------------------------------------------------------------------

export function buildGatewayContext(
  step: { stepId: string; dependsOn?: unknown },
  completedStepResults: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const deps = normalizeDependsOn(step.dependsOn);
  if (deps.length !== 1) {
    throw new TypeError(
      `INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:${step.stepId}`
    );
  }

  return resolveGatewayDependencyContext(deps[0], completedStepResults);
}

export function resolveGatewayDependencyContext(
  dependencyStepId: string,
  completedStepResults: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const fromDependency = completedStepResults[dependencyStepId];
  return fromDependency ?? buildCompletedStepFact(dependencyStepId);
}

export function buildCompletedStepFact(
  stepId: string,
  gatewayDecision?: boolean
): Record<string, unknown> {
  if (typeof gatewayDecision === 'boolean') {
    return { stepId, status: 'COMPLETED', gatewayDecision };
  }

  return { stepId, status: 'COMPLETED' };
}

// ---------------------------------------------------------------------------
// shouldTriggerContinueAsNew
// ---------------------------------------------------------------------------

export function shouldTriggerContinueAsNew(args: {
  continueAsNewAfterLayerCount: number;
  processedLayersInCurrentExecution: number;
  nextLayerIndex: number;
  totalLayerCount: number;
}): boolean {
  if (args.continueAsNewAfterLayerCount <= 0) return false;
  if (args.processedLayersInCurrentExecution < args.continueAsNewAfterLayerCount) return false;
  if (args.nextLayerIndex >= args.totalLayerCount) return false;
  return true;
}

// ---------------------------------------------------------------------------
// buildContinueAsNewInput
// ---------------------------------------------------------------------------

type ContinueAsNewBase = {
  continueAsNewAfterLayerCount?: number;
  resumeFromLayerIndex?: number;
  continuedAsNewCount?: number;
  gatewayDecisions?: Record<string, boolean>;
  skippedStepIds?: string[];
};

type ContinueAsNewState = {
  continueAsNewAfterLayerCount: number;
  resumeFromLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  skippedStepIds: string[];
};

export type ContinueAsNewInput<T extends ContinueAsNewBase> = Omit<T, keyof ContinueAsNewState> &
  ContinueAsNewState;

export function buildContinueAsNewInput<T extends ContinueAsNewBase>(args: {
  input: T;
  continueAsNewAfterLayerCount: number;
  nextLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  skippedStepIds: ReadonlySet<string>;
}): ContinueAsNewInput<T> {
  const nextInput: ContinueAsNewInput<T> = {
    ...args.input,
    continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
    resumeFromLayerIndex: args.nextLayerIndex,
    continuedAsNewCount: args.continuedAsNewCount + 1,
    gatewayDecisions: { ...args.gatewayDecisions },
    skippedStepIds: [...args.skippedStepIds],
  };
  return nextInput;
}

// ---------------------------------------------------------------------------
// buildStepStartedPayload
// ---------------------------------------------------------------------------

type StepStartedPayload = {
  compiledCodeRef: CompiledCodeRef;
};

export function buildStepStartedPayload(step: {
  compiledCodeRef?: unknown;
}): StepStartedPayload | undefined {
  const { compiledCodeRef } = step;
  if (!compiledCodeRef) return undefined;

  const parsedCompiledCodeRef = CompiledCodeRefSchema.safeParse(compiledCodeRef);
  if (!parsedCompiledCodeRef.success) {
    throw new TypeError('INVALID_PLAN_SCHEMA: step_compiledCodeRef_invalid');
  }

  return { compiledCodeRef: parsedCompiledCodeRef.data };
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

export function parseOptionalNonNegativeInt(value: unknown, fieldName: string): number {
  if (value === undefined) return 0;
  if (isNonNegativeInteger(value)) return value;
  if (isNonNegativeIntegerString(value)) return Number(value);
  throw new TypeError(`INVALID_WORKFLOW_INPUT: ${fieldName}_must_be_non_negative_integer`);
}

export function parseOptionalStringArray(value: unknown, fieldName: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new TypeError(`INVALID_WORKFLOW_INPUT: ${fieldName}_must_be_string_array`);
  }

  const parsed: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new TypeError(`INVALID_WORKFLOW_INPUT: ${fieldName}_must_be_string_array`);
    }
    const normalized = item.trim();
    if (normalized.length > 0) parsed.push(normalized);
  }
  return parsed;
}

function isNonNegativeInteger(val: unknown): val is number {
  return typeof val === 'number' && Number.isInteger(val) && val >= 0;
}

function isNonNegativeIntegerString(val: unknown): val is string {
  if (typeof val !== 'string' || val.trim().length === 0) return false;
  const n = Number(val);
  return Number.isInteger(n) && n >= 0;
}

// ---------------------------------------------------------------------------
// formatUnknownError
// ---------------------------------------------------------------------------

export function formatUnknownError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error === null || error === undefined) return 'Unknown error';
  try {
    const json = JSON.stringify(error);
    return json ?? 'Unknown error';
  } catch {
    return 'Unknown error';
  }
}
