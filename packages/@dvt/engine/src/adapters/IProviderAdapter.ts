/**
 * @file packages/@dvt/engine/src/adapters/IProviderAdapter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0012: Plan Integrity Ownership
 * @baseline ADR-0014: Run-Driven Adapter Model
 * @baseline ADR-0030: Pre-Dispatch Intent Log and observation-only reconciliation
 * @decision Define an adapter contract oriented to run-driven execution and explicit signaling
 *   while keeping plan-integrity ownership in the engine entry point.
 * @consequence The engine retains semantic control and allows swapping runtimes without breaking the domain.
 */
import type {
  EngineRunRef,
  PlanRef,
  ProviderRunStatusView,
  ResolvedRunContext,
  SignalSemanticsVersion,
  SignalRequest,
} from '@dvt/contracts';

export type ProviderExecutionTarget = Readonly<{ runRef: EngineRunRef; executionId: string }>;
export type ProviderTerminalDisposition =
  'cancelled' | 'terminated' | 'completed' | 'failed' | 'timed_out' | 'other';
export type ProviderRunObservation =
  | Readonly<{ kind: 'missing_at_observation' }>
  | Readonly<{ kind: 'active'; target: ProviderExecutionTarget }>
  | Readonly<{
      kind: 'terminal';
      target: ProviderExecutionTarget;
      disposition: ProviderTerminalDisposition;
    }>;

export interface IProviderAdapter {
  readonly provider: EngineRunRef['provider'];

  /**
   * Starts the run using the engine-verified immutable PlanRef.
   *
   * ADR-0012: Engine owns plan fetch and integrity verification.
   * ADR-0014: Run-driven adapter model - adapter initiates workflow execution.
   * Provider runtimes that fetch execution segments MUST revalidate PlanRef.sha256
   * before executing fetched plan material.
   */
  startRun(planRef: PlanRef, ctx: ResolvedRunContext): Promise<EngineRunRef>;
  /** When supplied, executionId MUST target that exact execution, never its replacement. */
  cancelRun(runRef: EngineRunRef, executionId?: string): Promise<void>;
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

  /** Missing is only a point-in-time observation; absent support MUST defer reconciliation. */
  observeStartRun?(runId: string, tenantId: string): Promise<ProviderRunObservation>;
}
