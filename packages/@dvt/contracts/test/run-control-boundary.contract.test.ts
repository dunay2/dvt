import { describe, expect, it } from 'vitest';

import {
  RUN_CONTROL_CONTRACT_VERSION,
  SUPPORTED_RUN_SIGNAL_TYPES,
  parseCancelRunReceipt,
  parseRecoverRunReceipt,
  parseRecoverRunRequest,
  parseSignalRunCommand,
  type CancelRunReceipt,
  type RecoverRunReceipt,
} from '../src/index.js';

describe('contracts: RunControl boundary', () => {
  it('keeps generic signal vocabulary separate from cancellation', () => {
    expect(SUPPORTED_RUN_SIGNAL_TYPES).toEqual(['PAUSE', 'RESUME']);
    expect(SUPPORTED_RUN_SIGNAL_TYPES).not.toContain('CANCEL');
  });

  it('uses one version for cancel and recovery receipts', () => {
    const cancelReceipt = {
      contractVersion: RUN_CONTROL_CONTRACT_VERSION,
      runId: 'run-1',
      signalType: 'CANCEL',
      accepted: true,
      disposition: 'requested',
    } satisfies CancelRunReceipt;
    const recoveryReceipt = {
      contractVersion: RUN_CONTROL_CONTRACT_VERSION,
      sourceRunId: 'run-1',
      recoveryRunId: 'run-2',
      accepted: true,
    } satisfies RecoverRunReceipt;

    expect(cancelReceipt.contractVersion).toBe('v1');
    expect(recoveryReceipt.contractVersion).toBe('v1');
  });

  it('rejects cancellation through the generic signal command', () => {
    expect(() => parseSignalRunCommand({ runId: 'run-1', signalType: 'CANCEL' })).toThrow(
      'INVALID_RUN_CONTROL_PAYLOAD'
    );
  });

  it('rejects caller-owned recovery fields and self-recovery identities', () => {
    expect(() =>
      parseRecoverRunRequest({
        sourceRunId: 'run-1',
        recoveryRunId: 'run-2',
        planRef: { planId: 'caller-owned' },
      })
    ).toThrow('INVALID_RUN_CONTROL_PAYLOAD');
    expect(() => parseRecoverRunRequest({ sourceRunId: 'run-1', recoveryRunId: 'run-1' })).toThrow(
      'INVALID_RUN_CONTROL_PAYLOAD'
    );
  });

  it('parses versioned control receipts and rejects partial payloads', () => {
    expect(
      parseCancelRunReceipt({
        contractVersion: 'v1',
        runId: 'run-1',
        signalType: 'CANCEL',
        accepted: true,
        disposition: 'requested',
      })
    ).toMatchObject({ runId: 'run-1', disposition: 'requested' });
    expect(
      parseRecoverRunReceipt({
        contractVersion: 'v1',
        sourceRunId: 'run-1',
        recoveryRunId: 'run-2',
        accepted: true,
      })
    ).toMatchObject({ sourceRunId: 'run-1', recoveryRunId: 'run-2' });
    expect(() => parseCancelRunReceipt({ contractVersion: 'v1', runId: 'run-1' })).toThrow(
      'RUN_CONTROL_RESPONSE_INVALID'
    );
  });
});
