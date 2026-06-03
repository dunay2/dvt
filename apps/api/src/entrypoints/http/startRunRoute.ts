/**
 * Owned concern: compose the authenticated start-run HTTP entrypoint over the
 * dedicated parser and response-translation seams.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';
import { DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY } from '../../application/services/startRunTargetAdapterRegistry.js';

import { extractBearerToken } from './extractBearerToken.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { generatePlatformRunId, type StartRunRunIdGenerator } from './startRunIdentity.js';
import { parseStartRunBody } from './startRunRouteParser.js';

type StartRunRouteDependencies = {
  readonly adapterRegistry?: IStartRunTargetAdapterRegistry;
  readonly runIdGenerator?: StartRunRunIdGenerator;
};

export async function startRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  facade: StartRunAuthorizedFacade,
  dependencies: StartRunRouteDependencies = {}
): Promise<void> {
  const adapterRegistry = dependencies.adapterRegistry ?? DEFAULT_START_RUN_TARGET_ADAPTER_REGISTRY;
  const runIdGenerator = dependencies.runIdGenerator ?? generatePlatformRunId;
  const parsed = parseStartRunBody(request.body, adapterRegistry, runIdGenerator);
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
