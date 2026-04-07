/**
 * @file packages/@dvt/engine/src/contracts/IWorkflowEngine.v1_1_1.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The engine contract defines run lifecycle operations as the domain's normative API
 * @consequence Integrations consume a stable interface without depending on underlying runtime details
 * @version 1.0.0
 * @date 2026-02-21
 */
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunStatusSnapshot,
  SignalRequest,
} from './types.js';

export interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
  cancelRun(engineRunRef: EngineRunRef): Promise<void>;

  /**
   * ADR-0015: Returns status from the event log + materialized snapshot only.
   * MUST NOT call the provider adapter. Latency is independent of adapter availability.
   */
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;

  /**
   * ADR-0015: Calls the provider adapter for real-time substatus/message enrichment.
   * Use for diagnostic / UI polling endpoints where adapter latency is acceptable.
   * Circuit breaking is the infrastructure layer's responsibility.
   * If adapter lookup times out or fails, this call MUST reject.
   * It MUST NOT silently downgrade to getRunStatus() or return a partial response.
   */
  enrichRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;

  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
