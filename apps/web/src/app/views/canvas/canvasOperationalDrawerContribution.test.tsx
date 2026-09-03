/** Owned concern: prove Canvas operational drawer read-model projection. */
import { describe, expect, it, vi } from 'vitest';

import type { OperationalDrawerDataSample } from '../../components/shell/operationalDrawerContributionStore';
import { buildCanvasShellProps, buildPlanRunReadiness } from './CanvasShell.testHarness';
import { buildCanvasOperationalDrawerContribution } from './canvasOperationalDrawerContribution';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';

describe('buildCanvasOperationalDrawerContribution', () => {
  it('projects readiness blockers into actionable Problems and Preview counters', () => {
    const props = buildCanvasShellProps({
      chromeState: {
        canPlanGraph: true,
        canStartRun: false,
        planRunReadiness: buildPlanRunReadiness({
          blockers: ['plan_integrity', 'backpressure'],
          summary: 'Preview required before running.',
        }),
        planStatusSummary: 'Preview required before running.',
      },
    });
    const onPreviewExecutionPlan = vi.fn();

    const contribution = buildCanvasOperationalDrawerContribution({
      policy: props.layout.surfaceStrategy!.operationalDrawer!,
      canPlan: props.panels.userPermissions.canPlan,
      activeRunId: props.panels.activeRunId ?? null,
      canPlanGraph: props.chromeState.canPlanGraph,
      canStartRun: props.chromeState.canStartRun,
      planRunReadiness: props.chromeState.planRunReadiness,
      planStatusSummary: props.chromeState.planStatusSummary,
      onPreviewExecutionPlan,
      onStartRun: vi.fn(),
    });

    expect(contribution.tabs).toEqual([
      { id: 'log', label: 'Log', count: null },
      { id: 'problems', label: 'Problems', count: 2 },
      { id: 'runs', label: 'Runs', count: 1 },
      { id: 'preview', label: 'Preview', count: 2 },
      { id: 'data', label: 'Data', count: null },
    ]);
    expect(contribution.problems.items).toEqual([
      expect.objectContaining({
        id: 'plan_integrity',
        severity: 'warning',
        detail: 'Preview',
        action: expect.objectContaining({ label: 'Create Execution Preview' }),
      }),
      expect.objectContaining({
        id: 'backpressure',
        severity: 'warning',
        detail: 'Backpressure',
        action: null,
      }),
    ]);
    expect(contribution.runs).toMatchObject({
      activeRunId: null,
      canStartRun: false,
      status: 'blocked',
      summary: 'Preview required before running.',
    });
    expect(contribution.preview).toMatchObject({
      status: 'blocked',
      blockers: ['Preview', 'Backpressure'],
      canPreview: true,
    });
  });

  it('keeps run and preview status compact when the graph is ready', () => {
    const props = buildCanvasShellProps({
      panels: {
        activeRunId: null,
      },
      chromeState: {
        canPlanGraph: true,
        canStartRun: true,
        planRunReadiness: buildPlanRunReadiness({
          blockers: [],
          status: 'ready',
          summary: 'Preview ready.',
        }),
        planStatusSummary: 'Preview ready.',
      },
    });

    const contribution = buildCanvasOperationalDrawerContribution({
      policy: props.layout.surfaceStrategy!.operationalDrawer!,
      canPlan: props.panels.userPermissions.canPlan,
      activeRunId: props.panels.activeRunId ?? null,
      canPlanGraph: props.chromeState.canPlanGraph,
      canStartRun: props.chromeState.canStartRun,
      planRunReadiness: props.chromeState.planRunReadiness,
      planStatusSummary: props.chromeState.planStatusSummary,
      onPreviewExecutionPlan: vi.fn(),
      onStartRun: vi.fn(),
    });

    expect(contribution.tabs.find((tab) => tab.id === 'problems')?.count).toBe(0);
    expect(contribution.tabs.find((tab) => tab.id === 'runs')?.count).toBeNull();
    expect(contribution.tabs.find((tab) => tab.id === 'preview')?.count).toBeNull();
    expect(contribution.problems.items).toEqual([]);
    expect(contribution.runs).toMatchObject({
      status: 'ready',
      summary: 'Run is ready after the current execution preview.',
    });
    expect(contribution.preview).toMatchObject({
      status: 'ready',
      summary: 'Preview ready.',
      blockers: [],
    });
  });

  it('projects only explicitly supplied backend run controls', () => {
    const props = buildCanvasShellProps({ panels: { activeRunId: 'run-active' } });
    const runControls = {
      runId: 'run-active',
      availability: {
        cancel: { available: true as const },
        recover: { available: false as const, reason: 'run_active' as const },
      },
      activity: null,
      outcome: null,
      failure: null,
      onCancel: vi.fn(),
      onRecover: vi.fn(),
    };

    const contribution = buildCanvasOperationalDrawerContribution({
      policy: props.layout.surfaceStrategy!.operationalDrawer!,
      canPlan: props.panels.userPermissions.canPlan,
      activeRunId: 'run-active',
      runControls,
      canPlanGraph: props.chromeState.canPlanGraph,
      canStartRun: props.chromeState.canStartRun,
      planRunReadiness: props.chromeState.planRunReadiness,
      planStatusSummary: props.chromeState.planStatusSummary,
      onPreviewExecutionPlan: vi.fn(),
      onStartRun: vi.fn(),
    });

    expect(contribution.runs.controls).toBe(runControls);
  });

  it('names the data tab after the active card without exposing the sample size', () => {
    const props = buildCanvasShellProps();
    const dataSamples: readonly Exclude<
      OperationalDrawerDataSample,
      Readonly<{ status: 'idle' }>
    >[] = [
      { status: 'loading', nodeName: 'warehouse_orders' },
      {
        status: 'ready',
        nodeName: 'curated_customers',
        sample: {
          contractVersion: 1,
          connectionId: 'postgresql-local',
          objectId: 'relation/dvt/public/curated_customers',
          columns: [{ name: 'record_id', type: 'integer', nullable: false }],
          rows: [{ values: ['1'] }, { values: ['2'] }],
          limit: 20,
          truncated: false,
          sampledAt: '2026-09-03T10:00:00.000Z',
        },
      },
      { status: 'error', nodeName: 'finance_daily', reason: 'unavailable' },
    ];

    for (const dataSample of dataSamples) {
      const contribution = buildCanvasOperationalDrawerContribution({
        policy: props.layout.surfaceStrategy!.operationalDrawer!,
        canPlan: props.panels.userPermissions.canPlan,
        activeRunId: null,
        canPlanGraph: props.chromeState.canPlanGraph,
        canStartRun: props.chromeState.canStartRun,
        planRunReadiness: props.chromeState.planRunReadiness,
        planStatusSummary: props.chromeState.planStatusSummary,
        dataSample,
        onPreviewExecutionPlan: vi.fn(),
        onStartRun: vi.fn(),
      });

      expect(contribution.tabs.find((tab) => tab.id === 'data')).toMatchObject({
        label: dataSample.nodeName,
        count: null,
      });
    }
  });

  it('projects blocked selection recovery without admitting Preview', () => {
    const props = buildCanvasShellProps();
    const recoveryCommands = {
      discardUnavailable: vi.fn(),
      useWorkspaceScope: vi.fn(),
      refreshAnalysis: vi.fn(),
    };
    const selectionRecovery = {
      queryRail: 'CollectCanvasExecutionSelection' as const,
      commandRail: 'RecoverCanvasExecutionSelection' as const,
      status: 'blocked' as const,
      selectionMode: 'explicit' as const,
      requestedRootNodeIds: ['model.removed', 'model.orders'],
      unavailableRootNodeIds: ['model.removed'],
      nonExecutableRootNodeIds: [],
      derivedDependencyNodeIds: [],
      admittedScopeNodeIds: [],
      lastPreviewRevision: 'analysis-sha-1',
      canDiscardUnavailable: true,
      canUseWorkspaceScope: true,
      canRefreshAnalysis: true,
      pendingStrategy: null,
      receipt: null,
      failure: null,
    };

    const contribution = buildCanvasOperationalDrawerContribution({
      policy: props.layout.surfaceStrategy!.operationalDrawer!,
      canPlan: props.panels.userPermissions.canPlan,
      activeRunId: null,
      canPlanGraph: false,
      canStartRun: false,
      planRunReadiness: props.chromeState.planRunReadiness,
      planStatusSummary: props.chromeState.planStatusSummary,
      selectionRecovery,
      selectionRecoveryCommands: recoveryCommands,
      onPreviewExecutionPlan: vi.fn(),
      onStartRun: vi.fn(),
    });

    expect(contribution.problems.items).toContainEqual(
      expect.objectContaining({
        id: 'execution_selection',
        severity: 'warning',
        message: 'A preview cannot be created with the current selection.',
      })
    );
    expect(contribution.preview).toMatchObject({
      status: 'blocked',
      blockers: expect.arrayContaining(['Run selection']),
      canPreview: false,
      selectionRecovery: { model: selectionRecovery, commands: recoveryCommands },
    });
  });

  it('projects the complete Spanish drawer contribution without English presentation copy', () => {
    const props = buildCanvasShellProps({
      chromeState: {
        canPlanGraph: true,
        canStartRun: false,
        planRunReadiness: buildPlanRunReadiness({
          blockers: ['plan_integrity', 'authorization_denied'],
          summary: 'Se requiere una vista previa antes de ejecutar.',
        }),
        planStatusSummary: 'Se requiere una vista previa antes de ejecutar.',
      },
    });
    const copy = resolveCanvasViewCopy('es');

    const contribution = buildCanvasOperationalDrawerContribution({
      policy: props.layout.surfaceStrategy!.operationalDrawer!,
      canPlan: props.panels.userPermissions.canPlan,
      activeRunId: null,
      canPlanGraph: props.chromeState.canPlanGraph,
      canStartRun: props.chromeState.canStartRun,
      planRunReadiness: props.chromeState.planRunReadiness,
      planStatusSummary: props.chromeState.planStatusSummary,
      copy,
      selectionRecoveryMessages: copy,
      onPreviewExecutionPlan: vi.fn(),
      onStartRun: vi.fn(),
    });

    expect(contribution).toMatchObject({
      title: 'Operaciones del Canvas',
      copy: {
        problemsAriaLabel: 'Problemas del Canvas',
        noProblemsMessage: 'No hay problemas actuales en el Canvas.',
        runsAriaLabel: 'Ejecuciones del Canvas',
        runBlockedStatus: 'Ejecución bloqueada',
        previewAriaLabel: 'Vista previa de ejecución del Canvas',
        previewAction: 'Crear Execution Preview',
        previewBlockedStatus: 'Vista previa bloqueada',
        tabsAriaLabel: 'Cajón operativo del Canvas',
        severity: { info: 'Información', warning: 'Advertencia', error: 'Error' },
      },
      tabs: [
        { id: 'log', label: 'Registro', count: null },
        { id: 'problems', label: 'Problemas', count: 2 },
        { id: 'runs', label: 'Ejecuciones', count: 1 },
        { id: 'preview', label: 'Vista previa', count: 2 },
        { id: 'data', label: 'Datos', count: null },
      ],
    });
    expect(contribution.problems.items.map((problem) => problem.detail)).toEqual([
      'Vista previa',
      'Autorización denegada',
    ]);
    expect(contribution.problems.items[0]?.action?.label).toBe('Crear Execution Preview');
    expect(contribution.preview.blockers).toEqual(['Vista previa', 'Autorización denegada']);
  });
});
