import type { EventEnvelope, WorkflowSnapshot } from '../../engine/IRunStateStore.v1.js';

export interface IProjector {
  rebuild(runId: string, events: EventEnvelope[]): WorkflowSnapshot;
}
