/**
 * Owned concern: public component API for the HTTP error translation boundary,
 * grouping internal translators, feature-level static envelopes, and response
 * emission by semantic concern for production consumers.
 */
import type { FastifyReply } from 'fastify';

import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../../application/ports/workspaceGraphDraft.js';

import { mapRuntimeDomainError } from './httpDomainErrorClassifier.js';
import {
  createHttpErrorResponse,
  HTTP_ERROR_TYPE,
  sendHttpResponse,
  type HttpResponseModel,
} from './httpErrorContract.js';
import {
  mapAuthenticationFailure,
  mapAuthorizationFailure,
  mapRouteParseIssue,
  mapStartRunEngineError,
  mapStartRunFacadeResult,
} from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';

type DecisionTrace = {
  readonly correlationId: string;
  readonly decisionId: string;
};

export const httpErrorTranslation = {
  respond(reply: FastifyReply, response: HttpResponseModel): void {
    sendHttpResponse(reply, response);
  },
  admin: {
    rebuildSnapshotInternalError(): HttpResponseModel {
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.internalServerError,
        reason: HTTP_ERROR_REASON.internalError,
      });
    },
  },
  parse: {
    issue: mapRouteParseIssue,
  },
  auth: {
    unauthenticated: mapAuthenticationFailure,
    unauthorized: mapAuthorizationFailure,
  },
  startRun: {
    facadeResult: mapStartRunFacadeResult,
    engineError: mapStartRunEngineError,
  },
  workspaceGraphDraft: {
    read: {
      notFound(trace: DecisionTrace): HttpResponseModel {
        return createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.notFound,
          reason: HTTP_ERROR_REASON.workspaceGraphDraftNotFound,
          details: {
            correlationId: trace.correlationId,
            decisionId: trace.decisionId,
          },
        });
      },
    },
    write: {
      unsupportedSchemaVersion(): HttpResponseModel {
        return createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.unprocessable,
          reason: HTTP_ERROR_REASON.workspaceGraphDraftUnsupportedSchemaVersion,
          details: {
            expectedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
          },
        });
      },
      idempotencyMismatch(trace: DecisionTrace): HttpResponseModel {
        return createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.conflict,
          reason: HTTP_ERROR_REASON.workspaceGraphDraftIdempotencyKeyReused,
          details: {
            correlationId: trace.correlationId,
            decisionId: trace.decisionId,
          },
        });
      },
    },
  },
  workspaceFiles: {
    notFound(): HttpResponseModel {
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.notFound,
        reason: HTTP_ERROR_REASON.workspaceFileNotFound,
      });
    },
  },
  runtime: {
    domainError: mapRuntimeDomainError,
  },
} as const;
