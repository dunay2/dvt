/**
 * Owned concern: define the authenticated facade port result surface that
 * wraps the canonical start-run boundary with API auth outcomes.
 */
import {
  START_RUN_RESULT_KIND,
  type StartRunAcceptedResult,
  type StartRunDuplicateResult,
  type StartRunPlanRejectedResult,
  type StartRunRateLimitedResult,
  type StartRunSystemBackpressureResult,
  type StartRunTenantBackpressureResult,
} from '@dvt/contracts';

import type { DeniedReason } from './accessDecision.js';
import type { AuthenticationFailureCode } from './authContract.js';
import type { StartRunEngineError } from './startRunEngineError.js';
import type { Result } from './startRunUseCasePort.js';

export const START_RUN_FACADE_RESULT_KIND = {
  unauthenticated: 'unauthenticated',
  unauthorized: 'unauthorized',
  ...START_RUN_RESULT_KIND,
} as const;

export type StartRunFacadeResult =
  | {
      readonly kind: typeof START_RUN_FACADE_RESULT_KIND.unauthenticated;
      readonly code: AuthenticationFailureCode;
    }
  | {
      readonly kind: typeof START_RUN_FACADE_RESULT_KIND.unauthorized;
      readonly reason: DeniedReason;
    }
  | StartRunAcceptedResult
  | StartRunDuplicateResult
  | StartRunTenantBackpressureResult
  | StartRunSystemBackpressureResult
  | StartRunRateLimitedResult
  | StartRunPlanRejectedResult;

export type StartRunFacadeExecutionResult = Result<StartRunFacadeResult, StartRunEngineError>;
