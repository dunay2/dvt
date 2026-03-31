import {
  START_RUN_TARGET_ADAPTER,
  type StartRunCommand,
} from '../../application/ports/startRunCommandContract.js';
import { type AuthorizationAction, type RequestedScope } from '../../domain/auth/types.js';

import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import {
  asNonEmptyTrimmedStringOrUndefined,
  parseStartRunBodyRecord,
} from './startRunRouteBodyValidation.js';
import { parseStartRunPlannerEnvelope } from './startRunRoutePlannerEnvelopeMapper.js';
import { parseStartRunPlanRef } from './startRunRoutePlanRefParser.js';
import { parseStartRunScope } from './startRunRouteScopeParser.js';

type ParsedStartRunRequest = {
  readonly command: StartRunCommand;
  readonly requestedScope: RequestedScope & {
    readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
  };
};

type ParseStartRunRequestResult = RouteParseResult<ParsedStartRunRequest>;

export function parseStartRunBody(body: unknown): ParseStartRunRequestResult {
  const bodyRecord = parseStartRunBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const scope = parseStartRunScope(bodyRecord.value);
  if (!scope.ok) {
    return scope;
  }

  const command = parseStartRunCommand(bodyRecord.value);
  if (!command.ok) {
    return command;
  }

  return {
    ok: true,
    value: {
      command: command.value,
      requestedScope: {
        tenantId: scope.value.tenantId,
        projectId: scope.value.projectId,
        environmentId: scope.value.environmentId,
        action: { kind: 'command', name: 'run:start' },
      },
    },
  };
}

function parseSelection(
  selection: unknown
): { readonly ok: true; readonly value: ReadonlyArray<string> } | { readonly ok: false } {
  if (Array.isArray(selection)) {
    if (selection.every((item) => typeof item === 'string')) {
      const normalized = (selection as ReadonlyArray<string>)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
      if (normalized.length === selection.length) {
        return { ok: true, value: normalized };
      }
    }
  }

  return { ok: false };
}

function parseTargetAdapter(
  raw: unknown
):
  | { readonly ok: true; readonly value: StartRunCommand['targetAdapter'] }
  | { readonly ok: false } {
  const normalized = asNonEmptyTrimmedStringOrUndefined(raw);
  if (
    normalized === START_RUN_TARGET_ADAPTER.temporal ||
    normalized === START_RUN_TARGET_ADAPTER.mock
  ) {
    return { ok: true, value: normalized };
  }
  return { ok: false };
}

function parseStartRunCommand(record: Record<string, unknown>): RouteParseResult<StartRunCommand> {
  const selectionResult = validateSelection(record);
  if (!selectionResult.ok) return selectionResult.error;
  const runIdResult = validateRunId(record);
  if (!runIdResult.ok) return runIdResult.error;
  const targetAdapterResult = validateTargetAdapter(record);
  if (!targetAdapterResult.ok) return targetAdapterResult.error;
  const planSourceResult = validatePlanSource(record);
  if (!planSourceResult.ok) return planSourceResult.error;

  const { selection } = selectionResult;
  const { runId } = runIdResult;
  const { targetAdapter } = targetAdapterResult;
  const { hasPlanRef } = planSourceResult;

  if (hasPlanRef) {
    return buildPlanRefCommand(record.planRef, runId, targetAdapter, selection);
  }
  return buildPlannerBackedCommand(record, runId, targetAdapter, selection);
}

function validateSelection(
  record: Record<string, unknown>
):
  | { ok: true; selection: ReadonlyArray<string> }
  | { ok: false; error: RouteParseResult<StartRunCommand> } {
  const selection = parseSelection(record.selection);
  if (!selection.ok)
    return { ok: false, error: badRequestResult('invalid_selection', { target: 'selection' }) };
  return { ok: true, selection: selection.value };
}

function validateRunId(
  record: Record<string, unknown>
): { ok: true; runId: string } | { ok: false; error: RouteParseResult<StartRunCommand> } {
  const runId = asNonEmptyTrimmedStringOrUndefined(record.runId);
  if (runId === undefined) {
    return { ok: false, error: badRequestResult('invalid_run_id', { target: 'runId' }) };
  }
  return { ok: true, runId };
}

function validateTargetAdapter(
  record: Record<string, unknown>
):
  | { ok: true; targetAdapter: StartRunCommand['targetAdapter'] }
  | { ok: false; error: RouteParseResult<StartRunCommand> } {
  const targetAdapter = parseTargetAdapter(record.targetAdapter);
  if (!targetAdapter.ok) {
    return {
      ok: false,
      error: badRequestResult('invalid_target_adapter', { target: 'targetAdapter' }),
    };
  }
  return { ok: true, targetAdapter: targetAdapter.value };
}

function validatePlanSource(
  record: Record<string, unknown>
): { ok: true; hasPlanRef: boolean } | { ok: false; error: RouteParseResult<StartRunCommand> } {
  const plannerSourceCount = countPlannerSources(record);
  const hasPlanRef = record.planRef !== undefined;
  if (hasPlanRef && plannerSourceCount > 0) {
    return { ok: false, error: badRequestResult('conflicting_plan_inputs') };
  }
  if (!hasPlanRef && plannerSourceCount !== 1) {
    return { ok: false, error: badRequestResult('invalid_plan_source') };
  }
  return { ok: true, hasPlanRef };
}

function countPlannerSources(record: Record<string, unknown>): number {
  return ['graphSource', 'manifestRef', 'manifest', 'nodes'].filter(
    (key) => record[key] !== undefined
  ).length;
}

function buildPlanRefCommand(
  rawPlanRef: unknown,
  runId: string,
  targetAdapter: StartRunCommand['targetAdapter'],
  selection: ReadonlyArray<string>
): RouteParseResult<StartRunCommand> {
  const planRef = parseStartRunPlanRef(rawPlanRef);
  if (!planRef.ok) {
    return planRef;
  }

  return {
    ok: true,
    value: {
      planRef: planRef.value,
      runId,
      targetAdapter,
      selection,
    },
  };
}

function buildPlannerBackedCommand(
  record: Record<string, unknown>,
  runId: string,
  targetAdapter: StartRunCommand['targetAdapter'],
  selection: ReadonlyArray<string>
): RouteParseResult<StartRunCommand> {
  const plannerInput = parseStartRunPlannerEnvelope(record, selection);
  if (!plannerInput.ok) {
    return plannerInput;
  }

  return {
    ok: true,
    value: {
      runId,
      targetAdapter,
      selection,
      ...plannerInput.value,
    },
  };
}
