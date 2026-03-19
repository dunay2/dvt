import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IListRunsUseCase } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { mapRuntimeDomainError } from './authErrorMapper.js';

const MAX_LIST_LIMIT = 100;

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (raw === undefined) return 50;
  if (!/^\d+$/.test(raw.trim())) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

export async function listRunsRoute(
  request: FastifyRequest<{
    Querystring: {
      tenantId?: string;
      projectId?: string;
      environmentId?: string;
      limit?: string;
      cursor?: string;
    };
  }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: IListRunsUseCase;
  }
): Promise<void> {
  const tenantId = request.query.tenantId?.trim();
  if (!tenantId) {
    reply.code(403).send({ error: 'FORBIDDEN', code: 'MISSING_TENANT_SCOPE' });
    return;
  }

  if (request.query.cursor !== undefined) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'UNSUPPORTED_CURSOR' });
    return;
  }

  const limit = parsePositiveInt(request.query.limit);
  if (limit === null) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_LIMIT' });
    return;
  }

  if (limit <= 0 || limit > MAX_LIST_LIMIT) {
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
      ...(request.query.projectId ? { projectId: ProjectId.unsafe(request.query.projectId) } : {}),
      ...(request.query.environmentId
        ? { environmentId: EnvironmentId.unsafe(request.query.environmentId) }
        : {}),
      action: { kind: 'query', name: 'run:list' },
    },
  });
  if (!auth.ok) {
    reply.code(auth.response.status).send(auth.response.body);
    return;
  }

  try {
    const result = await deps.useCase.execute({ limit }, auth.context);
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
