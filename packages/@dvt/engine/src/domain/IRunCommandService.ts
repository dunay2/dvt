import type { EngineRunRef } from '@dvt/contracts';

export interface IRunCommandService {
  cancel(ref: EngineRunRef): Promise<void>;
}
