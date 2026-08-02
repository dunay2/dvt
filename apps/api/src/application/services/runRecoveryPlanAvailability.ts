/** Owned concern: resolve whether a terminal run retains its immutable source plan. */
import type { IStoredPlanArtifactReader, IStoredPlanRefReader } from '@dvt/artifacts';
import type { CanonicalRunStatus, RunMetadata } from '@dvt/contracts';
import type { IPlanIntegrityValidator } from '@dvt/engine';

import { decideRecoverRun } from './runControlPolicy.js';

type RecoveryPlanMetadata = Pick<
  RunMetadata,
  'tenantId' | 'projectId' | 'environmentId' | 'planId'
>;

type RecoveryPlanReader = IStoredPlanRefReader & IStoredPlanArtifactReader;
type OptionalRecoveryPlanReader = Partial<RecoveryPlanReader>;

export async function resolveRunRecoveryPlanAvailability(
  reader: OptionalRecoveryPlanReader | undefined,
  validator: IPlanIntegrityValidator | undefined,
  metadata: RecoveryPlanMetadata,
  status: CanonicalRunStatus
): Promise<boolean> {
  if (decideRecoverRun(status).kind === 'reject') {
    return true;
  }
  if (!isRecoveryPlanReader(reader) || validator === undefined) {
    return false;
  }

  try {
    const scope = {
      tenantId: metadata.tenantId,
      projectId: metadata.projectId,
      environmentId: metadata.environmentId,
    };
    const planRef = await reader.getStoredPlanRef({ ...scope, planId: metadata.planId });
    if (planRef === undefined) {
      return false;
    }

    await validator.fetchAndValidate({ ...scope, planRef }, reader);
    return true;
  } catch {
    return false;
  }
}

function isRecoveryPlanReader(
  reader: OptionalRecoveryPlanReader | undefined
): reader is RecoveryPlanReader {
  return (
    typeof reader?.getStoredPlanRef === 'function' &&
    typeof reader.getStoredPlanValidationRecord === 'function' &&
    typeof reader.fetchStoredPlanArtifact === 'function' &&
    typeof reader.fetchStoredPlanArtifactForValidation === 'function'
  );
}
