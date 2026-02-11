import crypto from 'crypto';
import { WorkflowSnapshot, RunId, SnapshotVersion } from '../contracts/types';

export function hashSnapshot(snapshot: WorkflowSnapshot): string {
  const json = JSON.stringify(snapshot);
  return crypto.createHash('sha256').update(json, 'utf8').digest('hex');
}

export class SnapshotBuilder {
  private snapshot: Partial<WorkflowSnapshot> = {};

  withRunId(runId: string): this {
    this.snapshot.runId = runId as any;
    return this;
  }

  build(): WorkflowSnapshot {
    const now = Date.now();
    return {
      runId: this.snapshot.runId!,
      tenantId: this.snapshot.tenantId!,
      planId: this.snapshot.planId!,
      version: this.snapshot.version ?? (0 as any),
      state: this.snapshot.state ?? 'INITIALIZING',
      steps: this.snapshot.steps ?? new Map(),
      stepOutputs: this.snapshot.stepOutputs ?? new Map(),
      createdAt: now,
      updatedAt: now,
    } as WorkflowSnapshot;
  }
}
