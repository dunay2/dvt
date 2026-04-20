import {
  isRecoverRunTargetAdapter,
  type RecoverRunCommand,
} from '../../application/ports/runtime.js';
import type { TenantId } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { parsePlanRoutePlanRef } from './planRoutePlanRefParser.js';
import { parsePlanRouteRunExecutionContextRef } from './planRouteRunExecutionContextRefParser.js';
import { parseOptionalRouteTargetAdapter } from './planRouteTargetAdapterParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { isBodyObject, normalizeRunId, parseTenantId } from './runCommandFieldParsers.js';
import { RUN_COMMAND_ACTION } from './runCommandRoute.constants.js';

export interface ParsedRecoverRunRequest {
  readonly command: RecoverRunCommand;
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: typeof RUN_COMMAND_ACTION.RETRY;
  };
}

type ParsedRecoverRunResult = RouteParseResult<ParsedRecoverRunRequest>;

interface ParsedRecoverRunBody {
  readonly tenantId: TenantId;
  readonly recoveryRunId: string;
  readonly planRef: RecoverRunCommand['planRef'];
  readonly targetAdapter?: RecoverRunCommand['targetAdapter'];
  readonly runExecutionContextRef?: RecoverRunCommand['runExecutionContextRef'];
}

interface ParsedRecoverRunRequiredFields {
  readonly tenantId: TenantId;
  readonly recoveryRunId: string;
  readonly planRef: RecoverRunCommand['planRef'];
}

interface ParsedRecoverRunOptionalFields {
  readonly targetAdapter?: RecoverRunCommand['targetAdapter'];
  readonly runExecutionContextRef?: RecoverRunCommand['runExecutionContextRef'];
}

export function parseRecoverRunRequest(input: {
  readonly sourceRunId: string | undefined;
  readonly body: unknown;
}): ParsedRecoverRunResult {
  const sourceRunIdResult = parseSourceRunId(input.sourceRunId);
  if (!sourceRunIdResult.ok) {
    return sourceRunIdResult;
  }

  const parsedBody = parseRecoverRunBody(input.body, sourceRunIdResult.value);
  if (!parsedBody.ok) {
    return parsedBody;
  }

  return {
    ok: true,
    value: {
      command: {
        sourceRunId: sourceRunIdResult.value,
        recoveryRunId: parsedBody.value.recoveryRunId,
        planRef: parsedBody.value.planRef,
        ...(parsedBody.value.targetAdapter === undefined
          ? {}
          : { targetAdapter: parsedBody.value.targetAdapter }),
        ...(parsedBody.value.runExecutionContextRef === undefined
          ? {}
          : { runExecutionContextRef: parsedBody.value.runExecutionContextRef }),
      },
      authorization: {
        tenantId: parsedBody.value.tenantId,
        actionName: RUN_COMMAND_ACTION.RETRY,
      },
    },
  };
}

function parseSourceRunId(rawRunId: string | undefined): RouteParseResult<string> {
  const sourceRunId = normalizeRunId(rawRunId);
  if (!sourceRunId) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }

  return {
    ok: true,
    value: sourceRunId,
  };
}

function parseRecoverRunBody(
  body: unknown,
  sourceRunId: string
): RouteParseResult<ParsedRecoverRunBody> {
  const bodyRecord = parseRecoverRunBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const requiredFields = parseRecoverRunRequiredFields(bodyRecord.value, sourceRunId);
  if (!requiredFields.ok) {
    return requiredFields;
  }

  const optionalFields = parseRecoverRunOptionalFields(bodyRecord.value);
  if (!optionalFields.ok) {
    return optionalFields;
  }

  return {
    ok: true,
    value: createParsedRecoverRunBody(requiredFields.value, optionalFields.value),
  };
}

function parseRecoverRunBodyRecord(
  body: unknown
): RouteParseResult<Record<string, unknown>> {
  if (!isBodyObject(body)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }

  return {
    ok: true,
    value: body,
  };
}

function parseRecoverRunRequiredFields(
  body: Record<string, unknown>,
  sourceRunId: string
): RouteParseResult<ParsedRecoverRunRequiredFields> {
  const tenantIdResult = parseTenantId(body);
  if (!tenantIdResult.ok) {
    return tenantIdResult;
  }

  const recoveryRunIdResult = parseRecoveryRunId(body.recoveryRunId, sourceRunId);
  if (!recoveryRunIdResult.ok) {
    return recoveryRunIdResult;
  }

  const planRefResult = parsePlanRoutePlanRef(body.planRef);
  if (!planRefResult.ok) {
    return planRefResult;
  }

  return {
    ok: true,
    value: {
      tenantId: tenantIdResult.value,
      recoveryRunId: recoveryRunIdResult.value,
      planRef: planRefResult.value,
    },
  };
}

function parseRecoverRunOptionalFields(
  body: Record<string, unknown>
): RouteParseResult<ParsedRecoverRunOptionalFields> {
  const targetAdapterResult = parseRecoverTargetAdapter(body.targetAdapter);
  if (!targetAdapterResult.ok) {
    return targetAdapterResult;
  }

  const runExecutionContextRefResult = parseRecoverRunExecutionContextRef(
    body.runExecutionContextRef
  );
  if (!runExecutionContextRefResult.ok) {
    return runExecutionContextRefResult;
  }

  return {
    ok: true,
    value: {
      ...(targetAdapterResult.value === undefined
        ? {}
        : { targetAdapter: targetAdapterResult.value }),
      ...(runExecutionContextRefResult.value === undefined
        ? {}
        : { runExecutionContextRef: runExecutionContextRefResult.value }),
    },
  };
}

function createParsedRecoverRunBody(
  requiredFields: ParsedRecoverRunRequiredFields,
  optionalFields: ParsedRecoverRunOptionalFields
): ParsedRecoverRunBody {
  return {
    tenantId: requiredFields.tenantId,
    recoveryRunId: requiredFields.recoveryRunId,
    planRef: requiredFields.planRef,
    ...(optionalFields.targetAdapter === undefined
      ? {}
      : { targetAdapter: optionalFields.targetAdapter }),
    ...(optionalFields.runExecutionContextRef === undefined
      ? {}
      : { runExecutionContextRef: optionalFields.runExecutionContextRef }),
  };
}

function readString(raw: unknown): string | undefined {
  return typeof raw === 'string' ? raw : undefined;
}

function parseRecoveryRunId(
  rawRecoveryRunId: unknown,
  sourceRunId: string
): RouteParseResult<string> {
  const recoveryRunId = normalizeRunId(readString(rawRecoveryRunId));
  if (!recoveryRunId) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'recoveryRunId' });
  }
  if (recoveryRunId === sourceRunId) {
    return badRequestResult(HTTP_ERROR_REASON.conflictingRunIds, { target: 'recoveryRunId' });
  }

  return {
    ok: true,
    value: recoveryRunId,
  };
}

function parseRecoverTargetAdapter(
  raw: unknown
): RouteParseResult<RecoverRunCommand['targetAdapter'] | undefined> {
  return parseOptionalRouteTargetAdapter(raw, {
    isSupported: isRecoverRunTargetAdapter,
  });
}

function parseRecoverRunExecutionContextRef(
  raw: unknown
): RouteParseResult<RecoverRunCommand['runExecutionContextRef'] | undefined> {
  if (raw === undefined) {
    return { ok: true, value: undefined };
  }

  const parsed = parsePlanRouteRunExecutionContextRef(raw);
  if (!parsed.ok) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunExecutionContextRef, {
      target: 'runExecutionContextRef',
    });
  }

  return {
    ok: true,
    value: parsed.value,
  };
}
