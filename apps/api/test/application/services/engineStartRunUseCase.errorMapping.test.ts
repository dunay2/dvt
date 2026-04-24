import {
  AdapterNotRegisteredError,
  OutboxRateLimitExceededError,
  RunExecutionContextRejectedError,
  RunAlreadyExistsError,
  UnsupportedPlanVersionError,
} from '@dvt/engine';
import { describe, expect, it } from 'vitest';

import { EngineStartRunUseCase } from '../../../src/application/services/engineStartRunUseCase.js';

import {
  buildAuthorizedContext,
  buildStartRunCommand,
} from './engineStartRunUseCase.test.support.js';

describe('EngineStartRunUseCase error mapping', () => {
  it('maps AdapterNotRegisteredError to typed engine error result', async () => {
    const useCase = new EngineStartRunUseCase({
      async startRun() {
        throw new AdapterNotRegisteredError('temporal');
      },
    } as never);

    await expect(useCase.execute(buildStartRunCommand(), buildAuthorizedContext())).resolves.toEqual({
      ok: false,
      error: {
        kind: 'adapter_not_registered',
        adapter: 'temporal',
      },
    });
  });

  it('maps UnsupportedPlanVersionError to typed engine error result', async () => {
    const useCase = new EngineStartRunUseCase({
      async startRun() {
        throw new UnsupportedPlanVersionError({
          planVersion: '9.0',
          supportedVersions: ['1.0'],
        });
      },
    } as never);

    await expect(useCase.execute(buildStartRunCommand(), buildAuthorizedContext())).resolves.toEqual({
      ok: false,
      error: {
        kind: 'unsupported_plan_version',
        planVersion: '9.0',
        supportedVersions: ['1.0'],
      },
    });
  });

  it.each([
    {
      description: 'maps RunAlreadyExistsError to duplicate run result',
      buildError: () => new RunAlreadyExistsError('run-test-1'),
      expected: {
        ok: true,
        value: {
          kind: 'duplicate',
          runId: 'run-test-1',
          accepted: true,
          duplicateOf: 'run',
        },
      },
    },
    {
      description: 'maps INTENT_ACTIVE_CONFLICT to duplicate intent result',
      buildError: () =>
        Object.assign(new Error('intent conflict'), { code: 'INTENT_ACTIVE_CONFLICT' }),
      expected: {
        ok: true,
        value: {
          kind: 'duplicate',
          runId: 'run-test-1',
          accepted: true,
          duplicateOf: 'intent',
        },
      },
    },
  ])('$description', async ({ buildError, expected }) => {
    const useCase = new EngineStartRunUseCase({
      async startRun() {
        throw buildError();
      },
    } as never);

    await expect(useCase.execute(buildStartRunCommand(), buildAuthorizedContext())).resolves.toEqual(
      expected
    );
  });

  it('maps OutboxRateLimitExceededError to rate-limited result', async () => {
    const useCase = new EngineStartRunUseCase({
      async startRun() {
        throw new OutboxRateLimitExceededError('tenant-1');
      },
    } as never);

    await expect(useCase.execute(buildStartRunCommand(), buildAuthorizedContext())).resolves.toEqual({
      ok: true,
      value: {
        kind: 'rate_limited',
        accepted: false,
        code: 'OUTBOX_RATE_LIMIT_EXCEEDED',
      },
    });
  });

  it('maps RunExecutionContextRejectedError to plan_rejected result', async () => {
    const useCase = new EngineStartRunUseCase({
      async startRun() {
        throw new RunExecutionContextRejectedError('tenant mismatch');
      },
    } as never);

    await expect(useCase.execute(buildStartRunCommand(), buildAuthorizedContext())).resolves.toEqual({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        code: 'REJECTED',
        reason: 'engine.error.run_execution_context_rejected',
        cause: 'run_execution_context',
      },
    });
  });

  it('rethrows unexpected engine errors', async () => {
    const useCase = new EngineStartRunUseCase({
      async startRun() {
        throw new Error('engine unavailable');
      },
    } as never);

    await expect(() =>
      useCase.execute(buildStartRunCommand(), buildAuthorizedContext())
    ).rejects.toThrow(/engine unavailable/);
  });
});
