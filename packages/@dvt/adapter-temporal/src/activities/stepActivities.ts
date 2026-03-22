/**
 * @file packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
 * @baseline ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @decision Section 5 — All workflow side effects are mediated through deterministic activity boundaries
 * @decision Section 2.1 — Emitted events preserve idempotency and append-only state-store semantics
 * @consequence Activity execution keeps lifecycle/event persistence deterministic and replay-compatible
 * @version 1.1.0
 * @date 2026-03-07
 */
import { TextDecoder } from 'node:util';

import { parsePlanRef, parseRunContext } from '@dvt/contracts';
import type { PlanRef, RunContext } from '@dvt/contracts';
import { evaluateDslV1, parseDslV1 } from '@dvt/dsl';
import type { IObservability } from '@dvt/observability';
import { ApplicationFailure, Context } from '@temporalio/activity';

import type {
  EventInput,
  EventType,
  ExecutionPlan,
  IClock,
  IIdempotencyKeyBuilder,
  IPlanFetcher,
  IPlanIntegrityValidator,
  RunStateCommandPort,
  RunMetadata,
} from '../engine-types.js';
import { buildTemporalMetricTags, resolveTemporalObservability } from '../temporalObservability.js';

// ---------------------------------------------------------------------------
// Error codes (3.7 — replace magic strings with named constants)
// ---------------------------------------------------------------------------

const ActivityErrorCode = {
  INVALID_PLAN_SCHEMA: 'INVALID_PLAN_SCHEMA',
  PLAN_CONTRACT_VERSION_MISSING: 'PLAN_CONTRACT_VERSION_MISSING',
  PLAN_CONTRACT_VERSION_UNKNOWN: 'PLAN_CONTRACT_VERSION_UNKNOWN',
  PLAN_REF_MISMATCH: 'PLAN_REF_MISMATCH',
  INVALID_STEP_SCHEMA: 'INVALID_STEP_SCHEMA',
  RUNTIME_POLICY_VIOLATION: 'RUNTIME_POLICY_VIOLATION',
  INVALID_GATEWAY_DSL: 'INVALID_GATEWAY_DSL',
  TRANSIENT_STEP_ERROR: 'TRANSIENT_STEP_ERROR',
  PERMANENT_STEP_ERROR: 'PERMANENT_STEP_ERROR',
} as const;

const PERMANENT_STEP_ERROR_TYPE = 'PermanentStepError';
export const SIMULATE_ERROR_REJECTED_BY_RUNTIME_POLICY_CODE =
  'simulateError_rejected_by_runtime_policy' as const;
export const SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE =
  'simulateError_not_allowed_in_production' as const;
export const UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION_ERROR =
  'TEMPORAL_UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION' as const;

// ---------------------------------------------------------------------------
// Role-based dependency interfaces (3.3 — ISP: each activity declares its needs)
// ---------------------------------------------------------------------------

export interface PlanFetcherDeps {
  fetcher: IPlanFetcher;
  integrity: IPlanIntegrityValidator;
}

export interface EventEmitterDeps {
  runStateCommandPort: RunStateCommandPort;
  clock: IClock;
  idempotency: IIdempotencyKeyBuilder;
  /** Optional override for tests; runtime uses Temporal activity context. */
  getEngineAttemptId?: () => number;
}

export interface RunBootstrapperDeps {
  runStateCommandPort: RunStateCommandPort;
}

export interface SimulateErrorPolicy {
  /**
   * Fail-closed switch for test-only simulateError hooks.
   * Name kept for compatibility; explicit behavior is caller policy-driven.
   */
  rejectInProduction: boolean;
  /** Runtime mode label used in logs/metrics attributes. */
  runtimeMode: string;
}

export interface ActivityDeps extends PlanFetcherDeps, EventEmitterDeps, RunBootstrapperDeps {
  /** Optional observability sink; defaults to noop when omitted. */
  observability?: IObservability;
  /** Optional runtime policy for handling test-only simulateError hooks. */
  simulateErrorPolicy?: SimulateErrorPolicy;
}

// ---------------------------------------------------------------------------
// Activity input / output types
// ---------------------------------------------------------------------------

export interface StepInput {
  step: ExecutionPlan['steps'][number];
  ctx: RunContext;
  /**
   * Deterministic context assembled by workflow from previously completed steps.
   * Used only by gateway steps.
   */
  gatewayContext?: Record<string, unknown>;
}

