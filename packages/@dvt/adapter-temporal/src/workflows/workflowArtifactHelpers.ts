/**
 * @file packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts
 * @ownedConcern Execution artifact payload interpretation
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0040: Retry Ownership And Attempt Authority
 * @decision Keep workflow helpers step-kind agnostic and free of artifact publication concerns
 * @consequence Temporal executes admitted plans without projecting legacy artifact models
 * @version 2.0.0
 */
import type {
  ExecutionPlan,
  ExecutionStep,
  StepResultEvidence,
  TransformationExecutor,
} from '@dvt/contracts';
import { StepResultEvidenceSchema, TransformationFlowRuntimeBindingSchema } from '@dvt/contracts';

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

export function resolveStepResultEvidence(value: unknown): StepResultEvidence | undefined {
  const parsed = StepResultEvidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function resolveTransformationExecutor(
  plan: Pick<ExecutionPlan, 'observability'>
): TransformationExecutor | undefined {
  const runtimeBinding = plan.observability?.extra?.['transformationFlowRuntime'];
  const parsed = TransformationFlowRuntimeBindingSchema.safeParse(runtimeBinding);
  return parsed.success ? parsed.data.executor : undefined;
}
