/** Owned concern: submit Run only from a freshly admitted readiness target. */
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { PlanRunReadinessEvaluation } from './canvasPlanReadiness';
import type { CanvasRunStartFailure } from './canvasExecutionActions.types';
import { collectPlanSelection } from './canvasRunSelection';

export type CanvasRunStartActionResult =
  Readonly<{ ok: false; failure: CanvasRunStartFailure }> | Readonly<{ ok: true; runId: string }>;

export async function executeCanvasRunStartAction(
  args: Readonly<{
    observeReadiness: () => PlanRunReadinessEvaluation;
    runsService: IRunsPort;
    sessionContext: SessionContextPort;
  }>
): Promise<CanvasRunStartActionResult> {
  try {
    const readiness = args.observeReadiness();
    if (readiness.status === 'blocked')
      return { ok: false, failure: { kind: 'readiness', readiness } };
    const { plan, planRef } = readiness.target;
    const receipt = await args.runsService.startRun({
      planRef,
      workspaceScope: args.sessionContext.getWorkspaceScopeSnapshot(),
      selection: collectPlanSelection(plan),
    });
    return { ok: true, runId: receipt.runId };
  } catch (error) {
    return {
      ok: false,
      failure: { kind: 'submission', message: error instanceof Error ? error.message : null },
    };
  }
}
