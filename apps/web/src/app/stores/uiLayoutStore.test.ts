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
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      bottomDrawerHeight: 0,
      bottomDrawerVisible: false,
      focusMode: false,
      gridSize: 20,
      canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
      canvasGridVisible: true,
      canvasGridColor: '#94a3b8',
      canvasSnapToGrid: false,
    });
  });

  it('falls back to the canonical palette when the setter receives a named alias', () => {
    useUiLayoutStore.getState().setCanvasPalette('blueprint' as never);

    expect(useUiLayoutStore.getState().canvasPalette).toBe(DEFAULT_CANVAS_PALETTE_ID);
  });

  it('opens the bottom drawer at a usable requested height', () => {
    useUiLayoutStore.getState().showBottomDrawer(300);

    expect(useUiLayoutStore.getState()).toMatchObject({
      bottomDrawerVisible: true,
      bottomDrawerHeight: 300,
    });
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

  it('does not own peer workbench navigation inside shell layout state', () => {
    const state = useUiLayoutStore.getState();

    expect('activeTabs' in state).toBe(false);
    expect('activeTabId' in state).toBe(false);
    expect('addTab' in state).toBe(false);
    expect('closeTab' in state).toBe(false);
    expect('setActiveTab' in state).toBe(false);
  });

  it('does not restore contextual node workbench visibility from persisted legacy layout', async () => {
    localStorage.setItem(
      UI_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        state: {
          inspectorPanelVisible: true,
          inspectorPanelWidth: 520,
          gridSize: 30,
        },
      })
    );

    await useUiLayoutStore.persist.rehydrate();

    expect(useUiLayoutStore.getState().inspectorPanelVisible).toBe(false);
    expect(useUiLayoutStore.getState().inspectorPanelWidth).toBe(520);
    expect(useUiLayoutStore.getState().gridSize).toBe(30);
  });

  it('owns canvas grid preferences as visual layout commands', async () => {
    useUiLayoutStore.getState().setCanvasGridVisible(false);
    useUiLayoutStore.getState().setCanvasGridColor('#f97316');
    useUiLayoutStore.getState().setCanvasSnapToGrid(true);

    expect(useUiLayoutStore.getState().canvasGridVisible).toBe(false);
    expect(useUiLayoutStore.getState().canvasGridColor).toBe('#f97316');
    expect(useUiLayoutStore.getState().canvasSnapToGrid).toBe(true);

    await useUiLayoutStore.persist.rehydrate();

    expect(useUiLayoutStore.getState().canvasGridVisible).toBe(false);
    expect(useUiLayoutStore.getState().canvasGridColor).toBe('#f97316');
    expect(useUiLayoutStore.getState().canvasSnapToGrid).toBe(true);
  });

  it('normalizes invalid persisted grid preferences back to canonical defaults', async () => {
    localStorage.setItem(
      UI_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        state: {
          canvasGridVisible: false,
          canvasGridColor: 'not-a-color',
          canvasSnapToGrid: true,
        },
      })
    );

    await useUiLayoutStore.persist.rehydrate();

    expect(useUiLayoutStore.getState().canvasGridVisible).toBe(false);
    expect(useUiLayoutStore.getState().canvasGridColor).toBe('#94a3b8');
    expect(useUiLayoutStore.getState().canvasSnapToGrid).toBe(true);
  });
});
