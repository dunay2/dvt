import type { CanonicalRunStatus, EngineRunRef } from '@dvt/contracts';

export interface IRunStatusQueryService {
  getStatus(ref: EngineRunRef): Promise<CanonicalRunStatus>;
}
