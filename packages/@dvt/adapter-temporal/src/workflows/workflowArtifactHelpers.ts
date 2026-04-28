/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts
 * @ownedConcern Execution artifact payload interpretation
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0032: compiledCodeRef Ownership
 * @baseline ADR-0040: Retry Ownership And Attempt Authority
 * @decision Extract plugin-agnostic artifact references and retry policy before event emission
 * @consequence StepStarted payloads carry traceability references without making workflow core know plugin step kinds
 * @version 1.3.0
 */
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
  MaterializationEvidenceSchema,
  TransformationFlowRuntimeBindingSchema,
} from '@dvt/contracts';

type StepStartedPayload = {
  stepArtifactRef: StepArtifactRef;
};

const COMPILED_SQL_ARTIFACT_KIND = 'compiled-sql';

export function buildStepStartedPayload(step: ExecutionStep): StepStartedPayload | undefined {
  const compiledCodeRef = extractCompiledCodeRef(step.stepTypeConfig);
  if (!compiledCodeRef) {
    return undefined;
  }

  return {
    stepArtifactRef: {
      artifactKind: COMPILED_SQL_ARTIFACT_KIND,
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
  if (step.retryPolicy === undefined) {
    return DEFAULT_STEP_ACTIVITY_RETRY_POLICY;
  }

  return {
    ...DEFAULT_STEP_ACTIVITY_RETRY_POLICY,
    maximumAttempts: step.retryPolicy.maxAttempts,
    initialInterval: step.retryPolicy.initialInterval,
    maximumInterval: step.retryPolicy.maximumInterval,
    backoffCoefficient: step.retryPolicy.backoffCoefficient,
  };
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
