// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import type { PlanViewModel } from '../../types/plans';
import { canvasViewCopy } from './copy';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  buildPersistedPreviewPlan,
  buildRunnableExecutionPlan,
  createPlansServiceMock,
  createRunsServiceMock,
  renderExecutionActionsHarness,
  resetExecutionActionsTestDoubles,
  restoreExecutionActionsTestDoubles,
} from './useCanvasExecutionActions.test.support';

type ExecutionActionsHarness = ReturnType<typeof renderExecutionActionsHarness>;

type UnavailableRunStartScenario = Readonly<{
  name: string;
  currentPlan?: PlanViewModel | null;
  canRun?: boolean;
  expectedSummary: string;
  expectedError: string;
  expectedModalState?: 'true' | 'false';
  expectedBlocker: string;
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
    expectedBlocker: 'plan_integrity',
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
    expectedBlocker: 'plan_integrity',
  },
  {
    name: 'keeps startRun unavailable when route permissions block run execution',
    canRun: false,
    expectedSummary: canvasViewCopy.planStatusRunUnavailableMessage,
    expectedError: canvasViewCopy.runPermissionDeniedMessage,
    expectedModalState: 'false',
    expectedBlocker: 'authorization_denied',
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
    expectedBlocker: 'plan_integrity',
  },
];

async function renderRunStartHarness(
  args: {
    runsService?: ReturnType<typeof createRunsServiceMock>;
    currentPlan?: PlanViewModel | null;
    canRun?: boolean;
    canonicalNodes?: ReturnType<typeof buildCanonicalNodes>;
    canonicalEdges?: ReturnType<typeof buildCanonicalEdges>;
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
    canonicalNodes: args.canonicalNodes ?? buildCanonicalNodes(),
    canonicalEdges: args.canonicalEdges ?? buildCanonicalEdges(),
    canRun: args.canRun,
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
  expectedBlocker: string;
}): Promise<ExecutionActionsHarness> {
  const blockedScenario = await renderRunStartHarness({
    currentPlan: args.currentPlan,
    canRun: args.canRun,
  });
  const harness = blockedScenario.harness;

  expect(harness.text('can-start-run')).toBe('false');
  expect(harness.text('plan-run-readiness-status')).toBe('blocked');
  expect(harness.text('plan-run-readiness-blockers')).toContain(args.expectedBlocker);
  expect(harness.text('plan-status-summary')).toBe(args.expectedSummary);

  await expectRunStartBlocked({
    runsService: blockedScenario.runsService,
    harness,
    expectedError: args.expectedError,
    expectedModalState: args.expectedModalState,
  });

  return harness;
}

describe('useCanvasExecutionActions run start guards', () => {
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
      expectedBlocker: scenario.expectedBlocker,
    });
  });

  it('blocks readiness and run start when a persisted plan exists but the graph is no longer executable', async () => {
    const runsService = createRunsServiceMock();
    const invalidGraphScenario = await renderRunStartHarness({
      runsService,
      currentPlan: buildPersistedPreviewPlan(),
      canonicalNodes: buildCanonicalNodes().slice(0, 2),
      canonicalEdges: [],
    });
    harness = invalidGraphScenario.harness;

    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-run-readiness-status')).toBe('blocked');
    expect(harness.text('plan-run-readiness-blockers')).toContain('plan_integrity');
    expect(harness.text('plan-status-summary')).toBe(
      canvasViewCopy.transformationRequiresExecutablePathMessage
    );

    await expectRunStartBlocked({
      runsService,
      harness,
      expectedError: canvasViewCopy.transformationRequiresExecutablePathMessage,
      expectedModalState: 'false',
    });
  });
});
