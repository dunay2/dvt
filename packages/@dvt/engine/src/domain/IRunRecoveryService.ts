import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';

export type RecoverRunServiceRequest = Readonly<{
  sourceRunId: string;
  planRef: PlanRef;
  context: RunContext;
}>;

export interface IRunRecoveryService {
  recoverRun(request: RecoverRunServiceRequest): Promise<EngineRunRef>;
}
