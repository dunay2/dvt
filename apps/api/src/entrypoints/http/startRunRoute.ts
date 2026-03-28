import type { FastifyReply, FastifyRequest } from 'fastify';

import type { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';

import { mapStartRunEngineError, mapStartRunFacadeResult } from './authErrorMapper.js';
import { extractBearerToken } from './extractBearerToken.js';
import { parseStartRunBody } from './startRunRouteParser.js';

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

  const mapped = facadeResult.ok
    ? mapStartRunFacadeResult(facadeResult.value)
    : mapStartRunEngineError(facadeResult.error);
  if (mapped.headers) {
    for (const [name, value] of Object.entries(mapped.headers)) {
      reply.header(name, value);
    }
  }
  reply.code(mapped.status).send(mapped.body);
}
