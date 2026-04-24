import {
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
  ContractValidationError,
  type RunContext,
} from '@dvt/contracts';
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

    try {
      await engine.startRun(makePlanRef(), {
        ...makeContext('attempted-run-1'),
        logicalAttemptId: 2,
      } as unknown as RunContext);
      throw new Error('Expected ContractValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ContractValidationError);
      expect(error).toMatchObject({
        code: CONTRACTS_ERROR_CODE.CONTRACT_VALIDATION_FAILED,
        messageKey: CONTRACTS_ERROR_MESSAGE_KEY.CONTRACT_VALIDATION_FAILED,
        messageParams: {},
        message: 'Validation failed',
      });
    }

    expect(createSpy).not.toHaveBeenCalled();
  });

  it('derivation is stable for the same tenantId, runId, attempt, and adapter', () => {
    const builder = new IdempotencyKeyBuilder();
    const first = builder.startRunIntentId('tenant-a', 'run-123', 1, 'temporal');
    const second = builder.startRunIntentId('tenant-a', 'run-123', 1, 'temporal');
    const differentTenant = builder.startRunIntentId('tenant-b', 'run-123', 1, 'temporal');
    const differentAttempt = builder.startRunIntentId('tenant-a', 'run-123', 2, 'temporal');
    const withoutAdapter = builder.startRunIntentId('tenant-a', 'run-123', 1);

    expect(first).toBe(second);
    expect(first).not.toBe(differentTenant);
    expect(first).not.toBe(differentAttempt);
    expect(first).not.toBe(withoutAdapter);
  });
});
