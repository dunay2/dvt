/**
 * @ownedConcern Declare shared start-run application phase contracts and context types.
 */
import type {
  EngineRunRef,
  ExecutionPlan,
  PlanRef,
  ResolvedRunContext,
  RunExecutionPolicy,
} from '@dvt/contracts';

import type { IProviderAdapter } from '../../adapters/IProviderAdapter.js';
import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';

export interface StartRunExecutionPolicyAdmission {
  plan: ExecutionPlan;
  planRef: PlanRef;
  executionPolicy: RunExecutionPolicy;
  context: ResolvedRunContext;
  adapter: IProviderAdapter;
}

export interface StartRunVerifiedArtifact {
  plan: ExecutionPlan;
  executionPolicy: RunExecutionPolicy;
}

export interface StartRunAdmissionResult {
  adapter: IProviderAdapter;
  verifiedArtifact: StartRunVerifiedArtifact;
}

export interface StartRunAdmissionRequest {
  planRef: PlanRef;
  resolvedContext: ResolvedRunContext;
}

export interface StartRunAdmissionGuardPort {
  assertStartRunAllowed(planRef: PlanRef, context: ResolvedRunContext): Promise<void>;
  resolveAdapter(context: ResolvedRunContext): IProviderAdapter;
  assertExecutionPolicyAllowed(admission: StartRunExecutionPolicyAdmission): Promise<void>;
}

export interface IStartRunAdmissionService {
  admit(request: StartRunAdmissionRequest): Promise<StartRunAdmissionResult>;
}

export type StartRunPreparation = Readonly<{
  disposition: 'created' | 'reused';
  runRef: EngineRunRef;
}>;

export type StartRunPhase =
  | 'admission'
  | 'intent'
  | 'bootstrap'
  | 'provider_dispatch'
  | 'provider_ref_reconciliation'
  | 'completion';

export interface StartRunErrorContext {
  preparation: StartRunPreparation | null;
  phase: StartRunPhase;
  intentId?: string;
}

export interface StartRunExecutionInput {
  adapter: IProviderAdapter;
  planRef: PlanRef;
  resolvedContext: ResolvedRunContext;
  traceContext: StartRunTraceContext;
  intentId: string;
  errorContext: StartRunErrorContext;
}

export interface IStartRunExecutionService {
  executeStartRun(input: StartRunExecutionInput): Promise<EngineRunRef>;
  executePreparedRun(
    input: StartRunExecutionInput & { preparedRunRef: EngineRunRef }
  ): Promise<EngineRunRef>;
}

export interface IStartRunFailurePolicy {
  markIntentResolvedBestEffort(input: {
    intentId: string;
    tenantId: string;
    runId: string;
    provider: EngineRunRef['provider'];
    traceContext: StartRunTraceContext;
  }): Promise<void>;

  handleStartRunError(input: {
    error: unknown;
    resolvedContext: ResolvedRunContext;
    metricTags: Record<string, string>;
    traceContext: StartRunTraceContext;
    errorContext: StartRunErrorContext;
  }): Promise<never>;
}
