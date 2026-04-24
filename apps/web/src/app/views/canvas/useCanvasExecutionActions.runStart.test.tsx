// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
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
type ExpectedModalState = 'true' | 'false';

type UnavailableRunStartScenario = Readonly<{
  name: string;
  currentPlan?: PlanViewModel | null;
  canRun?: boolean;
  expectedSummary: string;
  expectedError: string;
  expectedModalState?: ExpectedModalState;
}>;

type StartedRunConsoleScenario = Readonly<{
  name: string;
  runId: string;
  consolePanelVisible: boolean;
  assertConsoleReveal: (args: {
    setConsolePanelHeight: ReturnType<typeof vi.fn<(height: number) => void>>;
    toggleConsolePanel: ReturnType<typeof vi.fn<() => void>>;
  }) => void;
}>;

const PERSISTED_PREVIEW_REQUIRED_MESSAGE =
  'Run start requires a persisted preview plan bound to the current plan reference. Re-run Plan first.';

const unavailableRunStartScenarios: readonly UnavailableRunStartScenario[] = [
  {
    name: 'does not call startRun and reopens the modal when planRef is missing',
    currentPlan: {
      ...mockExecutionPlan,
      planRef: undefined,
    },
    expectedSummary: canvasViewCopy.runPlanRefUnavailableMessage,
    expectedError: 'Plan reference is unavailable for this mode',
    expectedModalState: 'true',
  },
  {
    name: 'blocks startRun when preview has no persisted proof',
    currentPlan: {
      ...buildRunnableExecutionPlan(),
      preview: {
        ...mockExecutionPlan.preview,
        persisted: undefined,
      },
    },
    expectedSummary: canvasViewCopy.planStatusPreviewNotPersistedMessage,
    expectedError: PERSISTED_PREVIEW_REQUIRED_MESSAGE,
    expectedModalState: 'true',
  },
  {
    name: 'keeps startRun unavailable when route permissions block run execution',
    canRun: false,
    expectedSummary: canvasViewCopy.planStatusRunUnavailableMessage,
    expectedError: canvasViewCopy.runPermissionDeniedMessage,
    expectedModalState: 'false',
  },
  {
    name: 'blocks startRun when persisted preview identity does not match the active plan',
    currentPlan: {
      ...buildRunnableExecutionPlan(),
      preview: {
        ...mockExecutionPlan.preview,
        persisted: {
          planRecordId: 'plan-record-mismatch',
          canonicalPlanSha256: 'c'.repeat(64),
        },
      },
    },
    expectedSummary: canvasViewCopy.planStatusPreviewNotAlignedMessage,
    expectedError: PERSISTED_PREVIEW_REQUIRED_MESSAGE,
    expectedModalState: 'true',
  },
] as const;

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
] as const;

async function renderRunStartHarness(
  args: {
    runsService?: ReturnType<typeof createRunsServiceMock>;
    currentPlan?: PlanViewModel | null;
    canRun?: boolean;
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
    canRun: args.canRun,
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

async function expectRunStartBlocked(args: {
  runsService: ReturnType<typeof createRunsServiceMock>;
  harness: ExecutionActionsHarness;
  expectedError: string;
  expectedModalState?: 'true' | 'false';
}): Promise<void> {
  await args.harness.clickStartRun();

  expect(args.runsService.startRun).not.toHaveBeenCalled();
  expect(args.harness.onRunStarted).not.toHaveBeenCalled();
  expect(args.harness.shellFeedback.error).toHaveBeenCalledWith(args.expectedError);
  if (args.expectedModalState) {
    expect(args.harness.text('plan-modal-state')).toBe(args.expectedModalState);
  }
}

async function expectUnavailableRunStart(args: {
  currentPlan?: PlanViewModel | null;
  canRun?: boolean;
  expectedSummary: string;
  expectedError: string;
  expectedModalState?: 'true' | 'false';
}): Promise<ExecutionActionsHarness> {
  const blockedScenario = await renderRunStartHarness({
    currentPlan: args.currentPlan,
    canRun: args.canRun,
  });
  const harness = blockedScenario.harness;

  expect(harness.text('can-start-run')).toBe('false');
  expect(harness.text('plan-status-summary')).toBe(args.expectedSummary);

  await expectRunStartBlocked({
    runsService: blockedScenario.runsService,
    harness,
    expectedError: args.expectedError,
    expectedModalState: args.expectedModalState,
  });

  return harness;
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

describe('useCanvasExecutionActions run start', () => {
  let harness: ExecutionActionsHarness | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    restoreExecutionActionsTestDoubles();
  });

  it.each(unavailableRunStartScenarios)('$name', async (scenario) => {
    harness = await expectUnavailableRunStart({
      currentPlan: scenario.currentPlan,
      canRun: scenario.canRun,
      expectedSummary: scenario.expectedSummary,
      expectedError: scenario.expectedError,
      expectedModalState: scenario.expectedModalState,
    });
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

  it.each(startedRunConsoleScenarios)('$name', async (scenario) => {
    harness = await expectStartedRunConsoleScenario(scenario);
  });
});