export interface StepResult {
  stepId: string;
  status: 'COMPLETED' | 'FAILED';
  gatewayDecision?: boolean;
  retriable?: boolean;
  error?: string;
}

export interface EmitEventInput {
  ctx: RunContext;
  planRef: PlanRef;
  eventType: EventType;
  stepId?: string;
  payload?: Record<string, unknown>;
  /** Optional planner-driven logical attempt id; defaults to 1. */
  logicalAttemptId?: number;
}

// ---------------------------------------------------------------------------
// Step executor registry (3.4 — OCP: new step types added without modifying executeStep)
// ---------------------------------------------------------------------------

export interface StepExecutionContext {
  gatewayContext?: Record<string, unknown>;
}

export interface StepExecutor {
  canExecute(step: ExecutionPlan['steps'][number]): boolean;
  execute(step: ExecutionPlan['steps'][number], context: StepExecutionContext): Promise<StepResult>;
}

const gatewayStepExecutor: StepExecutor = {
  canExecute(step) {
    return step.type === 'gateway';
  },
  async execute(step, context) {
    const gateway = parseGatewayConfigOrThrow(step);
    try {
      const parsed = parseDslV1(gateway.expression);
      const passed = evaluateDslV1(parsed, context.gatewayContext ?? {});
      return { stepId: step.stepId, status: 'COMPLETED', gatewayDecision: passed };
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw ApplicationFailure.create({
        type: PERMANENT_STEP_ERROR_TYPE,
        message: `${ActivityErrorCode.INVALID_GATEWAY_DSL}:${step.stepId}:${reason}`,
        nonRetryable: true,
      });
    }
  },
};

const defaultStepExecutor: StepExecutor = {
  canExecute() {
    return true;
  },
  async execute(step) {
    return { stepId: step.stepId, status: 'COMPLETED' };
  },
};

/** Default executor chain: gateway first, catch-all last. */
export const DEFAULT_STEP_EXECUTORS: readonly StepExecutor[] = [
  gatewayStepExecutor,
  defaultStepExecutor,
];

// ---------------------------------------------------------------------------
// Activity factory — creates closures over shared deps
// ---------------------------------------------------------------------------

export function createActivities(
  deps: ActivityDeps,
  stepExecutors: readonly StepExecutor[] = DEFAULT_STEP_EXECUTORS
): {
  fetchPlan(planRef: PlanRef): Promise<ExecutionPlan>;
  executeStep(input: StepInput): Promise<StepResult>;
  emitEvent(input: EmitEventInput): Promise<void>;
  saveRunMetadata(meta: RunMetadata): Promise<void>;
} {
  const observability = resolveTemporalObservability(deps.observability);
  const simulateErrorPolicy = resolveSimulateErrorPolicy(deps.simulateErrorPolicy);
  assertSafeSimulateErrorPolicyForRuntime(simulateErrorPolicy);

  return {
    /**
     * Fetch plan from storage, validate SHA-256 integrity, parse JSON,
     * and verify metadata matches PlanRef.
     */
    async fetchPlan(planRef: PlanRef): Promise<ExecutionPlan> {
      const validatedPlanRef = parsePlanRef(planRef);
      const bytes = await deps.integrity.fetchAndValidate(validatedPlanRef, deps.fetcher);
      const plan = parsePlan(bytes);
      validatePlanAgainstRef(plan, validatedPlanRef);
      assertSimulateErrorDisallowedInProduction(
        plan,
        observability,
        simulateErrorPolicy,
        'fetchPlan'
      );
      return plan;
    },

    /**
     * Execute a single step.
     * Thin dispatcher: validates shape, applies test hook, then delegates to executor registry.
     */
    async executeStep(input: StepInput): Promise<StepResult> {
      validateStepShape(input.step);
      applySimulateErrorIfPresent(input.step, observability, simulateErrorPolicy);
      return dispatchStep(input.step, { gatewayContext: input.gatewayContext }, stepExecutors);
    },

    /**
     * Emit a lifecycle event (RunStarted, StepCompleted, etc.)
     * to the state store with idempotency + outbox forwarding.
     */
    async emitEvent(input: EmitEventInput): Promise<void> {
      const ctx = parseRunContext(input.ctx);
      const validatedPlanRef = parsePlanRef(input.planRef);
      const { eventType, stepId, payload } = input;

      const engineAttemptId =
        typeof deps.getEngineAttemptId === 'function'
          ? deps.getEngineAttemptId()
          : resolveTemporalAttemptFromContext();

      const logicalAttemptId = input.logicalAttemptId ?? 1;
      const envelopeBase = {
        eventId: deps.idempotency.eventId(),
        eventType,
        emittedAt: deps.clock.nowIsoUtc(),
        tenantId: ctx.tenantId,
        projectId: ctx.projectId,
        environmentId: ctx.environmentId,
        runId: ctx.runId,
        planId: validatedPlanRef.planId,
        planVersion: validatedPlanRef.planVersion,
        ...(stepId === undefined ? {} : { stepId }),
        engineAttemptId,
        logicalAttemptId,
        idempotencyKey: deps.idempotency.runEventKey({
          eventType,
          tenantId: ctx.tenantId,
          runId: ctx.runId,
          logicalAttemptId,
          planId: validatedPlanRef.planId,
          planVersion: validatedPlanRef.planVersion,
          ...(stepId === undefined ? {} : { stepId }),
        }),
      };
      const envelope: EventInput =
        payload === undefined ? envelopeBase : { ...envelopeBase, payload };

      await deps.runStateCommandPort.appendTransitions(ctx.runId, [envelope]);
    },

    /**
     * Persist run metadata for correlation queries.
     *
     * Idempotent: when the WorkflowEngine has already called bootstrapRunTx (the normal
     * production path per ADR-0013/0014), the state store throws RUN_ALREADY_EXISTS.
     * The activity silently succeeds — the engine-owned bootstrap is the authoritative
     * write, and the workflow continuing from resumeFromLayerIndex>0 (continue-as-new)
     * should not re-bootstrap an already-existing run.
     */
    async saveRunMetadata(meta: RunMetadata): Promise<void> {
      try {
        await deps.runStateCommandPort.bootstrapRun({ metadata: meta, firstEvents: [] });
      } catch (err) {
        if (err instanceof Error && err.message === 'RUN_ALREADY_EXISTS') return;
        throw err;
      }
    },
  };
}

