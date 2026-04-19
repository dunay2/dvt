/**
 * @baseline ADR-0003
 */
import { parseEngineRunRef } from '@dvt/contracts';

import {
  ProviderRefProviderMismatchError,
  RunNotFoundError,
  TenantAccessDeniedError,
} from '../contracts/errors.js';
import type { RunMetadata } from '../contracts/runEvents.js';
import { normalizeEngineRunRef } from '../core/lifecycle/coreRuntime.js';
import type { RetryAttemptReservation } from '../ports/IRunStateStore.js';

import { reserveRetryAttemptFromSource } from './retryLineagePolicy.js';

export type InMemoryRunStateAdminBacking = {
  metadataByRunId: Map<string, RunMetadata>;
  nextRetryAttemptByOriginRunId: Map<string, number>;
};

export function saveInMemoryProviderRef(
  backing: InMemoryRunStateAdminBacking,
  tenantId: string,
  runId: string,
  providerRef: RunMetadata['providerRef']
): RunMetadata {
  const validatedProviderRef = normalizeEngineRunRef(parseEngineRunRef(providerRef));
  const current = backing.metadataByRunId.get(runId);
  if (!current) {
    throw new RunNotFoundError(runId);
  }
  if (current.tenantId !== tenantId || validatedProviderRef.tenantId !== tenantId) {
    throw new TenantAccessDeniedError(tenantId);
  }
  if (current.providerRef.provider !== validatedProviderRef.provider) {
    throw new ProviderRefProviderMismatchError(
      runId,
      current.providerRef.provider,
      validatedProviderRef.provider
    );
  }

  const updated: RunMetadata = {
    ...current,
    providerRef: validatedProviderRef,
  };
  backing.metadataByRunId.set(runId, updated);
  return updated;
}

export function reserveInMemoryRetryAttempt(
  backing: InMemoryRunStateAdminBacking,
  tenantId: string,
  sourceRunId: string
): RetryAttemptReservation {
  const sourceMeta = backing.metadataByRunId.get(sourceRunId);
  if (!sourceMeta || sourceMeta.tenantId !== tenantId) {
    throw new RunNotFoundError(sourceRunId);
  }

  return reserveRetryAttemptFromSource(backing.nextRetryAttemptByOriginRunId, sourceMeta);
}
