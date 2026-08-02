/** Owned concern: project whether a terminal run retains a trusted recovery context reference. */
import type { CanonicalRunStatus, RunMetadata } from '@dvt/contracts';

import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';

import { decideRecoverRun } from './runControlPolicy.js';

export async function resolveRunRecoveryContextTrust(
  reader: IRunExecutionContextReferenceReader | undefined,
  metadata: Pick<RunMetadata, 'tenantId' | 'runId'>,
  status: CanonicalRunStatus
): Promise<boolean> {
  if (reader === undefined || decideRecoverRun(status).kind === 'reject') {
    return true;
  }

  const result = await reader.read({ tenantId: metadata.tenantId, runId: metadata.runId });
  return result.kind !== 'untrusted';
}
