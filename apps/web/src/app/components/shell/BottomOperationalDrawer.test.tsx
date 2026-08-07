// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppServicesProvider } from '../../services/AppServicesContext';
import type { RunEventFeedHealthModel } from '../../services/runs/runEventFeedHealthModel';
import {
  APPLICATION_LANGUAGE_STORAGE_KEY,
  useApplicationLanguageStore,
} from '../../stores/applicationLanguageStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import BottomOperationalDrawer from './BottomOperationalDrawer';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';

const liveLogStreamState: {
  lines: string[];
  runId: string | undefined;
  health: RunEventFeedHealthModel;
  retry: ReturnType<typeof vi.fn>;
} = {
  lines: [] as string[],
  runId: undefined as string | undefined,
  health: { state: 'idle', events: [], canRetry: false },
  retry: vi.fn(),
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
    liveLogStreamState.runId = undefined;
    liveLogStreamState.health = { state: 'idle', events: [], canRetry: false };
    liveLogStreamState.retry.mockReset();
    localStorage.removeItem(APPLICATION_LANGUAGE_STORAGE_KEY);
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    useOperationalDrawerContributionStore.setState({ activeTab: 'log', contribution: null });
    useUiLayoutStore.setState({
      leftNavCollapsed: false,
      inspectorPanelWidth: 380,
      inspectorPanelVisible: false,
      bottomDrawerHeight: 160,
      bottomDrawerVisible: true,
      focusMode: false,
      gridSize: 20,
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
    useOperationalDrawerContributionStore.setState({ activeTab: 'log', contribution: null });
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    localStorage.removeItem(APPLICATION_LANGUAGE_STORAGE_KEY);
    vi.restoreAllMocks();
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
    liveLogStreamState.runId = 'run-42';
    liveLogStreamState.health = { state: 'loading', events: [], canRetry: false };

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomOperationalDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-operational-feed-health"]')?.textContent
    ).toContain('Loading run events...');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-run-badge"]')?.textContent
    ).toContain('Run run-42');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-mode-badge"]')
    ).toBeNull();
  });

  it('updates drawer chrome and feed health when the application language changes', async () => {
    vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('en-US');
    liveLogStreamState.runId = 'run-42';
    liveLogStreamState.health = { state: 'degraded', events: [], canRetry: true };

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomOperationalDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-title"]')?.textContent
    ).toContain('Operations');

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    });

    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-title"]')?.textContent
    ).toContain('Operaciones');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-drawer-run-badge"]')?.textContent
    ).toBe('Ejecucion run-42');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-feed-health"]')?.textContent
    ).toContain('La actualizacion de eventos esta degradada temporalmente.');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-feed-retry"]')?.textContent
    ).toBe('Reintentar eventos');
    expect(
      document.body
        .querySelector('[data-slot="bottom-operational-drawer-close"]')
        ?.getAttribute('aria-label')
    ).toBe('Cerrar panel de operaciones');
  });

  it('renders the terminal when the stream is ready', async () => {
    liveLogStreamState.lines = ['step: started', 'step: finished'];
    liveLogStreamState.runId = 'run-42';
    liveLogStreamState.health = { state: 'live', events: [], canRetry: false };

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

  it('keeps buffered lines visible and exposes one retry while degraded', async () => {
    liveLogStreamState.lines = ['step: started'];
    liveLogStreamState.runId = 'run-42';
    liveLogStreamState.health = { state: 'degraded', events: [], canRetry: true };

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomOperationalDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-operational-feed-health"]')?.textContent
    ).toContain('Degraded');
    expect(document.body.querySelector('[data-testid="xterm-console"]')?.textContent).toContain(
      'step: started'
    );

    const retry = document.body.querySelector<HTMLButtonElement>(
      '[data-slot="bottom-operational-feed-retry"]'
    );
    expect(retry?.textContent).toContain('Retry event feed');
    fireEvent.click(retry!);
    expect(liveLogStreamState.retry).toHaveBeenCalledTimes(1);
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
