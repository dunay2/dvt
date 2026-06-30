import { describe, expect, it } from 'vitest';

import { buildBottomOperationalDrawerLogModel } from './bottomOperationalDrawerLogModel';

describe('buildBottomOperationalDrawerLogModel', () => {
  it('returns live-log idle guidance when no run is active', () => {
    expect(
      buildBottomOperationalDrawerLogModel({
        title: 'Operations',
        dataSourceMode: 'api',
        runId: undefined,
        isLoading: false,
        lines: [],
      })
    ).toEqual({
      title: 'Operations',
      modeLabel: null,
      kind: 'idle',
      runLabel: null,
      message: 'Start a run to see live run events here.',
    });
  });

  it('returns a loading model with run badge and no runtime badge', () => {
    expect(
      buildBottomOperationalDrawerLogModel({
        title: 'Operations',
        dataSourceMode: 'api',
        runId: 'run-42',
        isLoading: true,
        lines: [],
      })
    ).toEqual({
      title: 'Operations',
      modeLabel: null,
      kind: 'loading',
      runLabel: 'Run run-42',
      message: 'Loading run events...',
    });
  });

  it('returns a streaming model with stable lines once the stream is ready', () => {
    expect(
      buildBottomOperationalDrawerLogModel({
        title: 'Operations',
        dataSourceMode: 'api',
        runId: 'run-42',
        isLoading: false,
        lines: ['step: started', 'step: finished'],
      })
    ).toEqual({
      title: 'Operations',
      modeLabel: null,
      kind: 'streaming',
      runLabel: 'Run run-42',
      lines: ['step: started', 'step: finished'],
    });
  });
});
