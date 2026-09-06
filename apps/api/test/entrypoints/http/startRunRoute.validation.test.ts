import { describe, expect, it } from 'vitest';

import {
  httpError,
  invokeStartRunRoute,
  VALID_BODY,
  VALID_PLAN_REF,
} from './startRunRoute.test.support.js';

const REJECTING_USE_CASE = {
  async execute() {
    throw new Error('should not be called');
  },
};

describe('startRunRoute validation', () => {
  const invalidParseCases = [
    {
      description: 'returns 400 when tenantId is missing',
      request: {
        id: 'req-missing-tenant',
        body: {
          projectId: 'p1',
          environmentId: 'e1',
          selection: { mode: 'explicit', nodeIds: ['model_a'] },
        },
      },
      expectedPayload: httpError('bad_request', 'missing_tenant_id', { target: 'tenantId' }),
    },
    {
      description: 'returns 400 on malformed tenantId',
      request: {
        id: 'req-invalid-tenant',
        body: {
          ...VALID_BODY,
          tenantId: '   ',
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_tenant_id', { target: 'tenantId' }),
    },
    {
      description: 'returns 400 when body is missing',
      request: {
        id: 'req-invalid-body',
        body: undefined,
      },
      expectedPayload: httpError('bad_request', 'invalid_body'),
    },
    {
      description: 'returns 400 on non-string selection items',
      request: {
        id: 'req-invalid-selection-type',
        body: {
          ...VALID_BODY,
          selection: { mode: 'explicit', nodeIds: [123] },
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_selection', { target: 'selection' }),
    },
    {
      description: 'returns 400 on whitespace-only selection entries',
      request: {
        id: 'req-invalid-selection-blank',
        body: {
          ...VALID_BODY,
          selection: { mode: 'explicit', nodeIds: ['   '] },
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_selection', { target: 'selection' }),
    },
    {
      description: 'returns 400 when client supplies runId',
      request: {
        id: 'req-client-run-id',
        body: {
          ...VALID_BODY,
          runId: 'client-run-id',
        },
      },
      expectedPayload: httpError('bad_request', 'client_run_id_not_allowed', {
        target: 'runId',
      }),
    },
    {
      description: 'returns 400 on blank planRef fields',
      request: {
        id: 'req-invalid-plan-ref-field',
        body: {
          ...VALID_BODY,
          planRef: {
            ...VALID_PLAN_REF,
            uri: '   ',
          },
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_plan_ref', { target: 'planRef' }),
    },
    {
      description: 'returns 400 on invalid planRef shape',
      request: {
        id: 'req-invalid-plan-ref-shape',
        body: {
          ...VALID_BODY,
          planRef: ['not-an-object'],
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_plan_ref', { target: 'planRef' }),
    },
    {
      description: 'rejects non-canonical surrounding whitespace on planRef fields',
      request: {
        id: 'req-whitespace-boundary',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          planRef: {
            uri: ' https://plans.example.com/plan-2.json ',
            sha256: ' ' + 'a'.repeat(64) + ' ',
            schemaVersion: ' 1.0.0 ',
            planId: ' plan-2 ',
            planVersion: ' 1.0 ',
          },
          targetAdapter: 'temporal',
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_plan_ref', { target: 'planRef' }),
    },
    {
      description: 'returns 400 on selection entries with surrounding whitespace',
      request: {
        id: 'req-selection-whitespace',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          selection: { mode: 'explicit', nodeIds: [' model_a '] },
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_selection', { target: 'selection' }),
    },
    {
      description: 'returns 400 on targetAdapter with surrounding whitespace',
      request: {
        id: 'req-target-adapter-whitespace',
        headers: { authorization: 'Bearer token' },
        body: {
          ...VALID_BODY,
          targetAdapter: ' mock ',
        },
      },
      expectedPayload: httpError('bad_request', 'invalid_target_adapter', {
        target: 'targetAdapter',
      }),
    },
  ] as const;

  it.each(invalidParseCases)('$description', async ({ request, expectedPayload }) => {
    const { reply } = await invokeStartRunRoute({
      request,
      useCase: REJECTING_USE_CASE,
    });

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual(expectedPayload);
  });

  it('returns 400 when the platform run-id generator violates the governed run_<UUIDv7> shape', async () => {
    const { reply } = await invokeStartRunRoute({
      useCase: REJECTING_USE_CASE,
      runIdGenerator: () => 'run_generated_test',
    });

    expect(reply.statusCode).toBe(400);
    expect(reply.payload).toEqual(httpError('bad_request', 'invalid_run_id', { target: 'runId' }));
  });
});
