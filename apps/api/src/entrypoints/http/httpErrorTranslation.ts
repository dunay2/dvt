/**
 * Owned concern: public component API for the HTTP error translation boundary,
 * grouping internal translators, feature-level static envelopes, and response
 * emission by semantic concern for production consumers.
 */
import type { FastifyReply } from 'fastify';

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
  mapStartRunResult,
} from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';

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
    result: mapStartRunResult,
    engineError: mapStartRunEngineError,
    internalError(): HttpResponseModel {
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.internalServerError,
        reason: HTTP_ERROR_REASON.internalError,
      });
    },
  },
  workspaceFiles: {
    notFound(): HttpResponseModel {
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.notFound,
        reason: HTTP_ERROR_REASON.workspaceFileNotFound,
      });
    },
    revisionConflict(): HttpResponseModel {
      return createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.conflict,
        reason: HTTP_ERROR_REASON.workspaceFileRevisionConflict,
      });
    },
  },
  runtime: {
    domainError: mapRuntimeDomainError,
  },
} as const;
