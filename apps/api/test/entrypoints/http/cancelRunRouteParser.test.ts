import { describe, expect, it } from 'vitest';

import { parseCancelRunRequest } from '../../../src/entrypoints/http/cancelRunRouteParser.js';
import { HTTP_ERROR_REASON } from '../../../src/entrypoints/http/httpErrorReasonCatalog.js';
import { SIGNAL_COMMAND_ACTION } from '../../../src/entrypoints/http/signalRunRouteParser.constants.js';

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
      issue: {
        type: 'forbidden',
        reason: HTTP_ERROR_REASON.missingTenantScope,
        target: 'tenantId',
      },
    });
  });

  it('rejects invalid tenant id', () => {
    const parsed = parseCancelRunRequest({
      runId: 'run-1',
      body: { tenantId: '   ' },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.invalidTenantId,
        target: 'tenantId',
      },
    });
  });

  it('rejects invalid run id', () => {
    const parsed = parseCancelRunRequest({
      runId: '   ',
      body: { tenantId: 'tenant-a' },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.invalidRunId,
        target: 'runId',
      },
    });
  });
});
