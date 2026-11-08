/** Owned concern: own workbench shell layout commands and visual preferences. */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  OPERATIONAL_DRAWER_HEIGHT,
  normalizeOperationalDrawerHeight,
} from '../components/shell/appShellPanelSizing';
import {
  DEFAULT_CANVAS_GRID_COLOR,
  DEFAULT_CANVAS_PALETTE_ID,
  normalizeCanvasHexColor,
  normalizeCanvasPaletteId,
  type CanvasHexColor,
} from '../views/canvas/canvasPalette';

export const CANVAS_EXPLORER_WIDTH = { default: 22, min: 15, max: 40 } as const;

type OperationalDrawerLayout = Readonly<{
  bottomDrawerVisible: boolean;
  bottomDrawerHeight: number;
}>;
type OperationalDrawerLayoutEvent =
  | Readonly<{ type: 'show'; height: number | undefined }>
  | Readonly<{ type: 'hide' | 'toggle' }>
  | Readonly<{ type: 'resize'; height: number }>;

function transitionOperationalDrawerLayout(
  current: OperationalDrawerLayout,
  event: OperationalDrawerLayoutEvent
): OperationalDrawerLayout {
  if (event.type === 'resize' && (!Number.isFinite(event.height) || event.height <= 0))
    return current;
  const height = normalizeOperationalDrawerHeight(
    event.type === 'resize' || (event.type === 'show' && event.height !== undefined)
      ? event.height
      : current.bottomDrawerHeight
  );
  const visible =
    event.type === 'show'
      ? true
      : event.type === 'hide'
        ? false
        : event.type === 'toggle'
          ? !current.bottomDrawerVisible
          : current.bottomDrawerVisible;
  return Math.abs(height - current.bottomDrawerHeight) <= OPERATIONAL_DRAWER_HEIGHT.precision &&
    visible === current.bottomDrawerVisible
    ? current
    : { bottomDrawerHeight: height, bottomDrawerVisible: visible };
}

export type CanvasExplorerState = Readonly<{
  mode: 'expanded' | 'collapsed' | 'closed';
  widthPercent: number;
}>;

export type CanvasExplorerEvent =
  | Readonly<{ type: 'expand' | 'collapse' | 'toggle' | 'close' }>
  | Readonly<{ type: 'resize'; widthPercent: number }>;

function normalizeCanvasExplorerWidth(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(CANVAS_EXPLORER_WIDTH.max, Math.max(CANVAS_EXPLORER_WIDTH.min, value))
    : CANVAS_EXPLORER_WIDTH.default;
}

function hydrateCanvasExplorer(value: unknown, legacyVisible: unknown): CanvasExplorerState {
  if (value === undefined) {
    return {
      mode: legacyVisible === false ? 'closed' : 'expanded',
      widthPercent: CANVAS_EXPLORER_WIDTH.default,
    };
  }
  const persisted =
    typeof value === 'object' && value !== null ? (value as Partial<CanvasExplorerState>) : {};
  return {
    mode:
      persisted.mode === 'closed' || persisted.mode === 'collapsed' ? persisted.mode : 'expanded',
    widthPercent: normalizeCanvasExplorerWidth(persisted.widthPercent),
  };
}

function transitionCanvasExplorer(
  state: CanvasExplorerState,
  event: CanvasExplorerEvent
): CanvasExplorerState {
  let mode = state.mode;
  switch (event.type) {
    case 'expand':
      mode = 'expanded';
      break;
    case 'collapse':
      if (mode === 'expanded') mode = 'collapsed';
      break;
    case 'toggle':
      mode = mode === 'expanded' ? 'collapsed' : 'expanded';
      break;
    case 'close':
      mode = 'closed';
      break;
    case 'resize': {
      if (!Number.isFinite(event.widthPercent)) return state;
      const widthPercent = normalizeCanvasExplorerWidth(event.widthPercent);
      return widthPercent === state.widthPercent ? state : { ...state, widthPercent };
    }
  }
  return mode === state.mode ? state : { ...state, mode };
}

interface UiLayoutState {
  leftNavCollapsed: boolean;
  canvasExplorer: CanvasExplorerState;
  inspectorPanelWidth: number;
  inspectorPanelVisible: boolean;
  bottomDrawerHeight: number;
  bottomDrawerVisible: boolean;
  focusMode: boolean;
  gridSize: number;
  canvasPalette: CanvasHexColor;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasHexColor;
  canvasSnapToGrid: boolean;

  toggleLeftNav: () => void;
  dispatchCanvasExplorer: (event: CanvasExplorerEvent) => void;
  setInspectorPanelWidth: (width: number) => void;
  setBottomDrawerHeight: (height: number) => void;
  toggleFocusMode: () => void;
  toggleInspectorPanel: () => void;
  toggleBottomDrawer: () => void;
  showBottomDrawer: (height?: number) => void;
  hideBottomDrawer: () => void;
  showInspectorPanel: () => void;
  hideInspectorPanel: () => void;
  setGridSize: (size: number) => void;
  setCanvasPalette: (palette: CanvasHexColor) => void;
  setCanvasGridVisible: (visible: boolean) => void;
  setCanvasGridColor: (color: CanvasHexColor) => void;
  setCanvasSnapToGrid: (enabled: boolean) => void;
}

type PersistedUiLayoutState = Partial<
  Pick<
    UiLayoutState,
    | 'leftNavCollapsed'
    | 'canvasExplorer'
    | 'inspectorPanelWidth'
    | 'bottomDrawerHeight'
    | 'bottomDrawerVisible'
    | 'focusMode'
    | 'gridSize'
    | 'canvasPalette'
    | 'canvasGridVisible'
    | 'canvasGridColor'
    | 'canvasSnapToGrid'
  >
