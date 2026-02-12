import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IWorkflowEngineAdapter } from '../../src/adapters/IWorkflowEngineAdapter.v1';
import { createValidatingAdapter } from '../../src/adapters/validatingAdapter';
import type { ExecutionPlan } from '../../src/contracts/schemas';
import type { TenantId, PlanId } from '../../src/contracts/types';
import { ValidationException } from '../../src/contracts/validation/validationErrors';
import { validateExecutionPlan } from '../../src/contracts/validation/withValidation';

vi.mock('../../src/contracts/validation/withValidation', () => ({
  validateExecutionPlan: vi.fn(),
}));

const asTenantId = (s: string): TenantId => s as TenantId;
const asPlanId = (s: string): PlanId => s as PlanId;

describe('ValidatingAdapter (MVP)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('delegates a valid plan to underlying adapter when validation succeeds', async () => {
    const rawPlan: Record<string, unknown> = { something: 'raw' };
    const validatedPlan = { something: 'validated' } as unknown as ExecutionPlan;
    const mockedValidate = vi.mocked(validateExecutionPlan);
    mockedValidate.mockReturnValueOnce(validatedPlan);
    const mockAdapter: Pick<IWorkflowEngineAdapter, 'createRun'> = {
      createRun: vi.fn(async () => ({ runId: 'r1', status: 'started' }) as never),
    };
    const adapter = createValidatingAdapter(mockAdapter as unknown as IWorkflowEngineAdapter);
    const res = await adapter.createRun(asTenantId('tenant'), asPlanId('planId'), rawPlan);
    expect(mockedValidate).toHaveBeenCalledWith(rawPlan);
    expect(mockAdapter.createRun).toHaveBeenCalledTimes(1);
    expect(mockAdapter.createRun).toHaveBeenCalledWith(
      asTenantId('tenant'),
      asPlanId('planId'),
      validatedPlan
    );
    expect(res).toHaveProperty('runId', 'r1');
  });

  it('throws ValidationException and does not call adapter on invalid plan', async () => {
    const invalidPlan: Record<string, unknown> = { bad: true };
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
      adapter.createRun(asTenantId('tenant'), asPlanId('planId'), invalidPlan)
    ).rejects.toBeInstanceOf(ValidationException);
    expect(mockedValidate).toHaveBeenCalledWith(invalidPlan);
    expect(mockAdapter.createRun).not.toHaveBeenCalled();
  });
});
