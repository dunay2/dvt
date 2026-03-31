import { describe, expect, it } from 'vitest';

import {
  parseSignalRunRequest,
  SIGNAL_ROUTE_COMPATIBILITY_POLICY,
  SIGNAL_COMMAND_ACTION,
} from '../../../src/entrypoints/http/signalRunRouteParser.js';

describe('parseSignalRunRequest', () => {
  it('rejects CANCEL signal when compatibility policy disables it', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 'tenant-a', signalType: 'CANCEL' },
      compatibilityPolicy: { allowCancelSignalType: false },
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_signal_type',
        target: 'signalType',
      },
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
      issue: {
        type: 'forbidden',
        reason: 'missing_tenant_scope',
        target: 'tenantId',
      },
    });
  });

  it('rejects an invalid tenant id payload as bad_request', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: '   ', signalType: 'CANCEL' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_tenant_id',
        target: 'tenantId',
      },
    });
  });

  it('rejects tenantId with invalid type as bad_request', () => {
    const parsed = parseSignalRunRequest({
      runId: 'run-1',
      body: { tenantId: 123, signalType: 'CANCEL' },
      compatibilityPolicy: SIGNAL_ROUTE_COMPATIBILITY_POLICY,
    });

    expect(parsed).toEqual({
      ok: false,
      issue: {
        type: 'bad_request',
        reason: 'invalid_tenant_id',
        target: 'tenantId',
      },
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
      issue: {
        type: 'bad_request',
        reason: 'invalid_run_id',
        target: 'runId',
      },
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
      issue: {
        type: 'bad_request',
        reason: 'invalid_body',
      },
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
      issue: {
        type: 'bad_request',
        reason: 'invalid_signal_type',
        target: 'signalType',
      },
    });
  });
});
