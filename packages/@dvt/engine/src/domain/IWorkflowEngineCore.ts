import type {
  CanonicalRunStatus,
  EngineRunRef,
  RunStatusEnrichment,
  SignalRequest,
} from '@dvt/contracts';

export interface IWorkflowEngineCore {
  getStatus(ref: EngineRunRef): Promise<CanonicalRunStatus>;
  getEnrichment(ref: EngineRunRef): Promise<RunStatusEnrichment>;
  cancel(ref: EngineRunRef): Promise<void>;
  signal(ref: EngineRunRef, req: SignalRequest): Promise<void>;
}
