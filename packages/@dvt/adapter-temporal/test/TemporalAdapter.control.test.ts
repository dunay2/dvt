import { CURRENT_SIGNAL_SEMANTICS_VERSION, WorkflowSignals } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { TemporalAdapter } from '../src/TemporalAdapter.js';

import {
  createTemporalAdapterConfig,
  createTemporalRunRef,
  nb,
} from './helpers/contractFixtures.js';

const BASE_CONFIG = createTemporalAdapterConfig();

const BASE_RUN_REF = createTemporalRunRef({
  tenantId: 'tenant-1',
  namespace: 'dvt-test',
  workflowId: 'run-1',
  runId: 'run-1',
  taskQueue: 'q-main-tenant-1',
});

function makeAdapter(): {
  adapter: TemporalAdapter;
  workflowClient: {
    start: ReturnType<typeof vi.fn>;
    getHandle: ReturnType<typeof vi.fn>;
  };
} {
  const workflowClient = {
    start: vi.fn(async () => ({
      workflowId: 'run-1',
      firstExecutionRunId: 'temporal-run-1',
    })),
    getHandle: vi.fn(),
  };

  const adapter = new TemporalAdapter({
    workflowClient,
    config: BASE_CONFIG,
  });

  return { adapter, workflowClient };
}

async function expectSignalDispatch(args: {
  request: {
    signalId: ReturnType<typeof nb>;
    type: 'PAUSE' | 'RESUME' | 'CANCEL';
    reason?: string;
  };
  expectedSignalName: (typeof WorkflowSignals)[keyof typeof WorkflowSignals];
  expectedArguments: ReadonlyArray<string | undefined>;
}): Promise<void> {
  const signal = vi.fn(async () => undefined);
  const { adapter, workflowClient } = makeAdapter();
  workflowClient.getHandle.mockReturnValue({ signal });

  await adapter.signal(BASE_RUN_REF, args.request);

  expect(signal).toHaveBeenCalledWith(args.expectedSignalName, ...args.expectedArguments);
}

describe('TemporalAdapter.signal', () => {
  it('declares support for the current signal semantics version', () => {
    const { adapter } = makeAdapter();

    expect(adapter.signalSemanticsVersions?.()).toEqual([CURRENT_SIGNAL_SEMANTICS_VERSION]);
  });

  it('forwards PAUSE with the caller-provided signalId', async () => {
    await expectSignalDispatch({
      request: { signalId: nb('sig-pause-1'), type: 'PAUSE' },
      expectedSignalName: WorkflowSignals.PAUSE,
      expectedArguments: ['sig-pause-1'],
    });
  });

  it('forwards RESUME with the caller-provided signalId', async () => {
    await expectSignalDispatch({
      request: { signalId: nb('sig-resume-1'), type: 'RESUME' },
      expectedSignalName: WorkflowSignals.RESUME,
      expectedArguments: ['sig-resume-1'],
    });
  });

  it('forwards CANCEL with canonical signalId plus reason through the provider mapper', async () => {
    await expectSignalDispatch({
      request: { signalId: nb('sig-cancel-1'), type: 'CANCEL', reason: 'operator-request' },
      expectedSignalName: WorkflowSignals.CANCEL,
      expectedArguments: ['sig-cancel-1', 'operator-request'],
    });
  });
});

describe('TemporalAdapter.cancelRun', () => {
  it('uses the provider-native Temporal cancel handle instead of signal(CANCEL)', async () => {
    const cancel = vi.fn(async () => undefined);
    const signal = vi.fn(async () => undefined);
    const { adapter, workflowClient } = makeAdapter();
    workflowClient.getHandle.mockReturnValue({
      cancel,
      signal,
    });

    await adapter.cancelRun(BASE_RUN_REF);

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(signal).not.toHaveBeenCalled();
  });
});
