// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { buildCanvasShellProps } from './CanvasShell.testHarness';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

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
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  afterEach(() => {
    act(() => root.unmount());
    useOperationalDrawerContributionStore.setState({ contribution: null });
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
    container.remove();
    vi.clearAllMocks();
  });

  it('keeps one registered snapshot while equivalent shell contracts are reallocated', async () => {
    const shell = buildCanvasShellProps();
    const policy = shell.layout.surfaceStrategy!.operationalDrawer!;
    const dataSample = { status: 'idle' } as const;
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
        runControls={shell.runControls}
        onPreviewExecutionPlan={onPreviewExecutionPlan}
        onStartRun={vi.fn()}
        selectionRecoveryCommands={shell.chromeCommands.executionSelectionRecovery}
        dataSample={dataSample}
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

  it('replaces the registered contribution when the application language changes', async () => {
    const shell = buildCanvasShellProps();
    const policy = shell.layout.surfaceStrategy!.operationalDrawer!;

    await act(async () => {
      root.render(
        <CanvasOperationalDrawerContributionRegistrar
          policy={policy}
          panels={shell.panels}
          chromeState={shell.chromeState}
          runControls={shell.runControls}
          onPreviewExecutionPlan={vi.fn()}
          onStartRun={vi.fn()}
          selectionRecoveryCommands={shell.chromeCommands.executionSelectionRecovery}
          dataSample={{ status: 'idle' }}
        />
      );
    });

    const englishContribution = useOperationalDrawerContributionStore.getState().contribution;
    expect(englishContribution?.title).toBe('Canvas operations');

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    });

    const spanishContribution = useOperationalDrawerContributionStore.getState().contribution;
    expect(spanishContribution).not.toBe(englishContribution);
    expect(spanishContribution).toMatchObject({
      title: 'Operaciones del Canvas',
      tabs: [
        { id: 'log', label: 'Registro' },
        { id: 'problems', label: 'Problemas' },
        { id: 'runs', label: 'Ejecuciones' },
        { id: 'preview', label: 'Vista previa' },
        { id: 'data', label: 'Datos' },
      ],
      copy: {
        previewAction: 'Crear Execution Preview',
        tabsAriaLabel: 'Cajón operativo del Canvas',
      },
    });
  });
});
