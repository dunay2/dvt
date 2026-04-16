import type { EngineRunRef, SignalRequest } from '@dvt/contracts';

export interface IRunControlService {
  cancel(ref: EngineRunRef): Promise<void>;
  signal(ref: EngineRunRef, req: SignalRequest): Promise<void>;
}
