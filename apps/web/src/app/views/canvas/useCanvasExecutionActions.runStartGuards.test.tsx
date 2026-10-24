// @vitest-environment jsdom

import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import type { PlanViewModel } from '../../types/plans';
import { createCanvasExecutionSelectionIntent } from '../../types/canvasExecutionSelection';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { canvasViewCopy, resolveCanvasViewCopy } from './copy';
import { executeCanvasRunStartAction } from './canvasRunStartAction';
import * as executionGraph from './canvasExecutionGraph';

import { observePlanRunReadiness } from './canvasPlanReadiness';
import { presentCanvasRunStartFailure } from './canvasReadinessPresentation';
import {
  buildCanonicalEdges,
  buildCanonicalNodes,
  buildPersistedPreviewPlan,
  buildRunnableExecutionPlan,
  createPlansServiceMock,
  createRunsServiceMock,
  createSessionContext,
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

const unavailableRunStartScenarios: readonly UnavailableRunStartScenario[] = [
  {
    name: 'does not call startRun and reopens the modal when planRef is missing',
    currentPlan: {
      ...mockExecutionPlan,
      planRef: undefined,
    },
    expectedSummary: canvasViewCopy.runPlanRefUnavailableMessage,
    expectedError: 'Execution Preview reference is unavailable for this mode',
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
    expectedError: canvasViewCopy.runPersistedPreviewRequiredMessage,
    expectedModalState: 'true',
    expectedBlocker: 'plan_integrity',
  },
  {
    name: 'keeps startRun unavailable when route permissions block run execution',
    canRun: false,
    expectedSummary: canvasViewCopy.planStatusRunAuthorizationDeniedMessage,
    expectedError: canvasViewCopy.planStatusRunAuthorizationDeniedMessage,
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
    expectedError: canvasViewCopy.runPersistedPreviewRequiredMessage,
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
  it('blocks the actual Run command after a persisted Preview is rejected', async () => {
    const plan = buildPersistedPreviewPlan();
    const plansService = createPlansServiceMock(plan);
    vi.mocked(plansService.previewPlan).mockResolvedValue({
      kind: 'plan-invalid',
      plan: { ...plan, planRef: plan.planRef! },
      validation: {
        status: 'ERROR',
        planId: plan.planId,
        adapterId: 'temporal',
        code: 'MISSING_CAPABILITY',
        degradable: false,
        reason: 'Current capability rejection',
      },
    });
    const runsService = createRunsServiceMock();
    harness = renderExecutionActionsHarness({
      plansService,
      runsService,
      stateful: true,
      canonicalNodes: buildCanonicalNodes(),
    });
    await harness.render();
    await harness.clickPlan();
    expect(plansService.previewPlan).toHaveBeenCalledTimes(1);
    expect(harness.text('can-start-run')).toBe('false');
    await harness.clickStartRun();
    expect(runsService.startRun).not.toHaveBeenCalled();
    expect(harness.shellFeedback.error).toHaveBeenCalledWith('Current capability rejection');
  });

  it('reuses graph analysis for presentation and admission, invalidating changed graph inputs and scope', async () => {
    const evaluateGraph = vi.spyOn(executionGraph, 'evaluateCanvasExecutionGraph');
    try {
      const nodes = buildCanonicalNodes();
      harness = renderExecutionActionsHarness({
        plansService: createPlansServiceMock(),
        runsService: createRunsServiceMock(),
        currentPlan: null,
        canonicalNodes: nodes,
        canonicalEdges: buildCanonicalEdges(),
        workspaceNodeIds: nodes.map((node) => node.id),
      });
      await harness.render();
      expect(evaluateGraph).toHaveBeenCalledTimes(1);
      await harness.openPlanModal();
      await act(async () =>
        useApplicationLanguageStore.getState().configureApplicationLanguage('es')
      );
      await harness.rerender({ currentPlan: buildPersistedPreviewPlan(), canRun: false });
      expect(evaluateGraph).toHaveBeenCalledTimes(1);
      expect(harness.text('can-start-run')).toBe('false');
      await harness.rerender({ canonicalNodes: [...buildCanonicalNodes()] });
      expect(evaluateGraph).toHaveBeenCalledTimes(2);
      await harness.rerender({
        selectionIntent: createCanvasExecutionSelectionIntent(['model-node']),
      });
      expect(evaluateGraph).toHaveBeenCalledTimes(3);
      await harness.rerender({ executionEnvironmentId: 'production' });
      expect(evaluateGraph).toHaveBeenCalledTimes(4);
      await harness.rerender({ canonicalEdges: [...buildCanonicalEdges()] });
      expect(evaluateGraph).toHaveBeenCalledTimes(5);
      await harness.rerender({ workspaceNodeIds: ['model-node'] });
      expect(evaluateGraph).toHaveBeenCalledTimes(6);
    } finally {
      evaluateGraph.mockRestore();
    }
  });
  it.each([
    ['draft_saving', 'planStatusDraftSavingMessage'],
    ['draft_unavailable', 'planStatusDraftUnavailableMessage'],
    ['authorization_denied', 'planStatusRunAuthorizationDeniedMessage'],
    ['capability_mismatch', 'canvasExecutionUnavailableMessage'],
  ] as const)(
    'preserves %s through the actual Run command without transport',
    async (reason, messageKey) => {
      const runsService = createRunsServiceMock();
      const observeReadiness = vi.fn(() =>
        observePlanRunReadiness({
          runAdmission: { allowed: false, reason },
          currentPlan: buildRunnableExecutionPlan(),
          isCurrentPlanStale: false,
          previewProvenanceMismatch: false,
          executionAvailable: true,
          graphFailure: null,
          previewRejection: null,
        })
      );
      const result = await executeCanvasRunStartAction({
        observeReadiness,
        runsService,
        sessionContext: createSessionContext(),
      });
      expect(observeReadiness).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('Expected denied Run.');
      expect(presentCanvasRunStartFailure(result.failure)).toEqual({
        message: canvasViewCopy[messageKey],
        shouldOpenPlanModal: false,
      });
      expect(runsService.startRun).not.toHaveBeenCalled();
    }
  );

  it('reevaluates changed admission at invocation instead of consuming an earlier ready boolean', async () => {
    let permission = true;
    const observeReadiness = vi.fn(() =>
      observePlanRunReadiness({
        runAdmission: permission
          ? { allowed: true }
          : { allowed: false, reason: 'authorization_denied' },
        currentPlan: buildPersistedPreviewPlan(),
        isCurrentPlanStale: false,
        previewProvenanceMismatch: false,
        executionAvailable: true,
        graphFailure: null,
        previewRejection: null,
      })
    );
    expect(observeReadiness().status).toBe('ready');
    permission = false;
    const runsService = createRunsServiceMock();
    const result = await executeCanvasRunStartAction({
      observeReadiness,
      runsService,
      sessionContext: createSessionContext(),
    });
    expect(result).toMatchObject({
      ok: false,
      failure: {
        kind: 'readiness',
        readiness: { primaryBlocker: 'authorization_denied', target: null },
      },
    });
    expect(observeReadiness).toHaveBeenCalledTimes(2);
    expect(runsService.startRun).not.toHaveBeenCalled();
  });

  let harness: ExecutionActionsHarness | null = null;

  beforeEach(() => {
    resetExecutionActionsTestDoubles();
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
  });

  afterEach(() => {
    harness?.cleanup();
    harness = null;
    useApplicationLanguageStore.getState().configureApplicationLanguage('en');
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

  it('closes Preview so a rejected StartRun remains visible to the author', async () => {
    const rejectionMessage =
      'Execution runtime readiness is unavailable. Canvas authoring remains available; try again later.';
    const runsService = createRunsServiceMock({
      startRun: vi.fn(async () => {
        throw new Error(rejectionMessage);
      }),
    });
    const rejectedScenario = await renderRunStartHarness({ runsService });
    harness = rejectedScenario.harness;

    await harness.openPlanModal();
    expect(harness.text('plan-modal-state')).toBe('true');

    await harness.clickStartRun();

    expect(runsService.startRun).toHaveBeenCalledTimes(1);
    expect(harness.text('plan-modal-state')).toBe('false');
    expect(harness.shellFeedback.error).toHaveBeenCalledWith(rejectionMessage);
  });

  it('blocks readiness and run start when a persisted plan exists but the graph is no longer executable', async () => {
    const runsService = createRunsServiceMock();
    const invalidGraphScenario = await renderRunStartHarness({
      runsService,
      currentPlan: buildPersistedPreviewPlan(),
      canonicalNodes: buildCanonicalNodes().slice(0, 1),
      canonicalEdges: [],
    });
    harness = invalidGraphScenario.harness;

    expect(harness.text('can-start-run')).toBe('false');
    expect(harness.text('plan-run-readiness-status')).toBe('blocked');
    expect(harness.text('plan-run-readiness-blockers')).toContain('plan_integrity');
    const readinessSummary = harness.text('plan-status-summary');
    if (!readinessSummary) {
      throw new Error('Expected the blocked run to expose its readiness summary.');
    }

    await expectRunStartBlocked({
      runsService,
      harness,
      expectedError: readinessSummary,
      expectedModalState: 'false',
    });
  });

  it('recomputes an unchanged readiness summary when the application language changes', async () => {
    const scenario = await renderRunStartHarness({ currentPlan: null });
    harness = scenario.harness;

    expect(harness.text('plan-status-summary')).toBe(
      resolveCanvasViewCopy('en').planStatusPreviewRequiredMessage
    );

    await act(async () => {
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    });

    expect(harness.text('plan-status-summary')).toBe(
      resolveCanvasViewCopy('es').planStatusPreviewRequiredMessage
    );
  });
});
