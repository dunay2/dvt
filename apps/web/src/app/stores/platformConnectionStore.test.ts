// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { usePlatformConnectionStore } from './platformConnectionStore';

describe('usePlatformConnectionStore', () => {
  beforeEach(() => {
    usePlatformConnectionStore.setState({
      connectionStatus: { rest: 'ok', liveEvents: 'connected' },
    });
  });

  it('owns the platform connection read model outside shell layout state', () => {
    usePlatformConnectionStore
      .getState()
      .setConnectionStatus({ rest: 'offline', liveEvents: 'disconnected' });

    expect(usePlatformConnectionStore.getState().connectionStatus).toEqual({
      rest: 'offline',
      liveEvents: 'disconnected',
    });
  });

  it('merges partial platform connection updates without replacing the whole read model', () => {
    usePlatformConnectionStore.getState().setConnectionStatus({ rest: 'degraded' });

    expect(usePlatformConnectionStore.getState().connectionStatus).toEqual({
      rest: 'degraded',
      liveEvents: 'connected',
    });
  });
});
