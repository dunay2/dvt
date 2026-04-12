import type { EngineRunRef, PlanRef, RunContext } from '@dvt/contracts';

export interface IRunRecoveryService {
  recoverRun(sourceRunId: string, planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
}
