import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { ISignalRunUseCase, SupportedSignalType } from '../../application/ports/runtime.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { TenantId } from '../../domain/auth/types.js';

import { mapRuntimeDomainError } from './authErrorMapper.js';
import { authorizeExecutionScope } from './authorizeExecutionScope.js';

function extractBearerToken(authorizationHeader: string | undefined): string | undefined {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

function parseSignalType(raw: unknown): SupportedSignalType | null {
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim().toUpperCase();
  return normalized === 'PAUSE' || normalized === 'RESUME' || normalized === 'CANCEL'
    ? normalized
    : null;
}

function signalActionName(
  signalType: SupportedSignalType
): 'run:cancel' | 'run:signal' {
  return signalType === 'CANCEL' ? 'run:cancel' : 'run:signal';
}

export async function signalRunRoute(
  request: FastifyRequest<{ Params: { runId?: string }; Body: unknown }>,
  reply: FastifyReply,
  deps: {
    authenticator: IAuthenticator;
    authorizer: AuthorizeCommandScopeService;
    useCase: ISignalRunUseCase;
  }
): Promise<void> {
  const runId = request.params.runId?.trim();
  if (!runId) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_RUN_ID' });
    return;
  }

  if (request.body === null || typeof request.body !== 'object' || Array.isArray(request.body)) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_BODY' });
    return;
  }

  const body = request.body as Record<string, unknown>;
  const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
  if (!tenantId) {
    reply.code(403).send({ error: 'FORBIDDEN', code: 'MISSING_TENANT_SCOPE' });
    return;
  }

  const signalType = parseSignalType(body.signalType);
  if (!signalType) {
    reply.code(400).send({ error: 'BAD_REQUEST', code: 'INVALID_SIGNAL_TYPE' });
    return;
  }

  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: TenantId.unsafe(tenantId),
      action: { kind: 'command', name: signalActionName(signalType) },
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
        signalType,
        ...(typeof body.reason === 'string' && body.reason.trim().length > 0
          ? { reason: body.reason.trim() }
          : {}),
      },
      auth.context
    );
    reply.code(202).send(result);
  } catch (error) {
    const mapped = mapRuntimeDomainError(error);
    if (mapped) {
      reply.code(mapped.status).send(mapped.body);
      return;
    }

    throw error;
  }
}