> & { canvasExplorerVisible?: unknown };

export const useUiLayoutStore = create<UiLayoutState>()(
  persist(
    (set, get) => {
      const dispatchOperationalDrawer = (event: OperationalDrawerLayoutEvent): void => {
        const current = get();
        const next = transitionOperationalDrawerLayout(current, event);
        if (next !== current) set(next);
      };
      return {
        leftNavCollapsed: false,
        canvasExplorer: { mode: 'expanded', widthPercent: CANVAS_EXPLORER_WIDTH.default },
        inspectorPanelWidth: 380,
        inspectorPanelVisible: false,
        bottomDrawerHeight: OPERATIONAL_DRAWER_HEIGHT.default,
        bottomDrawerVisible: false,
        focusMode: false,
        gridSize: 20,
        canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
        canvasGridVisible: true,
        canvasGridColor: DEFAULT_CANVAS_GRID_COLOR,
        canvasSnapToGrid: false,

        toggleLeftNav: () => set((state) => ({ leftNavCollapsed: !state.leftNavCollapsed })),
        dispatchCanvasExplorer: (event) => {
          // These transitions are synchronous; bypass persist entirely when a current-state event is a no-op.
          const current = get().canvasExplorer;
          const canvasExplorer = transitionCanvasExplorer(current, event);
          if (canvasExplorer !== current) set({ canvasExplorer });
        },
        setInspectorPanelWidth: (width) => set({ inspectorPanelWidth: width }),
        setBottomDrawerHeight: (height) => dispatchOperationalDrawer({ type: 'resize', height }),
        toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
        toggleInspectorPanel: () =>
          set((state) => ({ inspectorPanelVisible: !state.inspectorPanelVisible })),
        toggleBottomDrawer: () => dispatchOperationalDrawer({ type: 'toggle' }),
        showBottomDrawer: (height) => dispatchOperationalDrawer({ type: 'show', height }),
        hideBottomDrawer: () => dispatchOperationalDrawer({ type: 'hide' }),
        showInspectorPanel: () => set({ inspectorPanelVisible: true }),
        hideInspectorPanel: () => set({ inspectorPanelVisible: false }),
        setGridSize: (size) => set({ gridSize: size }),
        setCanvasPalette: (palette) => set({ canvasPalette: normalizeCanvasPaletteId(palette) }),
        setCanvasGridVisible: (visible) => set({ canvasGridVisible: visible }),
        setCanvasGridColor: (color) =>
          set({ canvasGridColor: normalizeCanvasHexColor(color, DEFAULT_CANVAS_GRID_COLOR) }),
        setCanvasSnapToGrid: (enabled) => set({ canvasSnapToGrid: enabled }),
      };
    },
    {
      name: 'dvt-web-ui-layout',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persistedLayoutState =
          typeof persistedState === 'object' && persistedState != null
            ? (persistedState as PersistedUiLayoutState)
            : {};

        return {
          ...currentState,
          leftNavCollapsed: persistedLayoutState.leftNavCollapsed ?? currentState.leftNavCollapsed,
          canvasExplorer: hydrateCanvasExplorer(
            persistedLayoutState.canvasExplorer,
            persistedLayoutState.canvasExplorerVisible
          ),
          inspectorPanelWidth:
            persistedLayoutState.inspectorPanelWidth ?? currentState.inspectorPanelWidth,
          inspectorPanelVisible: currentState.inspectorPanelVisible,
          bottomDrawerHeight: normalizeOperationalDrawerHeight(
            persistedLayoutState.bottomDrawerHeight
          ),
          bottomDrawerVisible:
            typeof persistedLayoutState.bottomDrawerVisible === 'boolean'
              ? persistedLayoutState.bottomDrawerVisible
              : currentState.bottomDrawerVisible,
          focusMode: persistedLayoutState.focusMode ?? currentState.focusMode,
          gridSize: persistedLayoutState.gridSize ?? currentState.gridSize,
          canvasPalette: normalizeCanvasPaletteId(
            persistedLayoutState.canvasPalette ?? currentState.canvasPalette
          ),
          canvasGridVisible:
            typeof persistedLayoutState.canvasGridVisible === 'boolean'
              ? persistedLayoutState.canvasGridVisible
              : currentState.canvasGridVisible,
          canvasGridColor: normalizeCanvasHexColor(
            persistedLayoutState.canvasGridColor,
            DEFAULT_CANVAS_GRID_COLOR
          ),
          canvasSnapToGrid:
            typeof persistedLayoutState.canvasSnapToGrid === 'boolean'
              ? persistedLayoutState.canvasSnapToGrid
              : currentState.canvasSnapToGrid,
        };
      },
      partialize: (state) => ({
        leftNavCollapsed: state.leftNavCollapsed,
        canvasExplorer: state.canvasExplorer,
        inspectorPanelWidth: state.inspectorPanelWidth,
        bottomDrawerHeight: state.bottomDrawerHeight,
        bottomDrawerVisible: state.bottomDrawerVisible,
        focusMode: state.focusMode,
        gridSize: state.gridSize,
        canvasPalette: state.canvasPalette,
        canvasGridVisible: state.canvasGridVisible,
        canvasGridColor: state.canvasGridColor,
        canvasSnapToGrid: state.canvasSnapToGrid,
      }),
    }
  )
);
