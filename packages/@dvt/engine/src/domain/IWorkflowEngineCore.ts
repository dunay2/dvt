import type { EngineRunRef, RunStatusSnapshot, SignalRequest } from '@dvt/contracts';

export interface IWorkflowEngineCore {
  getStatus(ref: EngineRunRef): Promise<RunStatusSnapshot>;
  enrichStatus(ref: EngineRunRef): Promise<RunStatusSnapshot>;
  cancel(ref: EngineRunRef): Promise<void>;
  signal(ref: EngineRunRef, req: SignalRequest): Promise<void>;
}
