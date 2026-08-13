/**
 * Owned concern: compose the authenticated start-run HTTP entrypoint over the
 * dedicated parser and response-translation seams.
 */
import type { IObservability, ISpan } from '@dvt/observability';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import type { IStartRunTargetAdapterRegistry } from '../../application/ports/IStartRunTargetAdapterRegistry.js';
import type {
  IStartRunLatencyTelemetry,
  StartRunLatencyOutcome,
} from '../../application/ports/StartRunSlaTelemetry.js';
import type {
  IStartRunUseCase,
  StartRunUseCaseResult,
} from '../../application/ports/startRunUseCasePort.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { elapsedSlaSecondsSince } from '../../application/services/slaTiming.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import type { HttpResponseModel } from './httpErrorContract.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { generatePlatformRunId, type StartRunRunIdGenerator } from './startRunIdentity.js';
import { parseStartRunBody } from './startRunRouteParser.js';

type StartRunRouteDependencies = {
  readonly adapterRegistry: IStartRunTargetAdapterRegistry;
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly observability: IObservability;
  readonly telemetry: IStartRunLatencyTelemetry;
  readonly useCase: IStartRunUseCase;
  readonly runIdGenerator?: StartRunRunIdGenerator;
};

export async function startRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
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
    async (span) => executeStartRunRoute(request, reply, dependencies, span)
  );
}

async function executeStartRunRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
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

  const startedAtMs = Date.now();
  let outcome: StartRunLatencyOutcome = 'exception';
  try {
    const authorization = await authorizeExecutionScope({
      authenticator: dependencies.authenticator,
      authorizer: dependencies.authorizer,
      token: extractBearerToken(request.headers.authorization),
      requestId: request.id,
      requestedScope: parsed.value.requestedScope,
    });
    if (!authorization.ok) {
      outcome = authorization.response.status === 401 ? 'unauthenticated' : 'unauthorized';
      respondAndObserve(span, reply, authorization.response);
      return;
    }

    const result = await dependencies.useCase.execute(parsed.value.command, authorization.context);
    outcome = mapStartRunOutcome(result);
    const mapped = result.ok
      ? httpErrorTranslation.startRun.result(result.value)
      : httpErrorTranslation.startRun.engineError(result.error);
    respondAndObserve(span, reply, mapped);
  } catch (error) {
    request.log.error({ err: error }, 'Start Run request failed unexpectedly');
    span.recordException(error);
    respondAndObserve(span, reply, httpErrorTranslation.startRun.internalError());
  } finally {
    dependencies.telemetry.recordStartRunLatency(elapsedSlaSecondsSince(startedAtMs), outcome);
  }
}

function mapStartRunOutcome(result: StartRunUseCaseResult): StartRunLatencyOutcome {
  return result.ok ? result.value.kind : 'engine_error';
}

function respondAndObserve(span: ISpan, reply: FastifyReply, response: HttpResponseModel): void {
  span.setAttributes({
    'http.response.status_code': response.status,
    outcome: response.status === 202 ? 'accepted' : 'rejected',
  });
  span.setStatus(response.status >= 500 ? 'error' : 'ok');
  httpErrorTranslation.respond(reply, response);
}
