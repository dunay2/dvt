import type { RunContext } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';

import { createEngine, makeAdapters, makeContext, makePlanRef } from './WorkflowEngine.helpers.js';

describe('WorkflowEngine startRun intent id determinism', () => {
  it('uses deterministic intent id derived from tenant, run, attempt, and adapter', async () => {
    const { engine, intentStore } = createEngine({ adapters: makeAdapters() });
    const createSpy = vi.spyOn(intentStore, 'createIntent');
    const builder = new IdempotencyKeyBuilder();

    await engine.startRun(makePlanRef(), makeContext('deterministic-run-1'));

    const created = createSpy.mock.calls[0]?.[0];
    expect(created?.intentId).toBe(
      builder.startRunIntentId('t', 'deterministic-run-1', 1, 'temporal')
    );
  });

  it('rejects caller-owned logicalAttemptId at the public boundary', async () => {
    const { engine, intentStore } = createEngine({ adapters: makeAdapters() });
    const createSpy = vi.spyOn(intentStore, 'createIntent');

    await expect(
      engine.startRun(makePlanRef(), {
        ...makeContext('attempted-run-1'),
        logicalAttemptId: 2,
      } as unknown as RunContext)
    ).rejects.toThrow(/Validation failed/);

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('derivation is stable for the same tenantId, runId, attempt, and adapter', () => {
    const builder = new IdempotencyKeyBuilder();
    const first = builder.startRunIntentId('tenant-a', 'run-123', 1, 'temporal');
    const second = builder.startRunIntentId('tenant-a', 'run-123', 1, 'temporal');
    const differentTenant = builder.startRunIntentId('tenant-b', 'run-123', 1, 'temporal');
    const differentAttempt = builder.startRunIntentId('tenant-a', 'run-123', 2, 'temporal');
    const differentAdapter = builder.startRunIntentId('tenant-a', 'run-123', 1, 'conductor');

    expect(first).toBe(second);
    expect(first).not.toBe(differentTenant);
    expect(first).not.toBe(differentAttempt);
    expect(first).not.toBe(differentAdapter);
  });
});
