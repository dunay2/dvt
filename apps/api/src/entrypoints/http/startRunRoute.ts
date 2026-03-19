import type { FastifyReply, FastifyRequest } from 'fastify';

import type { StartRunCommand, StartRunPlanRef } from '../../application/ports/auth.js';
import { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';
import {
  type AuthorizationAction,
  EnvironmentId,
  ProjectId,
  TenantId,
  type RequestedScope,
} from '../../domain/auth/types.js';

import { mapStartRunFacadeResult } from './authErrorMapper.js';

type ParsedStartRunRequest = {
  readonly command: StartRunCommand;
  readonly requestedScope: RequestedScope & {
    readonly action: Extract<AuthorizationAction, { kind: 'command' }>;
  };
};

type ParseStartRunRequestResult =
  | { readonly ok: true; readonly value: ParsedStartRunRequest }
  | { readonly ok: false; readonly status: 400; readonly body: Readonly<Record<string, unknown>> };

type ParseStartRunFieldResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: string };

type ParsedStartRunScope = {
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

type ParseStartRunBadRequestResult = Extract<ParseStartRunRequestResult, { readonly ok: false }>;

function badRequest(code: string): ParseStartRunBadRequestResult {
  return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code } };
}

function parseSelection(
  selection: unknown
): { readonly ok: true; readonly value: ReadonlyArray<string> } | { readonly ok: false } {
  if (!Array.isArray(selection) || selection.length === 0) {
    return { ok: false };
  }

  if (!selection.every((item) => typeof item === 'string')) {
    return { ok: false };
  }

  const normalized = (selection as ReadonlyArray<string>)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  if (normalized.length !== selection.length) {
    return { ok: false };
  }

  return { ok: true, value: normalized };
}

function parsePlanRef(
  raw: unknown
):
  | { readonly ok: true; readonly value: StartRunPlanRef }
  | { readonly ok: false; readonly code: string } {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, code: 'INVALID_PLAN_REF' };
  }
  const r = raw as Record<string, unknown>;
  const uri = asNonEmptyTrimmedStringOrUndefined(r.uri);
  const sha256 = asNonEmptyTrimmedStringOrUndefined(r.sha256);
  const schemaVersion = asNonEmptyTrimmedStringOrUndefined(r.schemaVersion);
  const planId = asNonEmptyTrimmedStringOrUndefined(r.planId);
  const planVersion = asNonEmptyTrimmedStringOrUndefined(r.planVersion);
  if (!uri || !sha256 || !schemaVersion || !planId || !planVersion) {
    return { ok: false, code: 'INVALID_PLAN_REF' };
  }
  return { ok: true, value: { uri, sha256, schemaVersion, planId, planVersion } };
}

function parseTargetAdapter(
  raw: unknown
): { readonly ok: true; readonly value: 'temporal' | 'mock' } | { readonly ok: false } {
  const normalized = asNonEmptyTrimmedStringOrUndefined(raw);
  if (normalized === 'temporal' || normalized === 'mock') {
    return { ok: true, value: normalized };
  }
  return { ok: false };
}

function parseBodyRecord(body: unknown): ParseStartRunFieldResult<Record<string, unknown>> {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'INVALID_BODY' };
  }

  return { ok: true, value: body as Record<string, unknown> };
}

function parseStartRunScope(
  record: Record<string, unknown>
): ParseStartRunFieldResult<ParsedStartRunScope> {
  const tenantId = TenantId.parse(asStringOrUndefined(record.tenantId));
  if (!tenantId.ok) {
    return { ok: false, code: tenantId.code };
  }

  const projectId = ProjectId.parse(asStringOrUndefined(record.projectId));
  if (!projectId.ok) {
    return { ok: false, code: projectId.code };
  }

  const environmentId = EnvironmentId.parse(asStringOrUndefined(record.environmentId));
  if (!environmentId.ok) {
    return { ok: false, code: environmentId.code };
  }

  return {
    ok: true,
    value: {
      tenantId: tenantId.value,
      projectId: projectId.value,
      environmentId: environmentId.value,
    },
  };
}

function parseStartRunCommand(
  record: Record<string, unknown>
): ParseStartRunFieldResult<StartRunCommand> {
  const selection = parseSelection(record.selection);
  if (!selection.ok) {
    return { ok: false, code: 'INVALID_SELECTION' };
  }

  const planRef = parsePlanRef(record.planRef);
  if (!planRef.ok) {
    return { ok: false, code: planRef.code };
  }

  const runId = asNonEmptyTrimmedStringOrUndefined(record.runId);
  if (!runId) {
    return { ok: false, code: 'INVALID_RUN_ID' };
  }

  const targetAdapter = parseTargetAdapter(record.targetAdapter);
  if (!targetAdapter.ok) {
    return { ok: false, code: 'INVALID_TARGET_ADAPTER' };
  }

  return {
    ok: true,
    value: {
      planRef: planRef.value,
      runId,
      targetAdapter: targetAdapter.value,
      selection: selection.value,
    },
  };
}

function parseStartRunBody(body: unknown): ParseStartRunRequestResult {
  const bodyRecord = parseBodyRecord(body);
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

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function asStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNonEmptyTrimmedStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export async function startRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  facade: StartRunAuthorizedFacade
): Promise<void> {
  const parsed = parseStartRunBody(request.body);
  if (!parsed.ok) {
    reply.code(parsed.status).send(parsed.body);
    return;
  }

  const facadeResult = await facade.execute({
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    command: parsed.value.command,
    requestedScope: parsed.value.requestedScope,
  });

  const mapped = mapStartRunFacadeResult(facadeResult);
  if (mapped.headers) {
    for (const [name, value] of Object.entries(mapped.headers)) {
      reply.header(name, value);
    }
  }
  reply.code(mapped.status).send(mapped.body);
}
