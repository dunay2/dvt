/** Owned concern: parse a retry request without accepting browser-owned execution authority. */
import type { RecoverRunCommand } from '../../application/ports/runtime.js';
import type { TenantId } from '../../domain/auth/types.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { deriveRecoveryRunId } from './recoverRunIdentity.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { isBodyObject, normalizeRunId, parseTenantId } from './runCommandFieldParsers.js';
import { RUN_COMMAND_ACTION } from './runCommandRoute.constants.js';

const RECOVER_RUN_BODY_FIELDS = new Set(['tenantId']);

export interface ParsedRecoverRunRequest {
  readonly command: RecoverRunCommand;
  readonly authorization: {
    readonly tenantId: TenantId;
    readonly actionName: typeof RUN_COMMAND_ACTION.RETRY;
  };
}

export function parseRecoverRunRequest(input: {
  readonly sourceRunId: string | undefined;
  readonly idempotencyKey: unknown;
  readonly body: unknown;
}): RouteParseResult<ParsedRecoverRunRequest> {
  const sourceRunId = normalizeRunId(input.sourceRunId);
  if (!sourceRunId) {
    return badRequestResult(HTTP_ERROR_REASON.invalidRunId, { target: 'runId' });
  }

  if (!isBodyObject(input.body)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }
  const unexpectedField = Object.keys(input.body).find(
    (field) => !RECOVER_RUN_BODY_FIELDS.has(field)
  );
  if (unexpectedField !== undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody, { target: unexpectedField });
  }

  const tenantId = parseTenantId(input.body);
  if (!tenantId.ok) return tenantId;
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  if (idempotencyKey === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.missingIdempotencyKey, {
      target: 'idempotency-key',
    });
  }
  const recoveryRunId = deriveRecoveryRunId({
    tenantId: tenantId.value.value,
    sourceRunId,
    idempotencyKey,
  });

  return {
    ok: true,
    value: {
      command: { sourceRunId, recoveryRunId },
      authorization: {
        tenantId: tenantId.value,
        actionName: RUN_COMMAND_ACTION.RETRY,
      },
    },
  };
}

function normalizeIdempotencyKey(value: unknown): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== 'string') return undefined;
  const normalized = candidate.trim();
  return normalized.length > 0 && normalized.length <= 200 ? normalized : undefined;
}
