import type { FastifyReply, FastifyRequest } from 'fastify';

import type { StartRunCommand } from '../../application/ports/auth.js';
import { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';
import {
  type AuthorizationAction,
  EnvironmentId,
  ProjectId,
  TenantId,
  type RequestedScope,
} from '../../domain/auth/types.js';
import { mapStartRunFacadeResult } from './authErrorMapper.js';

interface StartRunBody {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly selection: ReadonlyArray<string>;
}

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

  return {
    ok: true,
    value: {
      command: { selection: selection.value },
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
  return authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice('Bearer '.length)
    : undefined;
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
