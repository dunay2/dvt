import { describe, expect, it } from 'vitest';

import {
  RUN_CONTROL_CONTRACT_VERSION,
  SUPPORTED_RUN_SIGNAL_TYPES,
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
});