export type Activities = ReturnType<typeof createActivities>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ALLOWED_STEP_FIELDS = new Set([
  'stepId',
  'kind',
  'type',
  'gateway',
  'stepTypeConfig',
  'compiledCodeRef',
  'dependsOn',
  'simulateError',
]);

const SUPPORTED_PLAN_CONTRACT_VERSIONS = new Set(['1.0.0']);

function resolveSimulateErrorPolicy(policy?: SimulateErrorPolicy): SimulateErrorPolicy {
  if (policy !== undefined) {
    return policy;
  }
  const runtimeMode = resolveDefaultRuntimeMode();
  return {
    // Backward-compatible default: only reject by default when runtime is production.
    rejectInProduction: runtimeMode === 'production',
    runtimeMode,
  };
}

function resolveDefaultRuntimeMode(): string {
  return isProductionRuntime() ? 'production' : 'non-production';
}

function isProductionRuntime(): boolean {
  return (process.env['NODE_ENV'] ?? '').trim().toLowerCase() === 'production';
}

function assertSafeSimulateErrorPolicyForRuntime(policy: SimulateErrorPolicy): void {
  if (!isProductionRuntime()) {
    return;
  }
  if (policy.rejectInProduction) {
    return;
  }
  throw new Error(UNSAFE_SIMULATE_ERROR_POLICY_IN_PRODUCTION_ERROR);
}

function resolveTemporalAttemptFromContext(): number {
  try {
    const attempt = Context.current().info.attempt;
    return Number.isInteger(attempt) && attempt > 0 ? attempt : 1;
  } catch {
    // Activity context not available (unit tests) — fall back to 1.
    return 1;
  }
}

function parsePlan(bytes: Uint8Array): ExecutionPlan {
  const text = new TextDecoder().decode(bytes);
  const obj: unknown = JSON.parse(text);
  if (!isExecutionPlan(obj)) {
    throw new TypeError(ActivityErrorCode.INVALID_PLAN_SCHEMA);
  }
  const contractVersion = obj.metadata.contractVersion;
  if (typeof contractVersion !== 'string') {
    throw new TypeError(ActivityErrorCode.PLAN_CONTRACT_VERSION_MISSING);
  }
  validatePlanContractVersion(contractVersion);
  return obj;
}

