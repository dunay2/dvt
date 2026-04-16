import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { StartRunCommand } from '../../application/ports/startRunCommandContract.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asCanonicalNonEmptyStringOrUndefined } from './startRunRouteBodyValidation.js';
import { parseStartRunPlannerEnvelope } from './startRunRoutePlannerEnvelopeMapper.js';
import { parseStartRunPlanRef } from './startRunRoutePlanRefParser.js';
import { evaluateStartRunPlanSource } from './startRunRoutePlanSourcePolicy.js';
import { parseStartRunRunExecutionContextRef } from './startRunRouteRunExecutionContextRefParser.js';
import { parseStartRunSelection } from './startRunRouteSelectionParser.js';
import { parseStartRunTargetAdapter } from './startRunRouteTargetAdapterParser.js';

export function parseStartRunCommand(
  record: Record<string, unknown>,
  adapterRegistry: IStartRunTargetAdapterRegistry = DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY
): RouteParseResult<StartRunCommand> {
  const selection = parseStartRunSelection(record.selection);
  if (!selection.ok) {
    return selection;
  }

  const runId = parseStartRunRunId(record.runId);
  if (!runId.ok) {
    return runId;
  }

  const targetAdapter = parseStartRunTargetAdapter(record.targetAdapter, adapterRegistry);
  if (!targetAdapter.ok) {
    return targetAdapter;
  }

  const sourceDecision = evaluateStartRunPlanSource(record);
  if (!sourceDecision.ok) {
    return sourceDecision;
  }

  // Policy decides command shape; builders only assemble validated branches.
  if (sourceDecision.value.kind === 'planRef') {
    return buildPlanRefStartRunCommand({
      rawPlanRef: record.planRef,
      rawRunExecutionContextRef: record.runExecutionContextRef,
      runId: runId.value,
      targetAdapter: targetAdapter.value,
      selection: selection.value,
    });
  }

  return buildPlannerBackedStartRunCommand({
    record,
    rawRunExecutionContextRef: record.runExecutionContextRef,
    runId: runId.value,
    targetAdapter: targetAdapter.value,
    selection: selection.value,
  });
}

export function buildPlanRefStartRunCommand(input: {
  readonly rawPlanRef: unknown;
  readonly rawRunExecutionContextRef: unknown;
  readonly runId: string;
  readonly targetAdapter: StartRunCommand['targetAdapter'];
  readonly selection: ReadonlyArray<string>;
}): RouteParseResult<StartRunCommand> {
  const planRef = parseStartRunPlanRef(input.rawPlanRef);
  if (!planRef.ok) {
    return planRef;
  }

  const runExecutionContextRef = parseOptionalRunExecutionContextRef(
    input.rawRunExecutionContextRef
  );
  if (!runExecutionContextRef.ok) {
    return runExecutionContextRef;
  }

  return {
    ok: true,
    value: {
      planRef: planRef.value,
      ...(runExecutionContextRef.value === undefined
        ? {}
        : { runExecutionContextRef: runExecutionContextRef.value }),
      runId: input.runId,
      targetAdapter: input.targetAdapter,
      selection: input.selection,
    },
  };
}

export function buildPlannerBackedStartRunCommand(input: {
  readonly record: Record<string, unknown>;
  readonly rawRunExecutionContextRef: unknown;
  readonly runId: string;
  readonly targetAdapter: StartRunCommand['targetAdapter'];
  readonly selection: ReadonlyArray<string>;
}): RouteParseResult<StartRunCommand> {
  const plannerInput = parseStartRunPlannerEnvelope(input.record);
  if (!plannerInput.ok) {
    return plannerInput;
  }

  const runExecutionContextRef = parseOptionalRunExecutionContextRef(
    input.rawRunExecutionContextRef
  );
  if (!runExecutionContextRef.ok) {
    return runExecutionContextRef;
  }

  return {
    ok: true,
    value: {
      runId: input.runId,
      targetAdapter: input.targetAdapter,
      selection: input.selection,
      ...(runExecutionContextRef.value === undefined
        ? {}
        : { runExecutionContextRef: runExecutionContextRef.value }),
      ...plannerInput.value,
    },
  };
}

function parseStartRunRunId(rawRunId: unknown): RouteParseResult<string> {
  const runId = asCanonicalNonEmptyStringOrUndefined(rawRunId);
  if (runId === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }
  return { ok: true, value: runId };
}

function parseOptionalRunExecutionContextRef(
  raw: unknown
): RouteParseResult<StartRunCommand['runExecutionContextRef']> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  return parseStartRunRunExecutionContextRef(raw);
}
