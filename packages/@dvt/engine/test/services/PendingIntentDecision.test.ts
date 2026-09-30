import type { CanonicalRunStatus, EngineRunRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  decidePendingIntentReconciliation,
  type PendingIntentObservation,
} from '../../src/services/runMaintenance/decidePendingIntentReconciliation.js';

const runRef: EngineRunRef = { provider: 'temporal', tenantId: 't', workflowId: 'w', runId: 'r' };

describe('pending intent decision', () => {
  it.each(['metadata_failed', 'lookup_failed', 'status_failed'] as const)(
    'defers %s without converting failure to absence',
    (kind) => {
      const observation = { kind, error: 'non-Error failure' };
      expect(decidePendingIntentReconciliation(observation)).toEqual({
        kind: 'defer',
        observation,
      });
    }
  );

  it.each([true, false])('defers unsupported lookup with bootstrapped=%s', (hasBootstrappedRun) => {
    const observation = { kind: 'lookup_unsupported' as const, hasBootstrappedRun };
    expect(decidePendingIntentReconciliation(observation)).toEqual({ kind: 'defer', observation });
  });

  it.each([true, false])(
    'selects the existing found-workflow action with bootstrapped=%s',
    (hasBootstrappedRun) => {
      expect(
        decidePendingIntentReconciliation({ kind: 'workflow_found', runRef, hasBootstrappedRun })
      ).toEqual({ kind: hasBootstrappedRun ? 'adopt' : 'cancel', runRef });
    }
  );

  it('expires confirmed missing workflow and metadata under the current protocol', () => {
    expect(decidePendingIntentReconciliation({ kind: 'workflow_missing', status: null })).toEqual({
      kind: 'expire_missing',
    });
  });

  it.each([
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'PENDING',
    'APPROVED',
    'RUNNING',
    'PAUSED',
  ] as CanonicalRunStatus['status'][])('classifies canonical status %s', (status) => {
    const observation: PendingIntentObservation = { kind: 'workflow_missing', status };
    const before = globalThis.structuredClone(observation);
    expect(decidePendingIntentReconciliation(observation)).toEqual(
      ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)
        ? { kind: 'expire_terminal', status }
        : { kind: 'ready_to_dispatch' }
    );
    expect(observation).toEqual(before);
  });
});
