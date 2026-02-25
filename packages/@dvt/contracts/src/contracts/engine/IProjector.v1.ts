import type { EventEnvelope, WorkflowSnapshot } from './IRunStateStore.v1';

export interface IProjector {
  rebuild(runId: string, events: EventEnvelope[]): WorkflowSnapshot;
}
