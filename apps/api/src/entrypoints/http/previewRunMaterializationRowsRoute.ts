/** Owned concern: expose a run-owned materialization sample without accepting warehouse identifiers. */
import { SOURCE_DATA_SAMPLE_DEFAULT_LIMIT, SOURCE_DATA_SAMPLE_MAX_LIMIT } from '@dvt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  SourceObjectNotFoundError,
  UnsupportedWarehouseAdapterError,
  WarehouseConnectionNotFoundError,
  WarehouseSourceDataSampleFailedError,
  WarehouseSourceDiscoveryFailedError,
} from '../../application/ports/warehouseSourceImport.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import {
  RunMaterializationSampleUnavailableError,
  type PreviewRunMaterializationRowsUseCase,
} from '../../application/services/previewRunMaterializationRowsUseCase.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { parseGetRunRequest } from './getRunRouteParser.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE } from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';

type PreviewRunMaterializationRowsRequest = FastifyRequest<{
  Params: { runId?: string };
  Querystring: { tenantId?: string; limit?: string };
}>;

export async function previewRunMaterializationRowsRoute(
  request: PreviewRunMaterializationRowsRequest,
  reply: FastifyReply,
  dependencies: {
    readonly authenticator: IAuthenticator;
    readonly authorizer: AuthorizeCommandScopeService;
    readonly useCase: PreviewRunMaterializationRowsUseCase;
  }
): Promise<void> {
  const parsedRun = parseGetRunRequest({
    runId: request.params.runId,
    tenantId: request.query.tenantId,
    enriched: undefined,
  });
  if (!parsedRun.ok) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsedRun.issue));
    return;
  }
  const limit = parseLimit(request.query.limit);
  if (limit === null) {
    httpErrorTranslation.respond(
      reply,
      httpErrorTranslation.parse.issue(
        badRequestIssue(HTTP_ERROR_REASON.invalidLimit, { target: 'limit' })
      )
    );
    return;
  }

  const authorization = await authorizeExecutionScope({
    authenticator: dependencies.authenticator,
    authorizer: dependencies.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: parsedRun.value.requestedScope,
  });
  if (!authorization.ok) {
    httpErrorTranslation.respond(reply, authorization.response);
    return;
  }

  try {
    reply
      .code(200)
      .send(
        await dependencies.useCase.execute(
          { runId: parsedRun.value.useCaseInput.runId, limit },
          authorization.context
        )
      );
  } catch (error) {
    if (error instanceof RunMaterializationSampleUnavailableError) {
      httpErrorTranslation.respond(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.conflict,
          reason: HTTP_ERROR_REASON.runMaterializationSampleUnavailable,
          target: 'runId',
          details: { cause: error.reason },
        })
      );
      return;
    }
    if (
      error instanceof WarehouseConnectionNotFoundError ||
      error instanceof SourceObjectNotFoundError
    ) {
      httpErrorTranslation.respond(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.notFound,
          reason: HTTP_ERROR_REASON.runMaterializationSampleUnavailable,
          target: 'runId',
        })
      );
      return;
    }
    if (
      error instanceof UnsupportedWarehouseAdapterError ||
      error instanceof WarehouseSourceDiscoveryFailedError ||
      error instanceof WarehouseSourceDataSampleFailedError
    ) {
      httpErrorTranslation.respond(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.unprocessable,
          reason: HTTP_ERROR_REASON.warehouseSourceDataSampleFailed,
        })
      );
      return;
    }

    const mapped = httpErrorTranslation.runtime.domainError(error);
    if (mapped) {
      httpErrorTranslation.respond(reply, mapped);
      return;
    }
    throw error;
  }
}

function parseLimit(value: string | undefined): number | null {
  if (value === undefined) {
    return SOURCE_DATA_SAMPLE_DEFAULT_LIMIT;
  }
  const limit = Number(value);
  return Number.isInteger(limit) && limit > 0 && limit <= SOURCE_DATA_SAMPLE_MAX_LIMIT
    ? limit
    : null;
}
