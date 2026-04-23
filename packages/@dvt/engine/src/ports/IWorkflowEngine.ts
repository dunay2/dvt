/**
 * @file packages/@dvt/engine/src/ports/IWorkflowEngine.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0018: Shared Kernel Ownership Governance
 * @decision The workflow engine behavior port lives in the engine-owned ports surface
 * @consequence Consumers use a domain-owned behavior contract instead of a transitional contracts path
 * @version 1.0.0
 * @date 2026-04-23
 */
import type {
  CanonicalRunStatus,
  EngineRunRef,
  PlanRef,
  RunContext,
  SignalRequest,
} from '../contracts/types.js';

export interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;

  /**
   * ADR-0015: Returns canonical status from the event log + materialized snapshot only.
   * MUST NOT call the provider adapter. Latency is independent of adapter availability.
   */
  getRunStatus(engineRunRef: EngineRunRef): Promise<CanonicalRunStatus>;

  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
