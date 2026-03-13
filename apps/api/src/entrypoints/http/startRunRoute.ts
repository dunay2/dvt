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
  const uri = asStringOrUndefined(r.uri);
  const sha256 = asStringOrUndefined(r.sha256);
  const schemaVersion = asStringOrUndefined(r.schemaVersion);
  const planId = asStringOrUndefined(r.planId);
  const planVersion = asStringOrUndefined(r.planVersion);
  if (!uri || !sha256 || !schemaVersion || !planId || !planVersion) {
    return { ok: false, code: 'INVALID_PLAN_REF' };
  }
  return { ok: true, value: { uri, sha256, schemaVersion, planId, planVersion } };
}

function parseTargetAdapter(
  raw: unknown
): { readonly ok: true; readonly value: 'temporal' | 'mock' } | { readonly ok: false } {
  if (raw === 'temporal' || raw === 'mock') return { ok: true, value: raw };
  return { ok: false };
}

function parseStartRunBody(body: unknown): ParseStartRunRequestResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code: 'INVALID_BODY' } };
  }

  const record = body as Record<string, unknown>;

  const tenantId = TenantId.parse(asStringOrUndefined(record.tenantId));
  if (!tenantId.ok) {
    return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code: tenantId.code } };
  }

  const projectId = ProjectId.parse(asStringOrUndefined(record.projectId));
  if (!projectId.ok) {
    return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code: projectId.code } };
  }

  const environmentId = EnvironmentId.parse(asStringOrUndefined(record.environmentId));
  if (!environmentId.ok) {
    return {
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: environmentId.code },
    };
  }

  const selection = parseSelection(record.selection);
  if (!selection.ok) {
    return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code: 'INVALID_SELECTION' } };
  }

  const planRef = parsePlanRef(record.planRef);
  if (!planRef.ok) {
    return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code: planRef.code } };
  }

  const runId = asStringOrUndefined(record.runId);
  if (!runId) {
    return { ok: false, status: 400, body: { error: 'BAD_REQUEST', code: 'INVALID_RUN_ID' } };
  }

  const targetAdapter = parseTargetAdapter(record.targetAdapter);
  if (!targetAdapter.ok) {
    return {
      ok: false,
      status: 400,
      body: { error: 'BAD_REQUEST', code: 'INVALID_TARGET_ADAPTER' },
    };
  }

  return {
    ok: true,
    value: {
      command: {
        planRef: planRef.value,
        runId,
        targetAdapter: targetAdapter.value,
        selection: selection.value,
      },
      requestedScope: {
        tenantId: tenantId.value,
        projectId: projectId.value,
        environmentId: environmentId.value,
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
  reply.code(mapped.status).send(mapped.body);
}
