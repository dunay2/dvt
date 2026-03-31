import { describe, expect, it } from 'vitest';

import { parseCancelRunRequest } from '../../../src/entrypoints/http/cancelRunRouteParser.js';
import {
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
} from '../../../src/entrypoints/http/signalRunRouteParser.constants.js';

describe('parseCancelRunRequest', () => {
  it('supports custom open-set parse error codes', () => {
    const customCodes = {
      INVALID_RUN_ID: 'RUN_ID_BAD_CUSTOM',
      INVALID_BODY: 'BODY_BAD_CUSTOM',
      MISSING_TENANT_SCOPE: 'TENANT_SCOPE_MISSING_CUSTOM',
      INVALID_TENANT_ID: 'TENANT_ID_BAD_CUSTOM',
    } as const;

    const missingTenant = parseCancelRunRequest(
      {
        runId: 'run-1',
        body: {},
      },
      customCodes
    );

    const invalidRunId = parseCancelRunRequest(
      {
        runId: '   ',
        body: { tenantId: 'tenant-a' },
      },
      customCodes
    );

    const invalidBody = parseCancelRunRequest(
      {
        runId: 'run-1',
        body: 'not-an-object',
      },
      customCodes
    );

    const invalidTenant = parseCancelRunRequest(
      {
        runId: 'run-1',
        body: { tenantId: '   ' },
      },
      customCodes
    );

    expect(missingTenant).toEqual({
      ok: false,
      status: 403,
      body: { error: 'FORBIDDEN', code: 'TENANT_SCOPE_MISSING_CUSTOM' },
    });
    expect(invalidRunId).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: 'RUN_ID_BAD_CUSTOM' },
    });
    expect(invalidBody).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: 'BODY_BAD_CUSTOM' },
    });
    expect(invalidTenant).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: 'TENANT_ID_BAD_CUSTOM' },
    });
  });

  it('maps cancel request to run:cancel action and CANCEL signal', () => {
    const parsed = parseCancelRunRequest({
      runId: ' run-1 ',
      body: { tenantId: ' tenant-a ', reason: ' operator ' },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          runId: 'run-1',
          signalType: 'CANCEL',
          reason: 'operator',
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: SIGNAL_COMMAND_ACTION.CANCEL,
        },
      },
    });
  });

  it('omits reason when provided as whitespace only', () => {
    const parsed = parseCancelRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', reason: '   ' },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          runId: 'run-1',
          signalType: 'CANCEL',
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: SIGNAL_COMMAND_ACTION.CANCEL,
        },
      },
    });
  });

  it('rejects missing tenant scope', () => {
    const parsed = parseCancelRunRequest({
      runId: 'run-1',
      body: {},
    });

    expect(parsed).toEqual({
      ok: false,
      status: 403,
      body: { error: 'FORBIDDEN', code: SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE },
    });
  });

  it('rejects invalid tenant id', () => {
    const parsed = parseCancelRunRequest({
      runId: 'run-1',
      body: { tenantId: '   ' },
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID },
    });
  });

  it('rejects invalid run id', () => {
    const parsed = parseCancelRunRequest({
      runId: '   ',
      body: { tenantId: 'tenant-a' },
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_RUN_ID },
    });
  });
});
