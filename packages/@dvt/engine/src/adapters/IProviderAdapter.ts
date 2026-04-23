/**
 * @file packages/@dvt/engine/src/adapters/IProviderAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log (lookupRunRef? for PENDING intent reconciliation)
 * @decision Define an adapter contract oriented to run-driven execution and explicit signaling
 *   while keeping plan-integrity ownership in the engine entry point.
 * @consequence The engine retains semantic control and allows swapping runtimes without breaking the domain.
 */
import type {
  EngineRunRef,
  ExecutionPlan,
  PlanRef,
  ProviderRunStatusView,
  ResolvedRunContext,
  SignalSemanticsVersion,
  SignalRequest,
} from '@dvt/contracts';

export interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  /**
   * Starts the run using the engine-verified plan plus its originating PlanRef.
   *
   * ADR-0012: Engine owns plan fetch and integrity verification.
   * ADR-0014: Run-driven adapter model - adapter initiates workflow execution.
   */
  startRun(plan: ExecutionPlan, planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getProviderStatusView(runRef: EngineRunRef): Promise<ProviderRunStatusView>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;
  signalSemanticsVersions(): readonly SignalSemanticsVersion[];
  ping?(): Promise<void>;

  /**
   * Optional. Computes a deterministic EngineRunRef from RunContext WITHOUT a network call.
   * When implemented, WorkflowEngine bootstraps run_metadata before adapter.startRun(),
   * eliminating the dual-producer event ordering race.
   *
   * If this hook is implemented, `startRun()` MUST return the same provider.
   * Late-bound provider fields may be reconciled through `saveProviderRef()`,
   * but cross-provider drift is treated as a protocol violation.
   */
  estimateRunRef?(ctx: ResolvedRunContext): EngineRunRef;

  /**
   * Returns the capability identifiers this adapter implements.
   * Used by the engine to enforce `RunExecutionPolicy.requiresCapabilities`
   * before starting a run.
   * Strings MUST be from capabilities.schema.json.
   * Optional at the type level, but adapters that omit this method fail
   * admission whenever the execution policy requires capabilities.
   */
  capabilities?(): readonly string[];

  /**
   * ADR-0030 §3.3 - Pre-dispatch intent reconciliation.
   *
   * Given a runId and tenantId, derive the provider's workflowId (per StartRunIdempotency §3.3)
   * and return the EngineRunRef if the workflow exists on the provider side, or null otherwise.
   *
   * Used by ReconcileOrphanedIntents to detect and cancel provider workflows that were
   * started (adapter.startRun() returned) but never recorded (markDispatched() was not called
   * before process crash).
   *
   * Optional: adapters that omit this method treat all PENDING intents as having no workflow.
   */
  lookupRunRef?(runId: string, tenantId: string): Promise<EngineRunRef | null>;
}
