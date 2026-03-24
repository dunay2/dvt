/**
 * @file packages/@dvt/engine/src/adapters/IProviderAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership (adapter receives PlanRef, not ExecutionPlan)
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log (lookupRunRef? for PENDING intent reconciliation)
 * @decision Decision — Define an adapter contract oriented to run-driven execution and explicit signaling
 * @decision ADR-0012: Adapter owns plan bytes fetch + SHA-256 verification; engine must not fetch bytes
 * @consequence The engine retains semantic control and allows swapping runtimes without breaking the domain
 * @version 2.0.0
 * @date 2026-02-21
 */
import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunStatusSnapshot,
  SignalRequest,
} from '@dvt/contracts';

export interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  /**
   * Starts the run using the PlanRef (not the resolved ExecutionPlan).
   *
   * ADR-0012: Adapter owns plan bytes fetch + SHA-256 verification.
   * ADR-0014: Run-driven adapter model — adapter receives PlanRef and initiates workflow.
   *
   * The engine MUST NOT fetch plan bytes before calling startRun.
   * Adapters are the plan-bytes trust boundary.
   */
  startRun(planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef>;
  cancelRun(runRef: EngineRunRef): Promise<void>;
  getRunStatus(runRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(runRef: EngineRunRef, request: SignalRequest): Promise<void>;
  ping?(): Promise<void>;

  /**
   * Optional. Computes a deterministic EngineRunRef from RunContext WITHOUT a network call.
   * When implemented, WorkflowEngine bootstraps run_metadata before adapter.startRun(),
   * eliminating the dual-producer event ordering race.
   */
  estimateRunRef?(ctx: ResolvedRunContext): EngineRunRef;

  /**
   * Returns the capability identifiers this adapter implements.
   * Used by the engine to enforce `PlanRef.requiresCapabilities` before starting a run.
   * Strings MUST be from capabilities.schema.json.
   * Optional: adapters that omit this method skip capability validation.
   */
  capabilities?(): readonly string[];

  /**
   * ADR-0030 §3.3 — Pre-dispatch intent reconciliation.
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
