import type { IRunSnapshotStalenessQuery } from '@dvt/engine';
import type { IObservability } from '@dvt/observability';

import type { IRunSnapshotStalenessReader } from '../../application/ports/runtime.js';

export class SafeRunSnapshotStalenessReader implements IRunSnapshotStalenessReader {
  public constructor(
    private readonly query: Pick<IRunSnapshotStalenessQuery, 'isSnapshotStale'>,
    private readonly observability: IObservability
  ) {}

  public async isSnapshotStale(tenantId: string, runId: string): Promise<boolean | null> {
    try {
      return await this.query.isSnapshotStale(tenantId, runId);
    } catch (error) {
      try {
        this.observability.logs.warn({
          msg: 'run_status.snapshot_staleness_query_failed',
          attributes: { error: String(error), tenantId, runId },
        });
      } catch {
        // Logger unavailable — ignore silently.
      }
      return null;
    }
  }
}
