// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_CANVAS_PALETTE_ID } from '../views/canvas/canvasPalette';
import { useUiLayoutStore } from './uiLayoutStore';

const UI_LAYOUT_STORAGE_KEY = 'dvt-web-ui-layout';

describe('useUiLayoutStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiLayoutStore.setState({
      leftNavCollapsed: false,
      explorerPanelWidth: 280,
      explorerPanelVisible: false,
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      consolePanelHeight: 0,
      consolePanelVisible: false,
      focusMode: false,
      gridSize: 20,
      canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
      activeTabs: [{ id: 'main-canvas', type: 'canvas', label: 'Main Graph' }],
      activeTabId: 'main-canvas',
    });
  });

  it('falls back to the canonical palette when the setter receives a named alias', () => {
    useUiLayoutStore.getState().setCanvasPalette('blueprint' as never);

    expect(useUiLayoutStore.getState().canvasPalette).toBe(DEFAULT_CANVAS_PALETTE_ID);
  });

  it('falls back to the canonical palette when persisted state contains a named alias', async () => {
    localStorage.setItem(
      UI_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        state: {
          canvasPalette: 'blueprint',
          gridSize: 30,
          focusMode: true,
        },
      })
    );

    await useUiLayoutStore.persist.rehydrate();

    expect(useUiLayoutStore.getState().canvasPalette).toBe(DEFAULT_CANVAS_PALETTE_ID);
    expect(useUiLayoutStore.getState().gridSize).toBe(30);
    expect(useUiLayoutStore.getState().focusMode).toBe(true);
  });

  it('does not own platform connection status inside shell layout state', async () => {
    localStorage.setItem(
      UI_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        state: {
          connectionStatus: { rest: 'offline', liveEvents: 'disconnected' },
          gridSize: 30,
        },
      })
    );

    await useUiLayoutStore.persist.rehydrate();

    expect('connectionStatus' in useUiLayoutStore.getState()).toBe(false);
    expect('setConnectionStatus' in useUiLayoutStore.getState()).toBe(false);
    expect(useUiLayoutStore.getState().gridSize).toBe(30);
  });
});
