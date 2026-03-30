import type { IRunSnapshotStalenessQuery } from '@dvt/engine';
import type { IObservability } from '@dvt/observability';

import type { IRunSnapshotStalenessReader } from '../../application/ports/runtime.js';
import { safeWarn } from '../admissionTelemetry/safeWarn.js';

export class SafeRunSnapshotStalenessReader implements IRunSnapshotStalenessReader {
  public constructor(
    private readonly query: Pick<IRunSnapshotStalenessQuery, 'isSnapshotStale'>,
    private readonly observability: IObservability
  ) {}

  public async isSnapshotStale(tenantId: string, runId: string): Promise<boolean | null> {
    try {
      return await this.query.isSnapshotStale(tenantId, runId);
    } catch (error) {
      safeWarn(this.observability.logs, 'run_status.snapshot_staleness_query_failed', error);
      return null;
    }
  }
}
