// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CANVAS_PALETTE_ID } from '../views/canvas/canvasPalette';
import { useUiLayoutStore } from './uiLayoutStore';

const UI_LAYOUT_STORAGE_KEY = 'dvt-web-ui-layout';

describe('useUiLayoutStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiLayoutStore.setState({
      canvasExplorer: { mode: 'expanded', widthPercent: 22 },
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

  afterEach(() => vi.restoreAllMocks());

  it('starts with one expanded Explorer state and retires the old visibility commands', () => {
    // GH-3818: separate visibility and local expansion owners disagreed after reopening.
    expect(useUiLayoutStore.getInitialState().canvasExplorer).toEqual({
      mode: 'expanded',
      widthPercent: 22,
    });
    for (const key of ['canvasExplorerVisible', 'showCanvasExplorer', 'hideCanvasExplorer']) {
      expect(useUiLayoutStore.getState()).not.toHaveProperty(key);
    }
  });

  it('ignores retired navigation layout keys during hydration and future persistence', async () => {
    // The direct navigation rail has no collapse preference; old storage must not restore a dead command or field.
    localStorage.setItem(
      UI_LAYOUT_STORAGE_KEY,
      JSON.stringify({ state: { leftNavCollapsed: true }, version: 0 })
    );
    await useUiLayoutStore.persist.rehydrate();
    expect(useUiLayoutStore.getState()).not.toHaveProperty('leftNavCollapsed');
    expect(useUiLayoutStore.getState()).not.toHaveProperty('toggleLeftNav');
    useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'resize', widthPercent: 30 });
    const persisted = JSON.parse(localStorage.getItem(UI_LAYOUT_STORAGE_KEY)!);
    expect(persisted.state).not.toHaveProperty('leftNavCollapsed');
    expect(persisted.state.canvasExplorer.widthPercent).toBe(30);
  });

  it.each([
    ['expanded', 'expand', 'expanded'],
    ['expanded', 'collapse', 'collapsed'],
    ['expanded', 'toggle', 'collapsed'],
    ['expanded', 'close', 'closed'],
    ['collapsed', 'expand', 'expanded'],
    ['collapsed', 'collapse', 'collapsed'],
    ['collapsed', 'toggle', 'expanded'],
    ['collapsed', 'close', 'closed'],
    ['closed', 'expand', 'expanded'],
    ['closed', 'collapse', 'closed'],
    ['closed', 'toggle', 'expanded'],
    ['closed', 'close', 'closed'],
  ] as const)('transitions %s with %s to %s without losing width', (mode, type, expectedMode) => {
    // Disclosure commands must not reset the width or accidentally reopen a closed dock.
    useUiLayoutStore.setState({ canvasExplorer: { mode, widthPercent: 31.25 } });
    const previous = useUiLayoutStore.getState().canvasExplorer;

    useUiLayoutStore.getState().dispatchCanvasExplorer({ type });

    expect(useUiLayoutStore.getState().canvasExplorer).toEqual({
      mode: expectedMode,
      widthPercent: 31.25,
    });
    if (mode === expectedMode) {
      expect(useUiLayoutStore.getState().canvasExplorer).toBe(previous);
    }
  });

  it.each(['expanded', 'collapsed', 'closed'] as const)(
    'persists and restores the %s mode and fractional width using the existing storage key',
    async (mode) => {
      // GH-3818: reload lost both the user's resize and the collapsed state.
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'resize', widthPercent: 31.25 });
      if (mode !== 'expanded') {
        useUiLayoutStore.getState().dispatchCanvasExplorer({
          type: mode === 'collapsed' ? 'collapse' : 'close',
        });
      }
      const saved = localStorage.getItem(UI_LAYOUT_STORAGE_KEY);
      expect(saved).not.toBeNull();
      const persisted = JSON.parse(saved!);
      expect(persisted.state.canvasExplorer).toEqual({ mode, widthPercent: 31.25 });
      expect(persisted.state).not.toHaveProperty('canvasExplorerVisible');

      useUiLayoutStore.setState({ canvasExplorer: { mode: 'expanded', widthPercent: 22 } });
      localStorage.setItem(UI_LAYOUT_STORAGE_KEY, saved!);
      await useUiLayoutStore.persist.rehydrate();

      expect(useUiLayoutStore.getState().canvasExplorer).toEqual({ mode, widthPercent: 31.25 });
    }
  );

  it.each([
    [false, 'closed'],
    [true, 'expanded'],
    ['false', 'expanded'],
    [undefined, 'expanded'],
  ] as const)(
    'migrates legacy visibility %j without restoring a second runtime field',
    async (value, mode) => {
      // Existing installs have the boolean shape; migrating must not revive that second owner.
      localStorage.setItem(
        UI_LAYOUT_STORAGE_KEY,
        JSON.stringify({ state: { canvasExplorerVisible: value } })
      );
      await useUiLayoutStore.persist.rehydrate();
      expect(useUiLayoutStore.getState().canvasExplorer).toEqual({ mode, widthPercent: 22 });
      expect(useUiLayoutStore.getState()).not.toHaveProperty('canvasExplorerVisible');
    }
  );

  it('prefers the new persisted mode over legacy visibility', async () => {
    // A stale legacy flag must not override a newer, deliberately collapsed preference.
    localStorage.setItem(
      UI_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        state: {
          canvasExplorerVisible: false,
          canvasExplorer: { mode: 'collapsed', widthPercent: 28 },
        },
      })
    );
    await useUiLayoutStore.persist.rehydrate();
    expect(useUiLayoutStore.getState().canvasExplorer).toEqual({
      mode: 'collapsed',
      widthPercent: 28,
    });
  });

  it.each([
    null,
    'closed',
    {},
    { mode: 'unknown', widthPercent: '31' },
    { mode: false, widthPercent: null },
  ])('defaults malformed persisted Explorer state %j', async (canvasExplorer) => {
    // Browser storage is untrusted input; malformed values must not produce unusable geometry.
    useUiLayoutStore.setState({ canvasExplorer: { mode: 'closed', widthPercent: 35 } });
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, JSON.stringify({ state: { canvasExplorer } }));
    await useUiLayoutStore.persist.rehydrate();
    expect(useUiLayoutStore.getState().canvasExplorer).toEqual({
      mode: 'expanded',
      widthPercent: 22,
    });
  });

  it.each([
    [-1, 15],
    [100, 40],
    [31.25, 31.25],
    [null, 22],
    ['31', 22],
  ])(
    'validates hydrated width %j while preserving valid disclosure',
    async (widthPercent, expected) => {
      // Repairing one invalid field must preserve the user's valid disclosure preference.
      localStorage.setItem(
        UI_LAYOUT_STORAGE_KEY,
        JSON.stringify({ state: { canvasExplorer: { mode: 'collapsed', widthPercent } } })
      );
      await useUiLayoutStore.persist.rehydrate();
      expect(useUiLayoutStore.getState().canvasExplorer).toEqual({
        mode: 'collapsed',
        widthPercent: expected,
      });
    }
  );

  it.each(['expanded', 'collapsed', 'closed'] as const)(
    'bounds resize without changing %s mode',
    (mode) => {
      // Geometry observations are not open/close commands, including for retained hidden views.
      useUiLayoutStore.setState({ canvasExplorer: { mode, widthPercent: 22 } });
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'resize', widthPercent: -10 });
      expect(useUiLayoutStore.getState().canvasExplorer).toEqual({ mode, widthPercent: 15 });
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'resize', widthPercent: 100 });
      expect(useUiLayoutStore.getState().canvasExplorer).toEqual({ mode, widthPercent: 40 });
    }
  );

  it('does not notify or write storage for unchanged, clamped-equal or non-finite transitions', () => {
    // Retained panels echo synchronized sizes; no-op events must not start a persistence loop.
    useUiLayoutStore.setState({ canvasExplorer: { mode: 'closed', widthPercent: 40 } });
    const previous = useUiLayoutStore.getState();
    const listener = vi.fn();
    const unsubscribe = useUiLayoutStore.subscribe(listener);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    try {
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'close' });
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'collapse' });
      for (const widthPercent of [
        40,
        100,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ]) {
        useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'resize', widthPercent });
      }
      expect(useUiLayoutStore.getState()).toBe(previous);
      expect(listener).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
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

  it('retains the last drawer height through close, toggle, implicit reveal and hydration', async () => {
    // Closing used to erase geometry, so every route or sample reopened a differently sized drawer.
    useUiLayoutStore.getState().showBottomDrawer(420.5);
    useUiLayoutStore.getState().hideBottomDrawer();
    expect(useUiLayoutStore.getState()).toMatchObject({
      bottomDrawerVisible: false,
      bottomDrawerHeight: 420.5,
    });
    useUiLayoutStore.getState().toggleBottomDrawer();
    expect(useUiLayoutStore.getState()).toMatchObject({
      bottomDrawerVisible: true,
      bottomDrawerHeight: 420.5,
    });
    useUiLayoutStore.getState().toggleBottomDrawer();
    const saved = localStorage.getItem(UI_LAYOUT_STORAGE_KEY)!;
    useUiLayoutStore.setState({ bottomDrawerVisible: true, bottomDrawerHeight: 0 });
    localStorage.setItem(UI_LAYOUT_STORAGE_KEY, saved);
    await useUiLayoutStore.persist.rehydrate();
    expect(useUiLayoutStore.getState()).toMatchObject({
      bottomDrawerVisible: false,
      bottomDrawerHeight: 420.5,
    });
    useUiLayoutStore.getState().showBottomDrawer();
    expect(useUiLayoutStore.getState()).toMatchObject({
      bottomDrawerVisible: true,
      bottomDrawerHeight: 420.5,
    });
  });

  it('does not persist unchanged or invalid drawer resize observations', () => {
    // Programmatic acknowledgements and malformed measurements must not create a storage feedback loop.
    useUiLayoutStore.getState().showBottomDrawer(420.5);
    const previous = useUiLayoutStore.getState();
    const listener = vi.fn();
    const unsubscribe = useUiLayoutStore.subscribe(listener);
    const write = vi.spyOn(Storage.prototype, 'setItem');
    try {
      for (const height of [420.5, 420.500001, 0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
        useUiLayoutStore.getState().setBottomDrawerHeight(height);
      }
      useUiLayoutStore.getState().showBottomDrawer();
      expect(useUiLayoutStore.getState()).toBe(previous);
      expect(listener).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it.each([0, -1, null, '420', undefined])(
    'repairs legacy or invalid drawer height %j without trusting stored actions',
    async (height) => {
      // Hydration must repair geometry while keeping the runtime command functions authoritative.
      const hide = useUiLayoutStore.getState().hideBottomDrawer;
      localStorage.setItem(
        UI_LAYOUT_STORAGE_KEY,
        JSON.stringify({
          state: {
            bottomDrawerHeight: height,
            bottomDrawerVisible: false,
            hideBottomDrawer: 'stored overwrite',
            unknownLayoutAuthority: true,
          },
        })
      );
      await useUiLayoutStore.persist.rehydrate();
      expect(useUiLayoutStore.getState()).toMatchObject({
        bottomDrawerVisible: false,
        bottomDrawerHeight: 300,
      });
      expect(useUiLayoutStore.getState().hideBottomDrawer).toBe(hide);
      expect(useUiLayoutStore.getState()).not.toHaveProperty('unknownLayoutAuthority');
    }
  );

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
