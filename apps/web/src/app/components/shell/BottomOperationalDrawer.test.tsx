// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppServicesProvider } from '../../services/AppServicesContext';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import BottomOperationalDrawer from './BottomOperationalDrawer';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';

const liveLogStreamState = {
  lines: [] as string[],
  isLoading: false,
  runId: undefined as string | undefined,
};

vi.mock('../console/useConsoleLogStream', () => ({
  useConsoleLogStream: () => liveLogStreamState,
}));

vi.mock('../console/XtermConsole', () => ({
  default: ({ lines }: { lines: string[] }) => (
    <div data-testid="xterm-console">{lines.join('\n')}</div>
  ),
}));

describe('BottomOperationalDrawer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    liveLogStreamState.lines = [];
    liveLogStreamState.isLoading = false;
    liveLogStreamState.runId = undefined;
    useOperationalDrawerContributionStore.setState({ contribution: null });
    useUiLayoutStore.setState({
      leftNavCollapsed: false,
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      bottomDrawerHeight: 160,
      bottomDrawerVisible: true,
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
    useOperationalDrawerContributionStore.setState({ contribution: null });
    container.remove();
  });

  it('shows live-log idle guidance without internal roadmap wording', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider>
          <BottomOperationalDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-idle"]')?.textContent
    ).toContain('Start a run to see live run events here.');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-mode-badge"]')
    ).toBeNull();
    expect(document.body.textContent).not.toContain('not available');
    expect(document.body.textContent).not.toContain('Runtime snapshot');
    expect(document.body.textContent).not.toContain('Event timeline');
  });

  it('shows loading state with a run badge and no runtime badge', async () => {
    liveLogStreamState.isLoading = true;
    liveLogStreamState.runId = 'run-42';

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomOperationalDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-loading"]')?.textContent
    ).toContain('Loading run events...');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-run-badge"]')?.textContent
    ).toContain('Run run-42');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-mode-badge"]')
    ).toBeNull();
  });

  it('renders the terminal when the stream is ready', async () => {
    liveLogStreamState.lines = ['step: started', 'step: finished'];
    liveLogStreamState.runId = 'run-42';

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomOperationalDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-stream"]')
    ).toBeTruthy();
    expect(document.body.querySelector('[data-testid="xterm-console"]')?.textContent).toContain(
      'step: started'
    );
  });

  it('closes the drawer by hiding it in the layout store', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomOperationalDrawer />
        </AppServicesProvider>
      );
    });

    const closeButton = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="bottom-operational-drawer-close"]'
    );

    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(useUiLayoutStore.getState().bottomDrawerHeight).toBe(0);
    expect(useUiLayoutStore.getState().bottomDrawerVisible).toBe(false);
  });
});
