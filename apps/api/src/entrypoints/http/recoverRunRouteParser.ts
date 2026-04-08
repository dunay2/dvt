import type { RecoverRunCommand } from '../../application/ports/runtime.js';
import type { TenantId } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { isBodyObject, normalizeRunId, parseTenantId } from './runCommandFieldParsers.js';
import { RUN_COMMAND_ACTION } from './runCommandRoute.constants.js';
import { parseStartRunPlanRef } from './startRunRoutePlanRefParser.js';
import { parseStartRunRunExecutionContextRef } from './startRunRouteRunExecutionContextRefParser.js';

export interface ParsedRecoverRunRequest {
  readonly command: RecoverRunCommand;
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: typeof RUN_COMMAND_ACTION.RETRY;
  };
}

type ParsedRecoverRunResult = RouteParseResult<ParsedRecoverRunRequest>;

export function parseRecoverRunRequest(input: {
  readonly sourceRunId: string | undefined;
  readonly body: unknown;
}): ParsedRecoverRunResult {
  const sourceRunId = normalizeRunId(input.sourceRunId);
  if (!sourceRunId) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }

  if (!isBodyObject(input.body)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }

  const tenantIdResult = parseTenantId(input.body);
  if (!tenantIdResult.ok) {
    return tenantIdResult;
  }

  const recoveryRunId = normalizeRunId(readString(input.body.recoveryRunId));
  if (!recoveryRunId) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'recoveryRunId' });
  }
  if (recoveryRunId === sourceRunId) {
    return badRequestResult(HTTP_ERROR_REASON.conflictingRunIds, { target: 'recoveryRunId' });
  }

  const planRef = parseStartRunPlanRef(input.body.planRef);
  if (!planRef.ok) {
    return planRef;
  }

  const targetAdapter = parseOptionalTargetAdapter(input.body.targetAdapter);
  if (targetAdapter === 'INVALID') {
    return badRequestResult(HTTP_ERROR_REASON.invalidTargetAdapter, { target: 'targetAdapter' });
  }

  const runExecutionContextRef = parseOptionalRunExecutionContextRef(
    input.body.runExecutionContextRef
  );
  if (runExecutionContextRef === 'INVALID') {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunExecutionContextRef, {
      target: 'runExecutionContextRef',
    });
  }

  return {
    ok: true,
    value: {
      command: {
        sourceRunId,
        recoveryRunId,
        planRef: planRef.value,
        ...(targetAdapter === undefined ? {} : { targetAdapter }),
        ...(runExecutionContextRef === undefined ? {} : { runExecutionContextRef }),
      },
      authorization: {
        tenantId: tenantIdResult.value,
        actionName: RUN_COMMAND_ACTION.RETRY,
      },
    },
  };
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}

function parseOptionalTargetAdapter(
  raw: unknown
): RecoverRunCommand['targetAdapter'] | undefined | 'INVALID' {
  if (raw === undefined) {
    return undefined;
  }
  if (raw === 'temporal' || raw === 'conductor' || raw === 'mock') {
    return raw;
  }
  return 'INVALID';
}

function parseOptionalRunExecutionContextRef(
  raw: unknown
): RecoverRunCommand['runExecutionContextRef'] | undefined | 'INVALID' {
  if (raw === undefined) {
    return undefined;
  }
  const parsed = parseStartRunRunExecutionContextRef(raw);
  if (!parsed.ok) {
    return 'INVALID';
  }
  return parsed.value;
}
