/**
 * Owned concern: public component API for the HTTP error translation boundary,
 * grouping internal translators by semantic concern for production consumers.
 */
import { mapRuntimeDomainError } from './httpDomainErrorClassifier.js';
import {
  mapAuthenticationFailure,
  mapAuthorizationFailure,
  mapRouteParseIssue,
  mapStartRunEngineError,
  mapStartRunFacadeResult,
} from './httpErrorMapper.js';

export const httpErrorTranslation = {
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
  runtime: {
    domainError: mapRuntimeDomainError,
  },
} as const;
