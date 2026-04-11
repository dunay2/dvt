import type { CanonicalRunStatus, EngineRunRef, SignalRequest } from '@dvt/contracts';

export interface IWorkflowEngineCore {
  getStatus(ref: EngineRunRef): Promise<CanonicalRunStatus>;
  cancel(ref: EngineRunRef): Promise<void>;
  signal(ref: EngineRunRef, req: SignalRequest): Promise<void>;
}
