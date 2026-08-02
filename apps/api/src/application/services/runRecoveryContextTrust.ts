/** Owned concern: project whether a terminal run retains a trusted recovery context reference. */
import type { CanonicalRunStatus, RunMetadata } from '@dvt/contracts';

import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import type { IRunExecutionContextRequirementResolver } from '../ports/runExecutionContextRequirementResolver.js';

import { decideRecoverRun } from './runControlPolicy.js';

export async function resolveRunRecoveryContextTrust(
  reader: IRunExecutionContextReferenceReader | undefined,
  requirementResolver: IRunExecutionContextRequirementResolver | undefined,
  metadata: Pick<RunMetadata, 'tenantId' | 'projectId' | 'environmentId' | 'planId' | 'runId'>,
  status: CanonicalRunStatus
): Promise<boolean> {
  if (reader === undefined || decideRecoverRun(status).kind === 'reject') {
    return true;
  }

  try {
    const result = await reader.read({ tenantId: metadata.tenantId, runId: metadata.runId });
    if (result.kind === 'trusted') return true;
    if (result.kind === 'untrusted') return false;
    return (await requirementResolver?.resolve(metadata)) === 'not_required';
  } catch {
    return false;
  }
}