function isExecutionPlan(v: unknown): v is ExecutionPlan {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  const meta = o['metadata'];
  const steps = o['steps'];
  if (typeof meta !== 'object' || meta === null) return false;
  if (!Array.isArray(steps)) return false;
  const m = meta as Record<string, unknown>;
  return (
    typeof m['planId'] === 'string' &&
    typeof m['planVersion'] === 'string' &&
    typeof m['schemaVersion'] === 'string' &&
    typeof m['contractVersion'] === 'string'
  );
}

function validatePlanContractVersion(contractVersion: string): void {
  if (SUPPORTED_PLAN_CONTRACT_VERSIONS.has(contractVersion)) return;
  throw new TypeError(
    `${ActivityErrorCode.PLAN_CONTRACT_VERSION_UNKNOWN}: ${contractVersion}. Supported: ${Array.from(SUPPORTED_PLAN_CONTRACT_VERSIONS).join(', ')}`
  );
}

function validatePlanAgainstRef(plan: ExecutionPlan, ref: PlanRef): void {
  if (plan.metadata.planId !== ref.planId)
    throw new TypeError(`${ActivityErrorCode.PLAN_REF_MISMATCH}: planId`);
  if (plan.metadata.planVersion !== ref.planVersion)
    throw new TypeError(`${ActivityErrorCode.PLAN_REF_MISMATCH}: planVersion`);
  if (plan.metadata.schemaVersion !== ref.schemaVersion)
    throw new TypeError(`${ActivityErrorCode.PLAN_REF_MISMATCH}: schemaVersion`);
}

function validateStepShape(step: ExecutionPlan['steps'][number]): void {
  if (Object.keys(step).includes('inputBindings')) {
    throw new TypeError(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: inputBindings_not_supported_in_v1`
    );
  }
  for (const k of Object.keys(step)) {
    if (!ALLOWED_STEP_FIELDS.has(k)) {
      throw new TypeError(`${ActivityErrorCode.INVALID_STEP_SCHEMA}: field_not_allowed:${k}`);
    }
  }
  if (!Array.isArray(step.dependsOn) && step.dependsOn !== undefined) {
    throw new TypeError(`${ActivityErrorCode.INVALID_STEP_SCHEMA}: dependsOn_must_be_array`);
  }
  if (Array.isArray(step.dependsOn) && step.dependsOn.some((dep) => typeof dep !== 'string')) {
    throw new TypeError(
      `${ActivityErrorCode.INVALID_STEP_SCHEMA}: dependsOn_values_must_be_string`
    );
  }
}

function applySimulateErrorIfPresent(
  step: ExecutionPlan['steps'][number],
  observability: IObservability,
  policy: SimulateErrorPolicy
): void {
  const simulateErrorKind =
    typeof step['simulateError'] === 'string' ? String(step['simulateError']) : undefined;
  if (simulateErrorKind === undefined) {
    return;
  }

  // RC-A1: fail-closed in production for test-only failure hooks.
  if (policy.rejectInProduction) {
    emitRejectedSimulateErrorSignal(observability, {
      operation: 'executeStep',
      stepId: step.stepId,
      simulateErrorKind,
      runtimeMode: policy.runtimeMode,
    });
    throw createSimulateErrorRejectedByRuntimePolicyError(step.stepId);
  }

  if (simulateErrorKind === 'transient') {
    throw new Error(`${ActivityErrorCode.TRANSIENT_STEP_ERROR}:${step.stepId}`);
  }
  if (simulateErrorKind === 'permanent') {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.PERMANENT_STEP_ERROR}:${step.stepId}`,
      nonRetryable: true,
    });
  }
}

function assertSimulateErrorDisallowedInProduction(
  plan: ExecutionPlan,
  observability: IObservability,
  policy: SimulateErrorPolicy,
  operation: 'fetchPlan'
): void {
  if (!policy.rejectInProduction) {
    return;
  }

  const offendingStep = plan.steps.find((step) => typeof step['simulateError'] === 'string') as
    | ExecutionPlan['steps'][number]
    | undefined;
  if (!offendingStep) {
    return;
  }

  const simulateErrorKind = String(offendingStep['simulateError']);
  emitRejectedSimulateErrorSignal(observability, {
    operation,
    stepId: offendingStep.stepId,
    simulateErrorKind,
    runtimeMode: policy.runtimeMode,
    ...(plan.metadata.planId !== undefined ? { planId: plan.metadata.planId } : {}),
  });
  throw createSimulateErrorRejectedByRuntimePolicyError(offendingStep.stepId);
}

