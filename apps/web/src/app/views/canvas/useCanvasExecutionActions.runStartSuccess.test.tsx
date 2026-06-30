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

type StartedRunOperationsScenario = Readonly<{
  name: string;
  runId: string;
  bottomDrawerVisible: boolean;
  assertOperationsReveal: (args: {
    setBottomDrawerHeight: ReturnType<typeof vi.fn<(height: number) => void>>;
    toggleBottomDrawer: ReturnType<typeof vi.fn<() => void>>;
  }) => void;
}>;

const startedRunOperationsScenarios: readonly StartedRunOperationsScenario[] = [
  {
    name: 'opens the bottom operational drawer when a run starts from a collapsed drawer',
    runId: 'run-toggle-operations',
    bottomDrawerVisible: false,
    assertOperationsReveal: ({ setBottomDrawerHeight, toggleBottomDrawer }) => {
      expect(toggleBottomDrawer).toHaveBeenCalledTimes(1);
      expect(setBottomDrawerHeight).not.toHaveBeenCalled();
    },
  },
  {
    name: 'expands the bottom operational drawer when a run starts with the drawer already visible',
    runId: 'run-expand-operations',
    bottomDrawerVisible: true,
    assertOperationsReveal: ({ setBottomDrawerHeight, toggleBottomDrawer }) => {
      expect(setBottomDrawerHeight).toHaveBeenCalledWith(160);
      expect(toggleBottomDrawer).not.toHaveBeenCalled();
    },
  },
];

async function renderRunStartHarness(
  args: {
    runsService?: ReturnType<typeof createRunsServiceMock>;
    currentPlan?: PlanViewModel | null;
    executionEnvironmentId?: string;
    bottomDrawerVisible?: boolean;
    setBottomDrawerHeight?: (height: number) => void;
    toggleBottomDrawer?: () => void;
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
    bottomDrawerVisible: args.bottomDrawerVisible,
    setBottomDrawerHeight: args.setBottomDrawerHeight,
    toggleBottomDrawer: args.toggleBottomDrawer,
  });

  await harness.render();

  return {
    runsService,
    harness,
  };
}

async function expectStartedRunOperationsScenario(
  scenario: StartedRunOperationsScenario
): Promise<ExecutionActionsHarness> {
  const setBottomDrawerHeight = vi.fn<(height: number) => void>();
  const toggleBottomDrawer = vi.fn<() => void>();
  const startedScenario = await renderRunStartHarness({
    runsService: createRunsServiceMock({
      startRun: vi.fn(async () => ({
        runId: scenario.runId,
        accepted: true,
      })),
    }),
    bottomDrawerVisible: scenario.bottomDrawerVisible,
    setBottomDrawerHeight,
    toggleBottomDrawer,
  });

  await startedScenario.harness.clickStartRun();

  scenario.assertOperationsReveal({
    setBottomDrawerHeight,
    toggleBottomDrawer,
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

  it.each(startedRunOperationsScenarios)('$name', async (scenario) => {
    harness = await expectStartedRunOperationsScenario(scenario);
  });
});
