import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IGetRunEventsUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { mapRuntimeDomainError } from './authErrorMapper.js';

const MAX_EVENTS_LIMIT = 500;

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function parseOptionalInt(raw: string | undefined): number | null | undefined {
  if (raw === undefined) return undefined;
  if (!/^\d+$/.test(raw.trim())) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function getRunEventsRoute(
  request: FastifyRequest<{
    Params: { runId?: string };
    Querystring: { tenantId?: string; afterSeq?: string; limit?: string };
  }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: IGetRunEventsUseCase;
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

  const afterSeq = parseOptionalInt(request.query.afterSeq);
  if (afterSeq === null) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_AFTER_SEQ' });
    return;
  }

  const limit = parseOptionalInt(request.query.limit);
  if (limit === null) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_LIMIT' });
    return;
  }

  if (limit !== undefined && (limit <= 0 || limit > MAX_EVENTS_LIMIT)) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'LIMIT_OUT_OF_RANGE' });
    return;
  }

  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: TenantId.unsafe(tenantId),
      action: { kind: 'query', name: 'run:logs:view' },
    },
  });
  if (!auth.ok) {
    reply.code(auth.response.status).send(auth.response.body);
    return;
  }

  try {
    const result = await deps.useCase.execute(
      {
        runId,
        ...(afterSeq !== undefined ? { afterSeq } : {}),
        ...(limit !== undefined ? { limit } : {}),
      },
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
