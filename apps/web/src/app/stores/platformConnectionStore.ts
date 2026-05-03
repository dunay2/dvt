import { create } from 'zustand';

import type { PlatformConnectionState } from '../../capabilities/platform-health';

interface PlatformConnectionStoreState {
  connectionStatus: PlatformConnectionState;
  setConnectionStatus: (status: Partial<PlatformConnectionState>) => void;
}

export const usePlatformConnectionStore = create<PlatformConnectionStoreState>()((set) => ({
  connectionStatus: { rest: 'ok', liveEvents: 'connected' },
  setConnectionStatus: (status) =>
    set((state) => ({ connectionStatus: { ...state.connectionStatus, ...status } })),
}));
