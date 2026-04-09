import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';

import { extractBearerToken } from './extractBearerToken.js';
import { sendHttpResponse } from './httpErrorContract.js';
import {
  mapRouteParseIssue,
  mapStartRunEngineError,
  mapStartRunFacadeResult,
} from './httpErrorMapper.js';
import { parseStartRunBody } from './startRunRouteParser.js';

export async function startRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  facade: StartRunAuthorizedFacade,
  adapterRegistry: IStartRunTargetAdapterRegistry = DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY
): Promise<void> {
  const parsed = parseStartRunBody(request.body, adapterRegistry);
  if (!parsed.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(parsed.issue));
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
