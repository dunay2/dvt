// Helpers to create branded types for tests
const asTenantId = (s: string) => s as import('../../src/contracts/types').TenantId;
const asPlanId = (s: string) => s as import('../../src/contracts/types').PlanId;
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/contracts/validation/withValidation', () => ({
  validateExecutionPlan: vi.fn(),
}));

import type { IWorkflowEngineAdapter } from '../../src/adapters/IWorkflowEngineAdapter.v1';
import { createValidatingAdapter } from '../../src/adapters/validatingAdapter';
import { ValidationException } from '../../src/contracts/validation/validationErrors';
import { validateExecutionPlan } from '../../src/contracts/validation/withValidation';

describe('ValidatingAdapter (MVP)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('delegates a valid plan to underlying adapter when validation succeeds', async () => {
    const rawPlan: unknown = { something: 'raw' };
    const validatedPlan = { something: 'validated' };

    const mockedValidate = vi.mocked(validateExecutionPlan);
    mockedValidate.mockImplementationOnce(() => validatedPlan as never);

    const mockAdapter: Pick<IWorkflowEngineAdapter, 'createRun'> = {
      createRun: vi.fn(async () => ({ runId: 'r1', status: 'started' }) as never),
    };

    const adapter = createValidatingAdapter(mockAdapter as unknown as IWorkflowEngineAdapter);

    const res = await adapter.createRun(asTenantId('tenant'), asPlanId('planId'), rawPlan);

    expect(mockedValidate).toHaveBeenCalledWith(rawPlan);
    expect(mockAdapter.createRun).toHaveBeenCalledTimes(1);
    expect(mockAdapter.createRun).toHaveBeenCalledWith('tenant', 'planId', validatedPlan);
    expect(res).toHaveProperty('runId', 'r1');
  });

  it('throws ValidationException and does not call adapter on invalid plan', async () => {
    const rawPlan: unknown = { bad: true };

    const mockedValidate = vi.mocked(validateExecutionPlan);
    mockedValidate.mockImplementationOnce(() => {
      throw new ValidationException({
        errorCode: 'PLAN_INTEGRITY_VALIDATION_FAILED',
        message: 'Invalid execution plan payload',
        issues: [],
      });
    });

    const mockAdapter: Pick<IWorkflowEngineAdapter, 'createRun'> = {
      createRun: vi.fn(async () => ({ runId: 'should-not', status: 'started' }) as never),
    };

    const adapter = createValidatingAdapter(mockAdapter as unknown as IWorkflowEngineAdapter);

    await expect(
      adapter.createRun(asTenantId('tenant'), asPlanId('planId'), rawPlan)
    ).rejects.toBeInstanceOf(ValidationException);

    expect(mockedValidate).toHaveBeenCalledWith(rawPlan);
    expect(mockAdapter.createRun).not.toHaveBeenCalled();
  });
});
