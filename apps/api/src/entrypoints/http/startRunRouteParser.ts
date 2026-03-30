import {
  START_RUN_TARGET_ADAPTER,
  type StartRunCommand,
} from '../../application/ports/startRunCommandContract.js';
import { type AuthorizationAction, type RequestedScope } from '../../domain/auth/types.js';

import {
  asNonEmptyTrimmedStringOrUndefined,
  parseStartRunBodyRecord,
  type StartRunParseResult,
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

type ParseStartRunRequestResult =
  | { readonly ok: true; readonly value: ParsedStartRunRequest }
  | { readonly ok: false; readonly status: 400; readonly body: Readonly<Record<string, unknown>> };

type ParseStartRunFieldResult<T> = StartRunParseResult<T, string>;

type ParseStartRunBadRequestResult = Extract<ParseStartRunRequestResult, { readonly ok: false }>;

function badRequest(code: string): ParseStartRunBadRequestResult {
  return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code } };
}

export function parseStartRunBody(body: unknown): ParseStartRunRequestResult {
  const bodyRecord = parseStartRunBodyRecord(body);
  if (!bodyRecord.ok) {
    return badRequest(bodyRecord.code);
  }

  const scope = parseStartRunScope(bodyRecord.value);
  if (!scope.ok) {
    return badRequest(scope.code);
  }

  const command = parseStartRunCommand(bodyRecord.value);
  if (!command.ok) {
    return badRequest(command.code);
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

function parseStartRunCommand(
  record: Record<string, unknown>
): ParseStartRunFieldResult<StartRunCommand> {
  const selection = parseSelection(record.selection);
  if (!selection.ok) return { ok: false, code: 'INVALID_SELECTION' };

  const runId = asNonEmptyTrimmedStringOrUndefined(record.runId);
  if (runId === undefined) {
    return { ok: false, code: 'INVALID_RUN_ID' };
  }

  const targetAdapter = parseTargetAdapter(record.targetAdapter);
  if (!targetAdapter.ok) return { ok: false, code: 'INVALID_TARGET_ADAPTER' };

  const plannerSourceCount = countPlannerSources(record);
  const hasPlanRef = record.planRef !== undefined;
  const sourceCheck = validatePlannerSourceSelection(hasPlanRef, plannerSourceCount);
  if (!sourceCheck.ok) return { ok: false, code: sourceCheck.code };

  if (hasPlanRef) {
    return buildPlanRefCommand(record.planRef, runId, targetAdapter.value, selection.value);
  }

  return buildPlannerBackedCommand(record, runId, targetAdapter.value, selection.value);
}

function countPlannerSources(record: Record<string, unknown>): number {
  return ['graphSource', 'manifestRef', 'manifest', 'nodes'].filter(
    (key) => record[key] !== undefined
  ).length;
}

function validatePlannerSourceSelection(
  hasPlanRef: boolean,
  plannerSourceCount: number
): { readonly ok: true } | { readonly ok: false; readonly code: string } {
  if (hasPlanRef && plannerSourceCount > 0) {
    return { ok: false, code: 'CONFLICTING_PLAN_INPUTS' };
  }
  if (!hasPlanRef && plannerSourceCount !== 1) {
    return { ok: false, code: 'INVALID_PLAN_SOURCE' };
  }

  return { ok: true };
}

function buildPlanRefCommand(
  rawPlanRef: unknown,
  runId: string,
  targetAdapter: StartRunCommand['targetAdapter'],
  selection: ReadonlyArray<string>
): ParseStartRunFieldResult<StartRunCommand> {
  const planRef = parseStartRunPlanRef(rawPlanRef);
  if (!planRef.ok) {
    return { ok: false, code: planRef.code };
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
): ParseStartRunFieldResult<StartRunCommand> {
  const plannerInput = parseStartRunPlannerEnvelope(record, selection);
  if (!plannerInput.ok) {
    return { ok: false, code: plannerInput.code };
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
