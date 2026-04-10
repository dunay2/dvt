import { describe, expect, it } from 'vitest';

import { buildBottomConsoleDrawerModel } from './bottomConsoleDrawerModel';

describe('buildBottomConsoleDrawerModel', () => {
  it('returns API idle guidance when no run is active', () => {
    expect(
      buildBottomConsoleDrawerModel({
        title: 'Console',
        dataSourceMode: 'api',
        runId: undefined,
        isLoading: false,
        lines: [],
      })
    ).toEqual({
      title: 'Console',
      modeLabel: null,
      kind: 'idle',
      runLabel: null,
      message:
        'Start a run to see run events here. Live log streaming is not available in API mode yet.',
    });
  });

  it('returns a loading model with run badge and mock badge', () => {
    expect(
      buildBottomConsoleDrawerModel({
        title: 'Console',
        dataSourceMode: 'mock',
        runId: 'run-42',
        isLoading: true,
        lines: [],
      })
    ).toEqual({
      title: 'Console',
      modeLabel: 'Mock',
      kind: 'loading',
      runLabel: 'Run run-42',
      message: 'Loading run events...',
    });
  });

  it('returns a streaming model with stable lines once the stream is ready', () => {
    expect(
      buildBottomConsoleDrawerModel({
        title: 'Console',
        dataSourceMode: 'mock',
        runId: 'run-42',
        isLoading: false,
        lines: ['step: started', 'step: finished'],
      })
    ).toEqual({
      title: 'Console',
      modeLabel: 'Mock',
      kind: 'streaming',
      runLabel: 'Run run-42',
      lines: ['step: started', 'step: finished'],
    });
  });
});
