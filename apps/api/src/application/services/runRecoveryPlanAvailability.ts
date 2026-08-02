/** Owned concern: resolve whether a terminal run retains its immutable source plan. */
import type { IStoredPlanRefReader } from '@dvt/artifacts';
import type { CanonicalRunStatus, RunMetadata } from '@dvt/contracts';

import { decideRecoverRun } from './runControlPolicy.js';

type RecoveryPlanMetadata = Pick<
  RunMetadata,
  'tenantId' | 'projectId' | 'environmentId' | 'planId'
>;

type OptionalStoredPlanRefReader = Partial<Pick<IStoredPlanRefReader, 'getStoredPlanRef'>>;

export async function resolveRunRecoveryPlanAvailability(
  reader: OptionalStoredPlanRefReader | undefined,
  metadata: RecoveryPlanMetadata,
  status: CanonicalRunStatus
): Promise<boolean> {
  if (decideRecoverRun(status).kind === 'reject') {
    return true;
  }
  if (reader?.getStoredPlanRef === undefined) {
    return false;
  }

  try {
    return (
      (await reader.getStoredPlanRef({
        tenantId: metadata.tenantId,
        projectId: metadata.projectId,
        environmentId: metadata.environmentId,
        planId: metadata.planId,
      })) !== undefined
    );
  } catch {
    return false;
  }
}
