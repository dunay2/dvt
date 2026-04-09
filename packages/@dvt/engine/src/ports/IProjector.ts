import type { EventEnvelope, WorkflowSnapshot } from './IRunStateStore.js';

export interface IProjector {
  rebuild(runId: string, events: EventEnvelope[]): WorkflowSnapshot;
}
