import { describe, expect, it } from 'vitest';

import {
  START_RUN_ENGINE_ERROR_CODE,
  START_RUN_ENGINE_ERROR_REASON,
} from '../../../src/application/ports/startRunEngineError.js';

import {
  errorResult,
  httpError,
  invokeStartRunRoute,
  registryWith,
  VALID_BODY,
} from './startRunRoute.test.support.js';

describe('startRunRoute engine error translation', () => {
  it('returns 422 when engine reports adapter_not_registered', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-adapter-missing',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          targetAdapter: 'temporal',
        },
      },
      facade: {
        async execute() {
          return errorResult({ kind: 'adapter_not_registered' as const, adapter: 'temporal' });
        },
      },
    });

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual(
      httpError('unprocessable', 'adapter_not_configured', { details: { adapter: 'temporal' } })
    );
  });

  it('returns 400 when target adapter is not available in runtime registry', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-adapter-unavailable',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          targetAdapter: 'temporal',
        },
      },
      facade: {
        async execute() {
          throw new Error('should not be called');
        },
      },
      registry: registryWith('mock'),
    });

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual(
      httpError('bad_request', 'invalid_target_adapter', { target: 'targetAdapter' })
    );
  });

  it('returns 422 plan_rejected when engine reports command_invalid', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-command-invalid',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
        },
      },
      facade: {
        async execute() {
          return errorResult({
            kind: 'command_invalid' as const,
            code: START_RUN_ENGINE_ERROR_CODE.planRefRequired,
            reason: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
          });
        },
      },
    });

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual(
      httpError('unprocessable', 'plan_rejected', {
        details: {
          message: START_RUN_ENGINE_ERROR_REASON.planRefRequired,
          cause: 'plan_ref_required',
        },
      })
    );
  });

  it('returns 422 plan_rejected when engine reports unsupported_plan_version', async () => {
    const { reply } = await invokeStartRunRoute({
      request: {
        id: 'req-unsupported-plan-version',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
        },
      },
      facade: {
        async execute() {
          return errorResult({
            kind: 'unsupported_plan_version' as const,
            planVersion: '2.7',
            supportedVersions: ['1.0'] as const,
          });
        },
      },
    });

    expect(reply.statusCode).toBe(422);
    expect(reply.payload).toEqual(
      httpError('unprocessable', 'unsupported_plan_version', {
        details: {
          message: 'Unsupported plan version: 2.7',
          supportedVersions: ['1.0'],
        },
      })
    );
  });
});
