/**
 * Owned concern: assemble validated start-run commands once the shared
 * plan-source policy and field parsers have selected the allowed branch.
 */
import type { StartRunCommand } from '@dvt/contracts';

import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { asCanonicalNonEmptyStringOrUndefined } from './planRouteBodyParser.js';
import { parsePlanRoutePlannerEnvelope } from './planRoutePlannerEnvelopeParser.js';
import { parsePlanRoutePlanRef } from './planRoutePlanRefParser.js';
import { evaluatePlanRoutePlanSource } from './planRoutePlanSourcePolicy.js';
import { parsePlanRouteRunExecutionContextRef } from './planRouteRunExecutionContextRefParser.js';
import { parsePlanRouteSelection } from './planRouteSelectionParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import type { StartRunRunIdGenerator } from './startRunIdentity.js';
import { parseStartRunTargetAdapter } from './startRunRouteTargetAdapterParser.js';

const PLATFORM_START_RUN_ID_PATTERN =
  /^run_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function parseStartRunCommand(
  record: Record<string, unknown>,
  adapterRegistry: IStartRunTargetAdapterRegistry,
  runIdGenerator: StartRunRunIdGenerator
): RouteParseResult<StartRunCommand> {
  const selection = parsePlanRouteSelection(record.selection);
  if (!selection.ok) {
    return selection;
  }

  const clientRunId = rejectClientProvidedStartRunRunId(record);
  if (!clientRunId.ok) {
    return clientRunId;
  }

  const runId = parseGeneratedStartRunRunId(runIdGenerator());
  if (!runId.ok) {
    return runId;
  }

  const targetAdapter = parseStartRunTargetAdapter(record.targetAdapter, adapterRegistry);
  if (!targetAdapter.ok) {
    return targetAdapter;
  }

  const sourceDecision = evaluatePlanRoutePlanSource(record);
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
  readonly selection: StartRunCommand['selection'];
}): RouteParseResult<StartRunCommand> {
  const planRef = parsePlanRoutePlanRef(input.rawPlanRef);
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
  readonly selection: StartRunCommand['selection'];
}): RouteParseResult<StartRunCommand> {
  const plannerInput = parsePlanRoutePlannerEnvelope(input.record);
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

function rejectClientProvidedStartRunRunId(
  record: Record<string, unknown>
): RouteParseResult<undefined> {
  if (Object.hasOwn(record, 'runId')) {
    return badRequestResult(HTTP_ERROR_REASON.clientRunIdNotAllowed, { target: 'runId' });
  }

  return { ok: true, value: undefined };
}

function parseGeneratedStartRunRunId(rawRunId: unknown): RouteParseResult<string> {
  const runId = asCanonicalNonEmptyStringOrUndefined(rawRunId);
  if (runId === undefined || !PLATFORM_START_RUN_ID_PATTERN.test(runId)) {
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

  return parsePlanRouteRunExecutionContextRef(raw);
}
