import { describe, expect, it } from 'vitest';

import {
  parseSignalRunRequest,
  SIGNAL_ROUTE_COMPATIBILITY_POLICY,
  SIGNAL_COMMAND_ACTION,
  SIGNAL_RUN_PARSE_ERROR_CODE,
} from '../../../src/entrypoints/http/signalRunRouteParser.js';

describe('parseSignalRunRequest', () => {
  it('supports custom open-set parse error codes', () => {
    const customCodes = {
      INVALID_RUN_ID: 'RUN_ID_BAD_CUSTOM',
      INVALID_BODY: 'BODY_BAD_CUSTOM',
      INVALID_SIGNAL_TYPE: 'SIGNAL_TYPE_BAD_CUSTOM',
      MISSING_TENANT_SCOPE: 'TENANT_SCOPE_MISSING_CUSTOM',
      INVALID_TENANT_ID: 'TENANT_ID_BAD_CUSTOM',
    } as const;

    const missingTenant = parseSignalRunRequest(
      {
        runId: 'run-1',
        body: { signalType: 'CANCEL' },
        compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
      },
      customCodes
    );

    const invalidSignal = parseSignalRunRequest(
      {
        runId: 'run-1',
        body: { tenantId: 'tenant-a', signalType: 'FAST_FORWARD' },
        compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
      },
      customCodes
    );

    expect(missingTenant).toEqual({
      ok: false,
      status: 403,
      body: { error: 'FORBIDDEN', code: 'TENANT_SCOPE_MISSING_CUSTOM' },
    });
    expect(invalidSignal).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: 'SIGNAL_TYPE_BAD_CUSTOM' },
    });
  });

  it('rejects CANCEL signal when compatibility policy disables it', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', signalType: 'CANCEL' },
      compatibilityPolicy: { allowCancelSignalType: false },
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_SIGNAL_TYPE },
    });
  });

  it('maps CANCEL to run:cancel authorization action', () => {
    const parsed = parseSignalRunRequest({
      runId: ' run-1 ',
      body: { tenantId: ' tenant-a ', signalType: ' cancel ', reason: ' operator ' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
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

  it('maps PAUSE to run:signal authorization action', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', signalType: 'PAUSE' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
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
          actionName: SIGNAL_COMMAND_ACTION.SIGNAL,
        },
      },
    });
  });

  it('rejects missing tenant scope', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { signalType: 'CANCEL' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      status: 403,
      body: { error: 'FORBIDDEN', code: SIGNAL_RUN_PARSE_ERROR_CODE.MISSING_TENANT_SCOPE },
    });
  });

  it('rejects an invalid tenant id payload as bad request', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: '   ', signalType: 'CANCEL' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID },
    });
  });

  it('rejects tenantId with invalid type as bad request', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 123, signalType: 'CANCEL' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_TENANT_ID },
    });
  });

  it('rejects missing runId', () => {
    const parsed = parseSignalRunRequest({
      runId: '   ',
      body: { tenantId: 'tenant-a', signalType: 'CANCEL' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_RUN_ID },
    });
  });

  it('rejects non-object body', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: 'retry',
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_BODY },
    });
  });

  it('rejects unsupported signal vocabulary', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', signalType: 'FAST_FORWARD' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: SIGNAL_RUN_PARSE_ERROR_CODE.INVALID_SIGNAL_TYPE },
    });
  });
});
