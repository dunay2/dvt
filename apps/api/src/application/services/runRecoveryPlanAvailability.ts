/** Owned concern: resolve whether a terminal run retains its immutable source plan. */
import type { IStoredPlanArtifactReader, IStoredPlanRefReader } from '@dvt/artifacts';
import type { CanonicalRunStatus, PlanRef, RunMetadata } from '@dvt/contracts';
import type { IPlanIntegrityValidator } from '@dvt/engine';

import { decideRecoverRun } from './runControlPolicy.js';

type RecoveryPlanMetadata = Pick<
  RunMetadata,
  'tenantId' | 'projectId' | 'environmentId' | 'planId'
>;

type RecoveryPlanReader = IStoredPlanRefReader & IStoredPlanArtifactReader;
type OptionalRecoveryPlanReader = Partial<RecoveryPlanReader>;

export interface RunRecoveryPlanEvidence {
  readonly available: boolean;
  readonly planRef?: PlanRef;
}

export async function resolveRunRecoveryPlanEvidence(
  reader: OptionalRecoveryPlanReader | undefined,
  validator: IPlanIntegrityValidator | undefined,
  metadata: RecoveryPlanMetadata,
  status: CanonicalRunStatus
): Promise<RunRecoveryPlanEvidence> {
  if (decideRecoverRun(status).kind === 'reject') {
    return { available: true };
  }
  if (!isRecoveryPlanReader(reader) || validator === undefined) {
    return { available: false };
  }

  try {
    const scope = {
      tenantId: metadata.tenantId,
      projectId: metadata.projectId,
      environmentId: metadata.environmentId,
    };
    const planRef = await reader.getStoredPlanRef({ ...scope, planId: metadata.planId });
    if (planRef === undefined) {
      return { available: false };
    }

    await validator.fetchAndValidate({ ...scope, planRef }, reader);
    return { available: true, planRef };
  } catch {
    return { available: false };
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
