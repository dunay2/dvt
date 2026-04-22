import { describe, expect, it, vi } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunEngineError.js';

import {
  buildStartRunAuthorizedFacade,
  START_RUN_FACADE_INPUT,
} from './startRunAuthorizedFacade.test.support.js';

describe('StartRunAuthorizedFacade engine-error passthrough', () => {
  it('passes through adapter_not_registered engine error', async () => {
    const facade = buildStartRunAuthorizedFacade({
      useCase: {
        async execute() {
          return {
            ok: false as const,
            error: { kind: 'adapter_not_registered' as const, adapter: 'temporal' },
          };
        },
      } as never,
    });

    await expect(facade.execute(START_RUN_FACADE_INPUT)).resolves.toEqual({
      ok: false,
      error: { kind: 'adapter_not_registered', adapter: 'temporal' },
    });
  });

  it('passes through unsupported_plan_version engine error', async () => {
    const facade = buildStartRunAuthorizedFacade({
      useCase: {
        async execute() {
          return {
            ok: false as const,
            error: {
              kind: 'unsupported_plan_version' as const,
              planVersion: '2.7',
              supportedVersions: ['1.0'] as const,
            },
          };
        },
      } as never,
    });

    await expect(facade.execute(START_RUN_FACADE_INPUT)).resolves.toEqual({
      ok: false,
      error: {
        kind: 'unsupported_plan_version',
        planVersion: '2.7',
        supportedVersions: ['1.0'],
      },
    });
  });

  it('passes through command_invalid engine error', async () => {
    const facade = buildStartRunAuthorizedFacade({
      useCase: {
        async execute() {
          return {
            ok: false as const,
            error: {
              kind: 'command_invalid' as const,
              code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
              reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
            },
          };
        },
      } as never,
    });

    await expect(facade.execute(START_RUN_FACADE_INPUT)).resolves.toEqual({
      ok: false,
      error: {
        kind: 'command_invalid',
        code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
        reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
      },
    });
  });

  it('rethrows unrelated use case errors', async () => {
    const telemetry = { recordStartRunLatency: vi.fn() };
    const facade = buildStartRunAuthorizedFacade({
      useCase: {
        async execute() {
          throw new Error('engine unavailable');
        },
      } as never,
      telemetry: telemetry as never,
    });

    await expect(() => facade.execute(START_RUN_FACADE_INPUT)).rejects.toThrow(/engine unavailable/);
    expect(telemetry.recordStartRunLatency).toHaveBeenCalledTimes(1);
    expect(telemetry.recordStartRunLatency.mock.calls[0]?.[1]).toBe('exception');
  });
});
