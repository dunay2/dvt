/** Owned concern: adapt DBT project-analysis truth to Code persistence reconciliation. */
import type { DbtProjectGraphProjection } from '@dvt/contracts';

import type { CodeWorkingTreeReconciliationOutcome } from '../code/codeWorkingTreeSyncModel';

export function projectDbtCodeReconciliationOutcome(
  projection: DbtProjectGraphProjection
): CodeWorkingTreeReconciliationOutcome {
  if (projection.freshness === 'fresh') {
    return {
      kind: 'fresh',
      analysisSha256: projection.analysisSha256,
      projectContentSetSha256: projection.projectRevision.contentSetSha256,
    };
  }

  return {
    kind: 'degraded',
    freshness: projection.freshness,
  };
}
