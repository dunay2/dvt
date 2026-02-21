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
  getRunStatus(engineRunRef: EngineRunRef): Promise<RunStatusSnapshot>;
  signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>;
}
