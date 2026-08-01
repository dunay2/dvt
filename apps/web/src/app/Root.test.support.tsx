import { waitFor } from '@testing-library/dom';
import { expect } from 'vitest';

import { useAppDataSourceMode } from './services/AppServicesContext';
import { usePlatformConnectionStore } from './stores/platformConnectionStore';
import { useCanvasInteractionStore } from './stores/canvasInteractionStore';
import { useUiLayoutStore } from './stores/uiLayoutStore';
import { DEFAULT_CANVAS_PALETTE_ID } from './views/canvas/canvasPalette';

export function RootServicesProbe(): JSX.Element {
  const mode = useAppDataSourceMode();
  return <div data-testid="root-services-probe">mode:{mode}</div>;
}

export function resetRootShellStores(): void {
  useCanvasInteractionStore.setState({
    contextualWorkbenchId: null,
    contextualWorkbenchOwnerKey: null,
  });
  useUiLayoutStore.setState({
    leftNavCollapsed: false,
    inspectorPanelWidth: 380,
    inspectorPanelVisible: false,
    bottomDrawerHeight: 0,
    bottomDrawerVisible: false,
    focusMode: false,
    gridSize: 20,
    canvasPalette: DEFAULT_CANVAS_PALETTE_ID,
  });
  usePlatformConnectionStore.setState({
    connectionStatus: { rest: 'ok', liveEvents: 'connected' },
  });
}

export function setRootShellFocusMode(enabled: boolean): void {
  useUiLayoutStore.setState({ focusMode: enabled });
}

export function setRootShellBottomDrawer(args: { visible: boolean; height: number }): void {
  useUiLayoutStore.setState({
    bottomDrawerVisible: args.visible,
    bottomDrawerHeight: args.height,
  });
}

export async function waitForShellBootstrapSurface(mounted: {
  container: ParentNode;
}): Promise<void> {
  await waitFor(() => {
    expect(mounted.container.querySelector('[data-slot="app-shell-frame"]')).not.toBeNull();
  });
}
