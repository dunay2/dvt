import { describe, expect, it, vi } from 'vitest';

import {
  buildStartRunAuthorizedFacade,
  START_RUN_FACADE_INPUT,
} from './startRunAuthorizedFacade.test.support.js';

describe('StartRunAuthorizedFacade auth and success outcomes', () => {
  it('returns unauthenticated as ok=true value and does not call use case', async () => {
    const telemetry = { recordStartRunLatency: vi.fn() };
    const execute = vi.fn(async () => {
      throw new Error('should not be called');
    });
    const facade = buildStartRunAuthorizedFacade({
      authenticator: {
        async authenticateBearerToken() {
          return { ok: false as const, code: 'MISSING_TOKEN' as const };
        },
      } as never,
      useCase: { execute } as never,
      telemetry: telemetry as never,
    });

    const result = await facade.execute(START_RUN_FACADE_INPUT);
    expect(result).toEqual({
      ok: true,
      value: { kind: 'unauthenticated', code: 'MISSING_TOKEN' },
    });
    expect(execute).not.toHaveBeenCalled();
    expect(telemetry.recordStartRunLatency).toHaveBeenCalledTimes(1);
    expect(telemetry.recordStartRunLatency.mock.calls[0]?.[1]).toBe('unauthenticated');
  });

  it('returns unauthorized as ok=true value and does not call use case', async () => {
    const execute = vi.fn(async () => {
      throw new Error('should not be called');
    });
    const facade = buildStartRunAuthorizedFacade({
      authorizer: {
        async authorize() {
          return { ok: false as const, reason: 'TENANT_NOT_GRANTED' as const };
        },
      } as never,
      useCase: { execute } as never,
    });

    const result = await facade.execute(START_RUN_FACADE_INPUT);
    expect(result).toEqual({
      ok: true,
      value: { kind: 'unauthorized', reason: 'TENANT_NOT_GRANTED' },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('returns accepted when auth and use case succeed', async () => {
    const telemetry = { recordStartRunLatency: vi.fn() };
    const facade = buildStartRunAuthorizedFacade({
      telemetry: telemetry as never,
    });

    const result = await facade.execute(START_RUN_FACADE_INPUT);
    expect(result).toEqual({
      ok: true,
      value: { kind: 'accepted', runId: 'run-1', accepted: true },
    });
    expect(telemetry.recordStartRunLatency).toHaveBeenCalledTimes(1);
    expect(telemetry.recordStartRunLatency.mock.calls[0]?.[1]).toBe('accepted');
  });

  it('preserves duplicate result from the use case', async () => {
    const facade = buildStartRunAuthorizedFacade({
      useCase: {
        async execute() {
          return {
            ok: true as const,
            value: {
              kind: 'duplicate' as const,
              runId: 'run-1',
              accepted: true,
              duplicateOf: 'intent' as const,
            },
          };
        },
      } as never,
    });

    const result = await facade.execute(START_RUN_FACADE_INPUT);
    expect(result).toEqual({
      ok: true,
      value: {
        kind: 'duplicate',
        runId: 'run-1',
        accepted: true,
        duplicateOf: 'intent',
      },
    });
  });
});
