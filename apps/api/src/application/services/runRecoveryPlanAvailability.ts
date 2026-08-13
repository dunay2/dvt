/** Owned concern: resolve whether a terminal run retains its immutable source plan. */
import type { IStoredPlanArtifactReader, IStoredPlanRefReader } from '@dvt/artifacts';
import type { CanonicalRunStatus, PlanRef, RunMetadata } from '@dvt/contracts';
import type { IPlanIntegrityValidator } from '@dvt/engine';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { IStartRunTargetAdapterRegistry } from '../ports/IStartRunTargetAdapterRegistry.js';

import { decideRecoverRun } from './runControlPolicy.js';

type RecoveryPlanMetadata = Pick<
  RunMetadata,
  'tenantId' | 'projectId' | 'environmentId' | 'planId' | 'providerRef'
>;

type RecoveryPlanReader = IStoredPlanRefReader & IStoredPlanArtifactReader;
type OptionalRecoveryPlanReader = Partial<RecoveryPlanReader>;

export interface RunRecoveryPlanEvidence {
  readonly available: boolean;
  readonly adapterAvailable: boolean;
  readonly planRef?: PlanRef;
}

export interface RunRecoveryAdmissionDependencies {
  readonly targetAdapterRegistry?: IStartRunTargetAdapterRegistry | undefined;
  readonly planExecutabilityValidator?: IPlanExecutabilityValidator | undefined;
}

export async function resolveRunRecoveryPlanEvidence(
  reader: OptionalRecoveryPlanReader | undefined,
  validator: IPlanIntegrityValidator | undefined,
  metadata: RecoveryPlanMetadata,
  status: CanonicalRunStatus,
  admission: RunRecoveryAdmissionDependencies = {}
): Promise<RunRecoveryPlanEvidence> {
  if (decideRecoverRun(status).kind === 'reject') {
    return { available: true, adapterAvailable: true };
  }

  const adapterRegistered =
    admission.targetAdapterRegistry?.isSupported(metadata.providerRef.provider) ?? false;
  if (!isRecoveryPlanReader(reader) || validator === undefined) {
    return { available: false, adapterAvailable: adapterRegistered };
  }

  const scope = {
    tenantId: metadata.tenantId,
    projectId: metadata.projectId,
    environmentId: metadata.environmentId,
  };
  const storedPlanRef = await reader.getStoredPlanRef({ ...scope, planId: metadata.planId });
  if (storedPlanRef === undefined) {
    return { available: false, adapterAvailable: adapterRegistered };
  }

  try {
    await validator.fetchAndValidate({ ...scope, planRef: storedPlanRef }, reader);
  } catch {
    return { available: false, adapterAvailable: adapterRegistered };
  }
  const planRef: PlanRef = storedPlanRef;

  if (!adapterRegistered || admission.planExecutabilityValidator === undefined) {
    return { available: true, adapterAvailable: false, planRef };
  }

  try {
    const executability = await admission.planExecutabilityValidator.validatePlan({
      ...scope,
      planRef,
      adapterId: metadata.providerRef.provider,
    });
    return {
      available: true,
      adapterAvailable: executability.status === 'OK',
      planRef,
    };
  } catch {
    return { available: true, adapterAvailable: false, planRef };
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
