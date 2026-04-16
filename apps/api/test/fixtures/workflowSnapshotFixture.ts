import { CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION } from '@dvt/contracts';
import type { IRunStateStoreMaintenance } from '@dvt/engine';

export type RebuildSnapshot = IRunStateStoreMaintenance['rebuildSnapshot'];
export type WorkflowSnapshotResult = Awaited<ReturnType<RebuildSnapshot>>;

export function makeWorkflowSnapshot(
  runId: string,
  status: WorkflowSnapshotResult['status'] = 'PENDING'
): WorkflowSnapshotResult {
  return {
    schemaVersion: CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
    runId,
    status,
    paused: false,
    cancelling: false,
    steps: {},
  };
}
