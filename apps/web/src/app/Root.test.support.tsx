import { waitFor } from '@testing-library/dom';
import { expect } from 'vitest';

import { useAppDataSourceMode } from './services/AppServicesContext';
import { useUiLayoutStore } from './stores/uiLayoutStore';
import { DEFAULT_CANVAS_PALETTE_ID } from './views/canvas/canvasPalette';

export function RootServicesProbe(): JSX.Element {
  const mode = useAppDataSourceMode();
  return <div data-testid="root-services-probe">mode:{mode}</div>;
}

export function resetRootShellStores(): void {
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
    connectionStatus: { rest: 'ok', liveEvents: 'connected' },
  });
}

export function setRootShellFocusMode(enabled: boolean): void {
  useUiLayoutStore.setState({ focusMode: enabled });
}

export function setRootShellConsoleDrawer(args: {
  visible: boolean;
  height: number;
}): void {
  useUiLayoutStore.setState({
    consolePanelVisible: args.visible,
    consolePanelHeight: args.height,
  });
}

export async function waitForShellBootstrapSurface(mounted: {
  container: ParentNode;
}): Promise<void> {
  await waitFor(() => {
    expect(mounted.container.querySelector('[data-slot="app-shell-frame"]')).not.toBeNull();
  });
}
