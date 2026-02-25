import type { RunStatusSnapshot } from '@dvt/contracts';
import type { EventEnvelope, WorkflowSnapshot } from '../contracts/runEvents.js';
/**
 * Pure function: applies a single event to a mutable WorkflowSnapshot.
 *
 * Exported so state store implementations can incrementally maintain a
 * materialized snapshot without depending on SnapshotProjector as a class.
 * Must remain a pure value transform — no I/O, no side effects.
 */
export declare function applyRunEvent(snap: WorkflowSnapshot, e: EventEnvelope): WorkflowSnapshot;
/**
 * Pure function: converts a materialized WorkflowSnapshot into a RunStatusSnapshot
 * (adds the deterministic JCS+SHA-256 hash).
 *
 * Exported so WorkflowEngine.getRunStatus can produce its response from a
 * stored snapshot without a full event replay.
 */
export declare function snapshotToStatus(snap: WorkflowSnapshot): RunStatusSnapshot;
export declare class SnapshotProjector {
  rebuild(runId: string, events: EventEnvelope[]): RunStatusSnapshot;
}
//# sourceMappingURL=SnapshotProjector.d.ts.map
