// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppServicesProvider } from '../services/AppServicesContext';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import BottomConsoleDrawer from './Console';

const consoleLogStreamState = {
  lines: [] as string[],
  isLoading: false,
  runId: undefined as string | undefined,
};

vi.mock('./console/useConsoleLogStream', () => ({
  useConsoleLogStream: () => consoleLogStreamState,
}));

vi.mock('./console/XtermConsole', () => ({
  default: ({ lines }: { lines: string[] }) => (
    <div data-testid="xterm-console">{lines.join('\n')}</div>
  ),
}));

describe('BottomConsoleDrawer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    consoleLogStreamState.lines = [];
    consoleLogStreamState.isLoading = false;
    consoleLogStreamState.runId = undefined;
    useUiLayoutStore.setState({
      leftNavCollapsed: false,
      explorerPanelWidth: 280,
      explorerPanelVisible: false,
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      consolePanelHeight: 160,
      consolePanelVisible: true,
      focusMode: false,
      gridSize: 20,
      activeTabs: [{ id: 'main-canvas', type: 'canvas', label: 'Main Graph' }],
      activeTabId: 'main-canvas',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('shows API-mode non-live guidance without internal roadmap wording', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ mode: 'api' }}>
          <BottomConsoleDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-idle"]')?.textContent
    ).toContain(
      'Start a run to see run events here. Live log streaming is not available in API mode yet.'
    );
    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-mode-badge"]')
    ).toBeNull();
    expect(document.body.textContent).not.toContain('Runtime snapshot');
    expect(document.body.textContent).not.toContain('Event timeline');
  });

  it('shows loading state with run and mode badges', async () => {
    consoleLogStreamState.isLoading = true;
    consoleLogStreamState.runId = 'run-42';

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ mode: 'mock' }}>
          <BottomConsoleDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-loading"]')?.textContent
    ).toContain('Loading run events...');
    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-run-badge"]')?.textContent
    ).toContain('Run run-42');
    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-mode-badge"]')?.textContent
    ).toContain('Mock');
  });

  it('renders the terminal when the stream is ready', async () => {
    consoleLogStreamState.lines = ['step: started', 'step: finished'];
    consoleLogStreamState.runId = 'run-42';

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ mode: 'mock' }}>
          <BottomConsoleDrawer />
        </AppServicesProvider>
      );
    });

    expect(document.body.querySelector('[data-slot="bottom-console-drawer-stream"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="xterm-console"]')?.textContent).toContain(
      'step: started'
    );
  });

  it('closes the drawer by hiding it in the layout store', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={{ mode: 'mock' }}>
          <BottomConsoleDrawer />
        </AppServicesProvider>
      );
    });

    const closeButton = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="bottom-console-drawer-close"]'
    );

    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(useUiLayoutStore.getState().consolePanelHeight).toBe(0);
    expect(useUiLayoutStore.getState().consolePanelVisible).toBe(false);
  });
});
