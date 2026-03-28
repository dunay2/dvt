import type { DeniedReason } from '../../domain/auth/types.js';

import type { AuthenticationFailureCode } from './authContract.js';
import type { StartRunEngineError } from './startRunEngineErrorContract.js';
import {
  START_RUN_RESULT_KIND,
  type StartRunAcceptedResult,
  type StartRunDuplicateResult,
  type StartRunPlanRejectedResult,
  type StartRunRateLimitedResult,
  type StartRunSystemBackpressureResult,
  type StartRunTenantBackpressureResult,
} from './startRunResultContract.js';
import type { Result } from './startRunUseCaseContract.js';

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
