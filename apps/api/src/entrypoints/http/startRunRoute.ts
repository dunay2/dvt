import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';

import { extractBearerToken } from './extractBearerToken.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { parseStartRunBody } from './startRunRouteParser.js';

export async function startRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  facade: StartRunAuthorizedFacade,
  adapterRegistry: IStartRunTargetAdapterRegistry = DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY
): Promise<void> {
  const parsed = parseStartRunBody(request.body, adapterRegistry);
  if (!parsed.ok) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
    return;
  }

  const facadeResult = await facade.execute({
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    command: parsed.value.command,
    requestedScope: parsed.value.requestedScope,
  });

  const mapped = facadeResult.ok
    ? httpErrorTranslation.startRun.facadeResult(facadeResult.value)
    : httpErrorTranslation.startRun.engineError(facadeResult.error);
  httpErrorTranslation.respond(reply, mapped);
}
