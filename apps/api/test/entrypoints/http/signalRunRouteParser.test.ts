import { describe, expect, it } from 'vitest';

import { HTTP_ERROR_REASON } from '../../../src/entrypoints/http/httpErrorReasonCatalog.js';
import { RUN_COMMAND_ACTION } from '../../../src/entrypoints/http/runCommandRoute.constants.js';
import { parseSignalRunRequest } from '../../../src/entrypoints/http/signalRunRouteParser.js';

describe('parseSignalRunRequest', () => {
  it('rejects CANCEL because cancellation has a dedicated command route', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', signalType: 'CANCEL' },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.invalidSignalType,
        target: 'signalType',
      },
    });
  });

  it('maps PAUSE to run:signal authorization action', () => {
    const parsed = parseSignalRunRequest({
      runId: ' run-1 ',
      body: { tenantId: ' tenant-a ', signalType: ' pause ' },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          runId: 'run-1',
          signalType: 'PAUSE',
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: RUN_COMMAND_ACTION.SIGNAL,
        },
      },
    });
  });

  it('accepts an optional reason for RESUME', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', signalType: 'RESUME', reason: 'operator' },
    });

    expect(parsed).toEqual({
      ok: true,
      value: {
        command: {
          runId: 'run-1',
          signalType: 'RESUME',
          reason: 'operator',
        },
        authorization: {
          tenantId: { value: 'tenant-a' },
          actionName: RUN_COMMAND_ACTION.SIGNAL,
        },
      },
    });
  });

  it('rejects missing tenant scope', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { signalType: 'PAUSE' },
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

  it('rejects an invalid tenant id payload as bad request', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: '   ', signalType: 'PAUSE' },
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

  it('rejects tenantId with invalid type as bad request', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 123, signalType: 'PAUSE' },
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

  it('rejects missing runId', () => {
    const parsed = parseSignalRunRequest({
      runId: '   ',
      body: { tenantId: 'tenant-a', signalType: 'PAUSE' },
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

  it('rejects non-object body', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: 'retry',
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.invalidBody,
      },
    });
  });

  it('rejects unsupported signal vocabulary', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', signalType: 'FAST_FORWARD' },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: HTTP_ERROR_REASON.invalidSignalType,
        target: 'signalType',
      },
    });
  });
});
