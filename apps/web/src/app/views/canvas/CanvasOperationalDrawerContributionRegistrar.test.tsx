// @vitest-environment jsdom

import React, { act } from 'react';
import { fireEvent } from '@testing-library/dom';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { CanvasOperationalDrawerContributionRegistrar } from './CanvasOperationalDrawerContributionRegistrar';
import { buildCanvasShellProps } from './CanvasShell.testHarness';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { BottomOperationalDrawerBody } from '../../components/shell/OperationalDrawerPanels';
import { OperationalDrawerDataTable } from '../../components/shell/OperationalDrawerDataTable';

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

  it('publishes current diagnostics without withdrawing mounted Data state', async () => {
    const shell = buildCanvasShellProps();
    const policy = shell.layout.surfaceStrategy!.operationalDrawer!;
    const dataSampleTabs = [] as const;
    const operationDataTab = {
      id: 'data:operation' as const,
      label: 'Operation Data',
      count: null,
      content: (
        <OperationalDrawerDataTable
          caption="Current rows"
          columns={[{ name: 'customer' }]}
          nullValueLabel="NULL"
          rows={[{ values: ['alpha'] }, { values: ['beta'] }]}
        />
      ),
    };
    function DrawerBody(): React.JSX.Element {
      const { contribution, activeTab } = useOperationalDrawerContributionStore();
      return (
        <BottomOperationalDrawerBody
          contribution={contribution}
          activeTab={activeTab}
          logBody={null}
        />
      );
    }
    const renderDiagnostic = (message: string): React.ReactElement => (
      <>
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
          operationDataTab={operationDataTab}
        />
        <DrawerBody />
      </>
    );
    await act(async () => root.render(renderDiagnostic('Current cause A')));
    const first = useOperationalDrawerContributionStore.getState().contribution;
    expect(first?.problems.items.find((p) => p.id === 'plan_integrity')?.message).toBe(
      'Current cause A'
    );
    await act(async () => root.render(renderDiagnostic('Current cause A')));
    expect(useOperationalDrawerContributionStore.getState().contribution).toBe(first);
    await act(async () =>
      useOperationalDrawerContributionStore.getState().selectOperationalDrawerTab('data:operation')
    );
    const search = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    const panel = search.closest('[role="tabpanel"]');
    await act(async () => fireEvent.change(search, { target: { value: 'alpha' } }));
    search.focus();
    const publications: unknown[] = [];
    const unsubscribe = useOperationalDrawerContributionStore.subscribe((state) => {
      publications.push(state.contribution);
    });
    try {
      await act(async () => root.render(renderDiagnostic('Current cause B')));
      expect(container.querySelector('input[type="search"]')).toBe(search);
      expect(search.closest('[role="tabpanel"]')).toBe(panel);
      expect(search.value).toBe('alpha');
      expect(document.activeElement).toBe(search);
      expect([...container.querySelectorAll('tbody td')].map((cell) => cell.textContent)).toEqual([
        'alpha',
      ]);
      expect(useOperationalDrawerContributionStore.getState().activeTab).toBe('data:operation');
      expect(publications).not.toContain(null);
    } finally {
      unsubscribe();
    }
    const changed = useOperationalDrawerContributionStore.getState().contribution;
    expect(changed).not.toBe(first);
    expect(changed?.problems.items.find((p) => p.id === 'plan_integrity')?.message).toBe(
      'Current cause B'
    );
    await act(async () => root.render(null));
    expect(useOperationalDrawerContributionStore.getState().contribution).toBeNull();
  });

  it('does not let late cleanup clear a newer route owner', async () => {
    const shell = buildCanvasShellProps();
    await act(async () =>
      root.render(
        <CanvasOperationalDrawerContributionRegistrar
          policy={shell.layout.surfaceStrategy!.operationalDrawer!}
          panels={shell.panels}
          chromeState={shell.chromeState}
          runControls={shell.runControls}
          onPreviewExecutionPlan={vi.fn()}
          onStartRun={vi.fn()}
          selectionRecoveryCommands={shell.chromeCommands.executionSelectionRecovery}
          dataSampleTabs={[]}
        />
      )
    );
    const current = useOperationalDrawerContributionStore.getState().contribution!;
    const newer = { ...current, title: 'Newer route owner' };
    await act(async () =>
      useOperationalDrawerContributionStore.getState().registerOperationalDrawerContribution(newer)
    );
    await act(async () => root.render(null));
    expect(useOperationalDrawerContributionStore.getState().contribution).toBe(newer);
  });

  it('releases the committed owner when a replacement render never commits', async () => {
    const shell = buildCanvasShellProps();
    let resume!: () => void;
    const pending = new Promise<void>((resolve) => {
      resume = resolve;
    });
    function AwaitReplacement({ suspended }: { suspended: boolean }): null {
      if (suspended) throw pending;
      return null;
    }
    const view = (suspended: boolean): React.ReactElement => (
      <React.Suspense fallback={null}>
        <CanvasOperationalDrawerContributionRegistrar
          policy={shell.layout.surfaceStrategy!.operationalDrawer!}
          panels={shell.panels}
          chromeState={{ ...shell.chromeState, canPlanGraph: !suspended }}
          runControls={shell.runControls}
          onPreviewExecutionPlan={vi.fn()}
          onStartRun={vi.fn()}
          selectionRecoveryCommands={shell.chromeCommands.executionSelectionRecovery}
          dataSampleTabs={[]}
        />
        <AwaitReplacement suspended={suspended} />
      </React.Suspense>
    );
    await act(async () => root.render(view(false)));
    const committed = useOperationalDrawerContributionStore.getState().contribution;
    await act(async () => React.startTransition(() => root.render(view(true))));
    expect(useOperationalDrawerContributionStore.getState().contribution).toBe(committed);
    await act(async () => root.render(null));
    expect(useOperationalDrawerContributionStore.getState().contribution).toBeNull();
    await act(async () => resume());
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
