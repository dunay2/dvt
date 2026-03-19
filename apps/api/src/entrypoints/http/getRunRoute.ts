import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IGetRunStatusUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { mapRuntimeDomainError } from './authErrorMapper.js';

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function parseEnriched(value: string | undefined): { ok: true; value: boolean } | { ok: false } {
  if (value === undefined) return { ok: true, value: false };
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return { ok: true, value: true };
  if (normalized === 'false') return { ok: true, value: false };
  return { ok: false };
}

export async function getRunRoute(
  request: FastifyRequest<{ Params: { runId?: string }; Querystring: { tenantId?: string; enriched?: string } }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: IGetRunStatusUseCase;
  }
): Promise<void> {
  const runId = request.params.runId?.trim();
  if (!runId) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_RUN_ID' });
    return;
  }

  const tenantId = request.query.tenantId?.trim();
  if (!tenantId) {
    reply.code(403).send({ error: 'FORBIDDEN', code: 'MISSING_TENANT_SCOPE' });
    return;
  }

  const enriched = parseEnriched(request.query.enriched);
  if (!enriched.ok) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_ENRICHED_FLAG' });
    return;
  }

  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: TenantId.unsafe(tenantId),
      action: { kind: 'query', name: 'run:view' },
    },
  });
  if (!auth.ok) {
    reply.code(auth.response.status).send(auth.response.body);
    return;
  }

  try {
    const result = await deps.useCase.execute(
      { runId, enriched: enriched.value },
      auth.context
    );
    reply.code(200).send(result);
  } catch (error) {
    const mapped = mapRuntimeDomainError(error);
    if (mapped) {
      reply.code(mapped.status).send(mapped.body);
      return;
    }

    throw error;
  }
}
