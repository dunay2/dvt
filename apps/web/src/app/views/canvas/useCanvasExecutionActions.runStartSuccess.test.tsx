// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import type { PlanViewModel } from '../../types/plans';
import { canvasViewCopy } from './copy';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  buildRunnableExecutionPlan,
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

type ExecutionActionsHarness = ReturnType<typeof renderExecutionActionsHarness>;

type StartedRunConsoleScenario = Readonly<{
  name: string;
  runId: string;
  consolePanelVisible: boolean;
  assertConsoleReveal: (args: {
    setConsolePanelHeight: ReturnType<typeof vi.fn<(height: number) => void>>;
    toggleConsolePanel: ReturnType<typeof vi.fn<() => void>>;
  }) => void;
}>;

const startedRunConsoleScenarios: readonly StartedRunConsoleScenario[] = [
  {
    name: 'opens the console panel when a run starts from a collapsed console',
    runId: 'run-toggle-console',
    consolePanelVisible: false,
    assertConsoleReveal: ({ setConsolePanelHeight, toggleConsolePanel }) => {
      expect(toggleConsolePanel).toHaveBeenCalledTimes(1);
      expect(setConsolePanelHeight).not.toHaveBeenCalled();
    },
  },
  {
    name: 'expands the console panel when a run starts with the console already visible',
    runId: 'run-expand-console',
    consolePanelVisible: true,
    assertConsoleReveal: ({ setConsolePanelHeight, toggleConsolePanel }) => {
      expect(setConsolePanelHeight).toHaveBeenCalledWith(160);
      expect(toggleConsolePanel).not.toHaveBeenCalled();
    },
  },
];

async function renderRunStartHarness(
  args: {
    runsService?: ReturnType<typeof createRunsServiceMock>;
    currentPlan?: PlanViewModel | null;
    executionEnvironmentId?: string;
    consolePanelVisible?: boolean;
    setConsolePanelHeight?: (height: number) => void;
    toggleConsolePanel?: () => void;
  } = {}
): Promise<{
  runsService: ReturnType<typeof createRunsServiceMock>;
  harness: ExecutionActionsHarness;
}> {
  const runsService = args.runsService ?? createRunsServiceMock();
  const currentPlan =
    'currentPlan' in args ? (args.currentPlan ?? null) : buildRunnableExecutionPlan();
  const harness = renderExecutionActionsHarness({
    plansService: createPlansServiceMock(),
    runsService,
    currentPlan,
    canonicalNodes: buildCanonicalNodes(),
    canonicalEdges: buildCanonicalEdges(),
    executionEnvironmentId: args.executionEnvironmentId,
    consolePanelVisible: args.consolePanelVisible,
    setConsolePanelHeight: args.setConsolePanelHeight,
    toggleConsolePanel: args.toggleConsolePanel,
  });

  await harness.render();

  return {
    runsService,
    harness,
  };
}

async function expectStartedRunConsoleScenario(
  scenario: StartedRunConsoleScenario
): Promise<ExecutionActionsHarness> {
  const setConsolePanelHeight = vi.fn<(height: number) => void>();
  const toggleConsolePanel = vi.fn<() => void>();
  const startedScenario = await renderRunStartHarness({
    runsService: createRunsServiceMock({
      startRun: vi.fn(async () => ({
        runId: scenario.runId,
        accepted: true,
      })),
    }),
    consolePanelVisible: scenario.consolePanelVisible,
    setConsolePanelHeight,
    toggleConsolePanel,
  });

  await startedScenario.harness.clickStartRun();

  scenario.assertConsoleReveal({
    setConsolePanelHeight,
    toggleConsolePanel,
  });
  expect(startedScenario.harness.onRunStarted).toHaveBeenCalledWith(scenario.runId);

  return startedScenario.harness;
}

describe('useCanvasExecutionActions successful run start', () => {
  let harness: ExecutionActionsHarness | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it('starts run with persisted plan and forwards run id to navigation', async () => {
    const startedScenario = await renderRunStartHarness({
      runsService: createRunsServiceMock({
        startRun: vi.fn(async () => ({
          runId: 'run-success',
          accepted: true,
        })),
      }),
    });
    harness = startedScenario.harness;

    expect(harness.text('can-start-run')).toBe('true');
    expect(harness.text('plan-run-readiness-status')).toBe('ready');
    expect(harness.text('plan-run-readiness-blockers')).toBe('none');
    expect(harness.text('plan-status-summary')).toBe(canvasViewCopy.planStatusPreviewReadyMessage);

    await harness.clickStartRun();

    expect(startedScenario.runsService.startRun).toHaveBeenCalledTimes(1);
    expect(startedScenario.runsService.startRun).toHaveBeenCalledWith({
      planRef: {
        ...mockExecutionPlan.planRef,
        sha256: 'c'.repeat(64),
      },
      workspaceScope: {
        tenantId: 'tenant',
        projectId: 'project',
        environmentId: 'env',
        targetAdapter: 'temporal',
      },
      selection: {
        mode: 'explicit',
        nodeIds: [
          'stg_orders',
          'stg_customers',
          'dim_store',
          'fct_sales',
          'test_not_null_store_id',
          'test_unique_order_id',
        ],
      },
    });
    expect(harness.shellFeedback.success).toHaveBeenCalledWith(canvasViewCopy.runStartedMessage);
    expect(harness.onRunStarted).toHaveBeenCalledWith('run-success');
  });

  it('starts run with the active canvas execution environment when selected', async () => {
    const startedScenario = await renderRunStartHarness({
      runsService: createRunsServiceMock({
        startRun: vi.fn(async () => ({
          runId: 'run-prod',
          accepted: true,
        })),
      }),
      executionEnvironmentId: 'prod',
    });
    harness = startedScenario.harness;

    await harness.clickStartRun();

    expect(startedScenario.runsService.startRun).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceScope: expect.objectContaining({
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'prod',
        }),
      })
    );
  });

  it.each(startedRunConsoleScenarios)('$name', async (scenario) => {
    harness = await expectStartedRunConsoleScenario(scenario);
  });
});
