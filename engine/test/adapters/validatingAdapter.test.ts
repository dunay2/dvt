import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError, type ZodIssue } from 'zod';

vi.mock('../../src/contracts/schemas', () => ({
  parseExecutionPlan: vi.fn(),
}));

import { createValidatingAdapter } from '../../src/adapters/validatingAdapter';
import { parseExecutionPlan } from '../../src/contracts/schemas';
import { ValidationException } from '../../src/contracts/validation/validationErrors';

describe('ValidatingAdapter (MVP)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('delegates to underlying adapter when validation succeeds', async () => {
    const rawPlan: unknown = { something: 'raw' };
    const validatedPlan = { something: 'validated' };

    // @ts-ignore
    (parseExecutionPlan as any).mockImplementationOnce(() => validatedPlan);

    type EngineRunRef = { runId: string; status: string };
    interface AdapterLike {
      startRun(plan: unknown): Promise<EngineRunRef>;
    }

    const mockAdapter: AdapterLike = {
      startRun: vi.fn(async (_plan: unknown) => ({ runId: 'r1', status: 'started' })),
    };

    const adapter = createValidatingAdapter(mockAdapter as any);

    const res = await adapter.startRun(rawPlan);

    expect(mockAdapter.startRun as any).toHaveBeenCalledTimes(1);
    expect(mockAdapter.startRun as any).toHaveBeenCalledWith(validatedPlan);
    expect(res).toHaveProperty('runId', 'r1');
  });

  it('throws ValidationException and does not call adapter on invalid plan', async () => {
    const rawPlan: unknown = { bad: true };

    const issues: ZodIssue[] = [
      {
        code: 'invalid_type',
        path: ['steps', 0, 'id'],
        message: 'Required',
      } as unknown as ZodIssue,
    ];

    // @ts-ignore
    (parseExecutionPlan as any).mockImplementationOnce(() => {
      throw new ZodError(issues as any);
    });

    type EngineRunRef = { runId: string; status: string };
    interface AdapterLike {
      startRun(plan: unknown): Promise<EngineRunRef>;
    }

    const mockAdapter: AdapterLike = {
      startRun: vi.fn(async (_plan: unknown) => ({ runId: 'should-not', status: 'started' })),
    };

    const adapter = createValidatingAdapter(mockAdapter as any);

    await expect(adapter.startRun(rawPlan)).rejects.toBeInstanceOf(ValidationException);
    expect(mockAdapter.startRun as any).not.toHaveBeenCalled();
  });
});
