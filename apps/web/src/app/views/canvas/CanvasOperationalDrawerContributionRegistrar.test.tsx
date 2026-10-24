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

  it('preserves a cause-specific diagnostic and observes its change without summary churn', async () => {
    const shell = buildCanvasShellProps();
    const policy = shell.layout.surfaceStrategy!.operationalDrawer!;
    const dataSampleTabs = [] as const;
    const renderDiagnostic = (message: string) => (
      <CanvasOperationalDrawerContributionRegistrar
        policy={policy}
        panels={shell.panels}
        chromeState={{
          ...shell.chromeState,
          planRunReadiness: {
            rail: 'ObservePlanRunReadiness',
            status: 'blocked',
            blockers: ['plan_integrity'],
            summary: 'Preview is blocked',
            diagnostic: { blocker: 'plan_integrity', message },
          },
        }}
        runControls={shell.runControls}
        onPreviewExecutionPlan={vi.fn()}
        onStartRun={vi.fn()}
        selectionRecoveryCommands={shell.chromeCommands.executionSelectionRecovery}
        dataSampleTabs={dataSampleTabs}
      />
    );
    await act(async () => root.render(renderDiagnostic('Current cause A')));
    const first = useOperationalDrawerContributionStore.getState().contribution;
    expect(first?.problems.items.find((p) => p.id === 'plan_integrity')?.message).toBe(
      'Current cause A'
    );
    await act(async () => root.render(renderDiagnostic('Current cause A')));
    expect(useOperationalDrawerContributionStore.getState().contribution).toBe(first);
    await act(async () => root.render(renderDiagnostic('Current cause B')));
    const changed = useOperationalDrawerContributionStore.getState().contribution;
    expect(changed).not.toBe(first);
    expect(changed?.problems.items.find((p) => p.id === 'plan_integrity')?.message).toBe(
      'Current cause B'
    );
  });

  it('keeps one registered snapshot while equivalent shell contracts are reallocated', async () => {
    const shell = buildCanvasShellProps();
    const policy = shell.layout.surfaceStrategy!.operationalDrawer!;
    const dataSampleTabs = [] as const;
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
        dataSampleTabs={dataSampleTabs}
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
          dataSampleTabs={[]}
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
        { id: 'semantic', label: 'Árbol relacional' },
      ],
      copy: {
        previewAction: 'Crear Execution Preview',
        tabsAriaLabel: 'Cajón operativo del Canvas',
      },
    });
  });
});
