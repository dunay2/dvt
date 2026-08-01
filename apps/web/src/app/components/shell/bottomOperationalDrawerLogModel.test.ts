import { describe, expect, it } from 'vitest';

import { resolveRunEventFeedHealthCopy } from '../../services/runs/runEventFeedHealthCopy';
import { buildBottomOperationalDrawerLogModel } from './bottomOperationalDrawerLogModel';

const copy = resolveRunEventFeedHealthCopy('en');

describe('buildBottomOperationalDrawerLogModel', () => {
  it('returns live-log idle guidance when no run is active', () => {
    expect(
      buildBottomOperationalDrawerLogModel({
        title: 'Operations',
        runId: undefined,
        health: { state: 'idle', events: [], canRetry: false },
        copy,
      })
    ).toEqual({
      title: 'Operations',
      kind: 'idle',
      runLabel: null,
      message: 'Start a run to see live run events here.',
    });
  });

  it('returns a loading model with run badge and no runtime badge', () => {
    expect(
      buildBottomOperationalDrawerLogModel({
        title: 'Operations',
        runId: 'run-42',
        health: { state: 'loading', events: [], canRetry: false },
        copy,
      })
    ).toEqual({
      title: 'Operations',
      kind: 'active',
      runLabel: 'Run run-42',
      healthState: 'loading',
      statusLabel: 'Loading',
      message: 'Loading run events...',
      canRetry: false,
      retryLabel: 'Retry event feed',
      terminalLoadingLabel: 'Loading terminal...',
      lines: [],
    });
  });

  it('returns a live model with stable lines once the stream is ready', () => {
    expect(
      buildBottomOperationalDrawerLogModel({
        title: 'Operations',
        runId: 'run-42',
        health: {
          state: 'live',
          events: [],
          canRetry: false,
          lastSuccessfulFetchAt: '2026-08-01T10:00:00.000Z',
        },
        copy,
        lines: ['step: started', 'step: finished'],
      })
    ).toEqual({
      title: 'Operations',
      kind: 'active',
      runLabel: 'Run run-42',
      healthState: 'live',
      statusLabel: 'Live',
      message: 'Run events are live.',
      canRetry: false,
      retryLabel: 'Retry event feed',
      terminalLoadingLabel: 'Loading terminal...',
      lines: ['step: started', 'step: finished'],
    });
  });

  it('preserves lines and retry eligibility in a degraded model', () => {
    expect(
      buildBottomOperationalDrawerLogModel({
        title: 'Operations',
        runId: 'run-42',
        health: { state: 'degraded', events: [], canRetry: true },
        copy,
        lines: ['step: started'],
      })
    ).toMatchObject({
      kind: 'active',
      healthState: 'degraded',
      statusLabel: 'Degraded',
      canRetry: true,
      lines: ['step: started'],
    });
  });
});
