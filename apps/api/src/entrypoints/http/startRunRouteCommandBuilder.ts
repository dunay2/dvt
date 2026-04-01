import type { StartRunCommand } from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';
import { parseStartRunPlannerEnvelope } from './startRunRoutePlannerEnvelopeMapper.js';
import { parseStartRunPlanRef } from './startRunRoutePlanRefParser.js';
import { evaluateStartRunPlanSource } from './startRunRoutePlanSourcePolicy.js';
import { parseStartRunSelection } from './startRunRouteSelectionParser.js';
import { parseStartRunTargetAdapter } from './startRunRouteTargetAdapterParser.js';

export function parseStartRunCommand(
  record: Record<string, unknown>
): RouteParseResult<StartRunCommand> {
  const selection = parseStartRunSelection(record.selection);
  if (!selection.ok) {
    return selection;
  }

  const runId = parseStartRunRunId(record.runId);
  if (!runId.ok) {
    return runId;
  }

  const targetAdapter = parseStartRunTargetAdapter(record.targetAdapter);
  if (!targetAdapter.ok) {
    return targetAdapter;
  }

  const sourceDecision = evaluateStartRunPlanSource(record);
  if (!sourceDecision.ok) {
    return sourceDecision;
  }

  if (sourceDecision.value.kind === 'planRef') {
    return buildPlanRefStartRunCommand({
      rawPlanRef: record.planRef,
      runId: runId.value,
      targetAdapter: targetAdapter.value,
      selection: selection.value,
    });
  }

  return buildPlannerBackedStartRunCommand({
    record,
    runId: runId.value,
    targetAdapter: targetAdapter.value,
    selection: selection.value,
  });
}

export function buildPlanRefStartRunCommand(input: {
  readonly rawPlanRef: unknown;
  readonly runId: string;
  readonly targetAdapter: StartRunCommand['targetAdapter'];
  readonly selection: ReadonlyArray<string>;
}): RouteParseResult<StartRunCommand> {
  const planRef = parseStartRunPlanRef(input.rawPlanRef);
  if (!planRef.ok) {
    return planRef;
  }

  return {
    ok: true,
    value: {
      planRef: planRef.value,
      runId: input.runId,
      targetAdapter: input.targetAdapter,
      selection: input.selection,
    },
  };
}

export function buildPlannerBackedStartRunCommand(input: {
  readonly record: Record<string, unknown>;
  readonly runId: string;
  readonly targetAdapter: StartRunCommand['targetAdapter'];
  readonly selection: ReadonlyArray<string>;
}): RouteParseResult<StartRunCommand> {
  const plannerInput = parseStartRunPlannerEnvelope(input.record, input.selection);
  if (!plannerInput.ok) {
    return plannerInput;
  }

  return {
    ok: true,
    value: {
      runId: input.runId,
      targetAdapter: input.targetAdapter,
      selection: input.selection,
      ...plannerInput.value,
    },
  };
}

function parseStartRunRunId(rawRunId: unknown): RouteParseResult<string> {
  const runId = asNonEmptyTrimmedStringOrUndefined(rawRunId);
  if (runId === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }
  return { ok: true, value: runId };
}
