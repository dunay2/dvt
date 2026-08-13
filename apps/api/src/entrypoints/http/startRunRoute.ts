/**
 * Owned concern: compose the authenticated start-run HTTP entrypoint over the
 * dedicated parser and response-translation seams.
 */
import type { IObservability, ISpan } from '@dvt/observability';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type { StartRunAuthorizedFacade } from '../../application/services/startRunAuthorizedFacade.js';

import { extractBearerToken } from './extractBearerToken.js';
import type { HttpResponseModel } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { generatePlatformRunId, type StartRunRunIdGenerator } from './startRunIdentity.js';
import { parseStartRunBody } from './startRunRouteParser.js';

type StartRunRouteDependencies = {
  readonly adapterRegistry: IStartRunTargetAdapterRegistry;
  readonly observability: IObservability;
  readonly runIdGenerator?: StartRunRunIdGenerator;
};

export async function startRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  facade: StartRunAuthorizedFacade,
  dependencies: StartRunRouteDependencies
): Promise<void> {
  return dependencies.observability.traces.withSpan(
    'api.startRun',
    {
      attributes: {
        method: 'POST',
        operation: 'startRun',
        route: '/runs/start',
      },
    },
    async (span) => executeStartRunRoute(request, reply, facade, dependencies, span)
  );
}

async function executeStartRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  facade: StartRunAuthorizedFacade,
  dependencies: StartRunRouteDependencies,
  span: ISpan
): Promise<void> {
  const runIdGenerator = dependencies.runIdGenerator ?? generatePlatformRunId;
  const parsed = parseStartRunBody(request.body, dependencies.adapterRegistry, runIdGenerator);
  if (!parsed.ok) {
    respondAndObserve(span, reply, httpErrorTranslation.parse.issue(parsed.issue));
    return;
  }
  span.setAttribute('provider', parsed.value.command.targetAdapter);

  let facadeResult: Awaited<ReturnType<StartRunAuthorizedFacade['execute']>>;
  try {
    facadeResult = await facade.execute({
      token: extractBearerToken(request.headers.authorization),
      requestId: request.id,
      command: parsed.value.command,
      requestedScope: parsed.value.requestedScope,
    });
  } catch (error) {
    request.log.error({ err: error }, 'Start Run request failed unexpectedly');
    span.recordException(error);
    respondAndObserve(span, reply, httpErrorTranslation.startRun.internalError());
    return;
  }

  const mapped = facadeResult.ok
    ? httpErrorTranslation.startRun.facadeResult(facadeResult.value)
    : httpErrorTranslation.startRun.engineError(facadeResult.error);
  respondAndObserve(span, reply, mapped);
}

function respondAndObserve(span: ISpan, reply: FastifyReply, response: HttpResponseModel): void {
  span.setAttributes({
    'http.response.status_code': response.status,
    outcome: response.status === 202 ? 'accepted' : 'rejected',
  });
  span.setStatus(response.status >= 500 ? 'error' : 'ok');
  httpErrorTranslation.respond(reply, response);
}
