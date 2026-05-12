import type { EngineRunRef, SignalRequest } from '@dvt/contracts';

export interface IRunSignalService {
  signal(ref: EngineRunRef, req: SignalRequest): Promise<void>;
}
