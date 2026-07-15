// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { buildCanvasShellProps } from './CanvasShell.testHarness';

describe('CanvasOperationalDrawerContributionRegistrar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useOperationalDrawerContributionStore.setState({ contribution: null });
  });

  afterEach(() => {
    act(() => root.unmount());
    useOperationalDrawerContributionStore.setState({ contribution: null });
    container.remove();
    vi.clearAllMocks();
  });

  it('keeps one registered snapshot while equivalent shell contracts are reallocated', async () => {
    const shell = buildCanvasShellProps();
    const policy = shell.layout.surfaceStrategy!.operationalDrawer!;
    const renderRegistrar = (onPreviewExecutionPlan: () => void): JSX.Element => (
      <CanvasOperationalDrawerContributionRegistrar
        policy={{ ...policy, tabs: [...policy.tabs] }}
        panels={{ ...shell.panels }}
        chromeState={{
          ...shell.chromeState,
          planRunReadiness: {
            ...shell.chromeState.planRunReadiness,
            blockers: [...shell.chromeState.planRunReadiness.blockers],
          },
        }}
        onPreviewExecutionPlan={onPreviewExecutionPlan}
        onStartRun={vi.fn()}
      />
    );

    const firstCommand = vi.fn();
    await act(async () => root.render(renderRegistrar(firstCommand)));
    const firstContribution = useOperationalDrawerContributionStore.getState().contribution;

    const latestCommand = vi.fn();
    await act(async () => root.render(renderRegistrar(latestCommand)));
    const latestContribution = useOperationalDrawerContributionStore.getState().contribution;

    expect(latestContribution).toBe(firstContribution);
    latestContribution?.preview.onPreviewExecutionPlan();
    expect(firstCommand).not.toHaveBeenCalled();
    expect(latestCommand).toHaveBeenCalledTimes(1);
  });
});