function emitRejectedSimulateErrorSignal(
  observability: IObservability,
  options: {
    operation: 'fetchPlan' | 'executeStep';
    stepId: string;
    simulateErrorKind: string;
    runtimeMode: string;
    planId?: string;
  }
): void {
  const signalFailures: Array<{ channel: 'metrics' | 'logs'; cause: string }> = [];

  try {
    observability.metrics
      .counter(
        'dvt.temporal.activity.simulate_error_rejected_total',
        buildTemporalMetricTags(options.operation, 'rejected')
      )
      .add(1, { simulateErrorKind: options.simulateErrorKind });
  } catch (error) {
    signalFailures.push({
      channel: 'metrics',
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    observability.logs.warn({
      msg: 'Rejected simulateError hook by runtime activity policy',
      attributes: {
        stepId: options.stepId,
        simulateErrorKind: options.simulateErrorKind,
        ...(options.planId !== undefined ? { planId: options.planId } : {}),
        runtimeMode: options.runtimeMode,
        canonicalCode: SIMULATE_ERROR_REJECTED_BY_RUNTIME_POLICY_CODE,
        legacyCode: SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE,
      },
    });
  } catch (error) {
    signalFailures.push({
      channel: 'logs',
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  if (signalFailures.length > 0) {
    emitRejectedSignalFallback(signalFailures, options);
  }
}

function emitRejectedSignalFallback(
  failures: Array<{ channel: 'metrics' | 'logs'; cause: string }>,
  options: {
    operation: 'fetchPlan' | 'executeStep';
    stepId: string;
    simulateErrorKind: string;
    runtimeMode: string;
    planId?: string;
  }
): void {
  const payload = {
    marker: 'dvt.simulate_error_signal_fallback',
    operation: options.operation,
    stepId: options.stepId,
    simulateErrorKind: options.simulateErrorKind,
    runtimeMode: options.runtimeMode,
    canonicalCode: SIMULATE_ERROR_REJECTED_BY_RUNTIME_POLICY_CODE,
    legacyCode: SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE,
    ...(options.planId !== undefined ? { planId: options.planId } : {}),
    failures,
  };

  try {
    process.stderr.write(`${JSON.stringify(payload)}\n`);
  } catch {
    // Final fallback intentionally empty: canonical rejection must still proceed.
  }
}

function createSimulateErrorRejectedByRuntimePolicyError(stepId: string): Error {
  // Preserve legacy suffix for compatibility while exposing a policy-specific primary code.
  const message = `${ActivityErrorCode.RUNTIME_POLICY_VIOLATION}: ${SIMULATE_ERROR_NOT_ALLOWED_IN_PRODUCTION_LEGACY_CODE}:${stepId}`;
  return ApplicationFailure.create({
    type: PERMANENT_STEP_ERROR_TYPE,
    message,
    nonRetryable: true,
  });
}

async function dispatchStep(
  step: ExecutionPlan['steps'][number],
  context: StepExecutionContext,
  executors: readonly StepExecutor[]
): Promise<StepResult> {
  const executor = executors.find((e) => e.canExecute(step));
  if (!executor) {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: no_executor_for_step_type:${step.type ?? 'unknown'}`,
      nonRetryable: true,
    });
  }
  return executor.execute(step, context);
}

function parseGatewayConfigOrThrow(step: ExecutionPlan['steps'][number]): {
  dslVersion: '1.0';
  expression: string;
} {
  const gateway = step.gateway;
  if (typeof gateway !== 'object' || gateway === null) {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_config_required:${step.stepId}`,
      nonRetryable: true,
    });
  }

  const value = gateway as Record<string, unknown>;
  if (value['dslVersion'] !== '1.0') {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_dsl_version:${step.stepId}`,
      nonRetryable: true,
    });
  }

  const expression = value['expression'];
  if (typeof expression !== 'string' || expression.trim().length === 0) {
    throw ApplicationFailure.create({
      type: PERMANENT_STEP_ERROR_TYPE,
      message: `${ActivityErrorCode.INVALID_STEP_SCHEMA}: gateway_expression:${step.stepId}`,
      nonRetryable: true,
    });
  }

  return { dslVersion: '1.0', expression };
}
