/** Owned concern: project whether a terminal run retains a trusted recovery context reference. */
import type { CanonicalRunStatus, RunMetadata } from '@dvt/contracts';

import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import type { IRunExecutionContextRequirementResolver } from '../ports/runExecutionContextRequirementResolver.js';

import { decideRecoverRun } from './runControlPolicy.js';

export async function resolveRunRecoveryContextTrust(
  reader: IRunExecutionContextReferenceReader | undefined,
  requirementResolver: IRunExecutionContextRequirementResolver | undefined,
  metadata: Pick<
    RunMetadata,
    'tenantId' | 'projectId' | 'environmentId' | 'planId' | 'planVersion' | 'runId'
  > & { readonly providerRef: Pick<RunMetadata['providerRef'], 'provider'> },
  status: CanonicalRunStatus,
  planRef?: Readonly<{ sha256: string }>
): Promise<boolean> {
  if (reader === undefined || decideRecoverRun(status).kind === 'reject') {
    return true;
  }
  if (planRef === undefined) return false;

  try {
    const result = await reader.read({
      tenantId: metadata.tenantId,
      runId: metadata.runId,
      expectedBinding: {
        tenantId: metadata.tenantId,
        projectId: metadata.projectId,
        environmentId: metadata.environmentId,
        planId: metadata.planId,
        planVersion: metadata.planVersion,
        planSha256: planRef.sha256,
        targetAdapter: metadata.providerRef.provider,
      },
    });
    if (result.kind === 'trusted') return true;
    if (result.kind === 'untrusted') return false;
    return (await requirementResolver?.resolve(metadata)) === 'not_required';
  } catch {
    return false;
  }
}
