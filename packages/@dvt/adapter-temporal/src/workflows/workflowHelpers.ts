/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
 *
 * Pure, deterministic helpers used by RunPlanWorkflow.
 * No Temporal runtime imports - safe to test outside the Temporal sandbox.
 */

// ---------------------------------------------------------------------------
// normalizeDependsOn
// ---------------------------------------------------------------------------

import type {
  CompiledCodeRef,
  ExecutionPlan,
  ExecutionStep,
  MaterializationEvidence,
  StepArtifactRef,
  TransformationExecutor,
} from '@dvt/contracts';
import {
  CompiledCodeRefSchema,
  KNOWN_STEP_KINDS,
  MaterializationEvidenceSchema,
  TransformationFlowRuntimeBindingSchema,
} from '@dvt/contracts';

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

  const dependencyStepId = deps[0];
  if (dependencyStepId === undefined) {
    throw new TypeError(
      `INVALID_PLAN_SCHEMA: gateway_dependsOn_exactly_one_required:${step.stepId}`
    );
  }

  return resolveGatewayDependencyContext(dependencyStepId, completedStepResults);
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
  gatewayDecision?: boolean,
  resultEvidence?: MaterializationEvidence
): Record<string, unknown> {
  const fact: Record<string, unknown> = { stepId, status: 'COMPLETED' };

  if (typeof gatewayDecision === 'boolean') {
    fact['gatewayDecision'] = gatewayDecision;
  }

  if (resultEvidence !== undefined) {
    fact['resultEvidence'] = resultEvidence;
  }

  return fact;
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
  completedStepResults?: Record<string, Record<string, unknown>>;
  skippedStepIds?: string[];
  processedControlSignalIds?: string[];
};

type ContinueAsNewState = {
  continueAsNewAfterLayerCount: number;
  resumeFromLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  completedStepResults: Record<string, Record<string, unknown>>;
  skippedStepIds: string[];
  processedControlSignalIds: string[];
};

export type ContinueAsNewInput<T extends ContinueAsNewBase> = Omit<T, keyof ContinueAsNewState> &
  ContinueAsNewState;

export function buildContinueAsNewInput<T extends ContinueAsNewBase>(args: {
  input: T;
  continueAsNewAfterLayerCount: number;
  nextLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  completedStepResults: Record<string, Record<string, unknown>>;
  skippedStepIds: ReadonlySet<string>;
  processedControlSignalIds: ReadonlySet<string>;
}): ContinueAsNewInput<T> {
  const nextInput: ContinueAsNewInput<T> = {
    ...args.input,
    continueAsNewAfterLayerCount: args.continueAsNewAfterLayerCount,
    resumeFromLayerIndex: args.nextLayerIndex,
    continuedAsNewCount: args.continuedAsNewCount + 1,
    gatewayDecisions: { ...args.gatewayDecisions },
    completedStepResults: cloneStepResults(args.completedStepResults),
    skippedStepIds: [...args.skippedStepIds],
    processedControlSignalIds: [...args.processedControlSignalIds],
  };
  return nextInput;
}

// ---------------------------------------------------------------------------
// buildStepStartedPayload
// ---------------------------------------------------------------------------

type StepStartedPayload = {
  stepArtifactRef: StepArtifactRef;
};

const COMPILED_CODE_REF_STEP_KINDS = new Set<string>([
  KNOWN_STEP_KINDS.DBT_MODEL,
  KNOWN_STEP_KINDS.DBT_TEST,
  KNOWN_STEP_KINDS.DBT_SNAPSHOT,
]);

export function buildStepStartedPayload(step: ExecutionStep): StepStartedPayload | undefined {
  if (!COMPILED_CODE_REF_STEP_KINDS.has(step.kind)) {
    return undefined;
  }
  const compiledCodeRef = extractCompiledCodeRef(step.stepTypeConfig);
  if (!compiledCodeRef) return undefined;
  return {
    stepArtifactRef: {
      artifactKind: 'dbt.compiled-sql',
      ...compiledCodeRef,
    },
  };
}

export type StepActivityRetryPolicy = {
  initialInterval: `${number}s`;
  maximumInterval: `${number}s`;
  backoffCoefficient: number;
  maximumAttempts: number;
  nonRetryableErrorTypes: string[];
};

const DEFAULT_STEP_ACTIVITY_RETRY_POLICY: StepActivityRetryPolicy = Object.freeze({
  initialInterval: '1s',
  maximumInterval: '60s',
  backoffCoefficient: 2,
  maximumAttempts: 3,
  nonRetryableErrorTypes: ['PermanentStepError'],
});

export function resolveStepActivityRetryPolicy(
  step: Pick<ExecutionStep, 'retryPolicy' | 'stepTypeConfig'>
): StepActivityRetryPolicy {
  if (step.retryPolicy !== undefined) {
    return {
      ...DEFAULT_STEP_ACTIVITY_RETRY_POLICY,
      maximumAttempts: step.retryPolicy.maxAttempts,
      initialInterval: step.retryPolicy.initialInterval,
      maximumInterval: step.retryPolicy.maximumInterval,
      backoffCoefficient: step.retryPolicy.backoffCoefficient,
    };
  }

  if (hasLegacyStepRetryConfig(step.stepTypeConfig)) {
    throw new TypeError('INVALID_PLAN_SCHEMA: step_retryPolicy_must_be_top_level');
  }

  return DEFAULT_STEP_ACTIVITY_RETRY_POLICY;
}

export function resolveMaterializationEvidence(
  value: unknown
): MaterializationEvidence | undefined {
  const parsed = MaterializationEvidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function resolveTransformationExecutor(
  plan: Pick<ExecutionPlan, 'observability'>
): TransformationExecutor | undefined {
  const runtimeBinding = plan.observability?.extra?.['transformationFlowRuntime'];
  const parsed = TransformationFlowRuntimeBindingSchema.safeParse(runtimeBinding);
  return parsed.success ? parsed.data.executor : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function extractCompiledCodeRef(stepTypeConfig: unknown): CompiledCodeRef | undefined {
  if (!isPlainObject(stepTypeConfig)) {
    return undefined;
  }

  const compiledCodeRef = stepTypeConfig['compiledCodeRef'];
  if (compiledCodeRef === undefined) {
    return undefined;
  }

  const result = CompiledCodeRefSchema.safeParse(compiledCodeRef);
  if (!result.success) {
    throw new TypeError('INVALID_PLAN_SCHEMA: step_compiledCodeRef_invalid');
  }

  return result.data;
}

function hasLegacyStepRetryConfig(stepTypeConfig: unknown): boolean {
  if (!isPlainObject(stepTypeConfig)) {
    return false;
  }

  return Object.hasOwn(stepTypeConfig, 'retries');
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
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length === 0) return false;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0;
}

function cloneStepResults(
  value: Record<string, Record<string, unknown>> | undefined
): Record<string, Record<string, unknown>> {
  if (!value) return {};
  const cloned: Record<string, Record<string, unknown>> = {};
  for (const [stepId, result] of Object.entries(value)) {
    cloned[stepId] = { ...result };
  }
  return cloned;
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
