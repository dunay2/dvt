// @vitest-environment jsdom

import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppServicesProvider } from '../services/AppServicesContext';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import BottomConsoleDrawer from './Console';
import {
  useOperationalDrawerContributionStore,
  type OperationalDrawerContribution,
} from './shell/operationalDrawerContributionStore';

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

  function buildCanvasOperationalDrawerContribution(
    overrides?: Partial<OperationalDrawerContribution>
  ): OperationalDrawerContribution {
    return {
      source: 'canvas',
      title: 'Canvas operations',
      tabs: [
        { id: 'log', label: 'Log', count: null },
        { id: 'problems', label: 'Problems', count: 1 },
        { id: 'runs', label: 'Runs', count: 1 },
        { id: 'preview', label: 'Preview', count: 1 },
      ],
      problems: {
        items: [
          {
            id: 'plan_integrity',
            severity: 'warning',
            message: 'Preview required before running.',
            detail: 'plan_integrity',
          },
        ],
      },
      runs: {
        activeRunId: 'run-42',
        canStartRun: false,
      },
      preview: {
        status: 'blocked',
        summary: 'Preview required before running.',
        blockers: ['plan_integrity'],
        canPreview: true,
        onPreviewExecutionPlan: vi.fn(),
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    consoleLogStreamState.lines = [];
    consoleLogStreamState.isLoading = false;
    consoleLogStreamState.runId = undefined;
    useOperationalDrawerContributionStore.setState({ contribution: null });
    useUiLayoutStore.setState({
      leftNavCollapsed: false,
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
    useOperationalDrawerContributionStore.setState({ contribution: null });
    container.remove();
  });

  it('shows live-log idle guidance without internal roadmap wording', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider>
          <BottomConsoleDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-idle"]')?.textContent
    ).toContain('Start a run to see live run events here.');
    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-mode-badge"]')
    ).toBeNull();
    expect(document.body.textContent).not.toContain('not available');
    expect(document.body.textContent).not.toContain('Runtime snapshot');
    expect(document.body.textContent).not.toContain('Event timeline');
  });

  it('shows loading state with a run badge and no runtime badge', async () => {
    consoleLogStreamState.isLoading = true;
    consoleLogStreamState.runId = 'run-42';

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
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
      document.body.querySelector('[data-slot="bottom-console-drawer-mode-badge"]')
    ).toBeNull();
  });

  it('renders the terminal when the stream is ready', async () => {
    consoleLogStreamState.lines = ['step: started', 'step: finished'];
    consoleLogStreamState.runId = 'run-42';

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomConsoleDrawer />
        </AppServicesProvider>
      );
    });

    expect(document.body.querySelector('[data-slot="bottom-console-drawer-stream"]')).toBeTruthy();
    expect(document.body.querySelector('[data-testid="xterm-console"]')?.textContent).toContain(
      'step: started'
    );
  });

  it('renders Canvas operational tabs and route-owned problem, run, and preview details', async () => {
    const onPreviewExecutionPlan = vi.fn();
    useOperationalDrawerContributionStore.setState({
      contribution: buildCanvasOperationalDrawerContribution({
        preview: {
          status: 'blocked',
          summary: 'Preview required before running.',
          blockers: ['plan_integrity'],
          canPreview: true,
          onPreviewExecutionPlan,
        },
      }),
    });

    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
          <BottomConsoleDrawer />
        </AppServicesProvider>
      );
    });

    expect(
      document.body.querySelector('[data-slot="bottom-console-drawer-title"]')?.textContent
    ).toContain('Canvas operations');

    const tabButtons = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '[data-slot="bottom-operational-drawer-tab"]'
      )
    );

    expect(tabButtons.map((button) => button.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Log',
      'Problems 1',
      'Runs 1',
      'Preview 1',
    ]);

    const problemsTab = tabButtons[1];
    const runsTab = tabButtons[2];
    const previewTab = tabButtons[3];

    expect(problemsTab).toBeDefined();
    expect(runsTab).toBeDefined();
    expect(previewTab).toBeDefined();

    await act(async () => {
      fireEvent.click(problemsTab!);
    });
    expect(document.body.textContent).toContain('Preview required before running.');
    expect(document.body.textContent).toContain('plan_integrity');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-problem-severity"]')?.textContent
    ).toBe('warning');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-detail-code"]')?.textContent
    ).toBe('plan_integrity');

    await act(async () => {
      fireEvent.click(runsTab!);
    });
    expect(document.body.textContent).toContain('Active run');
    expect(document.body.textContent).toContain('run-42');

    await act(async () => {
      fireEvent.click(previewTab!);
    });
    expect(document.body.textContent).toContain('Preview required before running.');
    expect(
      document.body.querySelector('[data-slot="bottom-operational-preview-blocker"]')?.textContent
    ).toBe('plan_integrity');
    const previewButton = Array.from(document.body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Preview execution plan')
    );
    expect(previewButton).not.toBeNull();
    await act(async () => {
      fireEvent.click(previewButton!);
    });
    expect(onPreviewExecutionPlan).toHaveBeenCalledTimes(1);
  });

  it('closes the drawer by hiding it in the layout store', async () => {
    await act(async () => {
      root.render(
        <AppServicesProvider overrides={createAppServicesTestOverrides()}>
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
