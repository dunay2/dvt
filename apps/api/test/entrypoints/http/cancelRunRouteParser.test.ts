import { describe, expect, it } from 'vitest';

import {
  parseCancelRunRequest,
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
} from '../../../src/entrypoints/http/cancelRunRouteParser.js';

describe('parseCancelRunRequest', () => {
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
