import type { DeniedReason } from '../../domain/auth/types.js';

import type { AuthenticationFailureCode } from './authContract.js';
import {
  START_RUN_RESULT_KIND,
  type StartRunAcceptedResult,
  type StartRunDuplicateResult,
  type StartRunPlanRejectedResult,
  type StartRunRateLimitedResult,
  type StartRunSystemBackpressureResult,
  type StartRunTenantBackpressureResult,
} from './startRunResultContract.js';

export const START_RUN_FACADE_RESULT_KIND = {
  unauthenticated: 'unauthenticated',
  unauthorized: 'unauthorized',
  adapterNotConfigured: 'adapter_not_configured',
  ...START_RUN_RESULT_KIND,
} as const;

export type StartRunFacadeResult =
  | {
      readonly kind: typeof START_RUN_FACADE_RESULT_KIND.unauthenticated;
      readonly code: AuthenticationFailureCode;
    }
  | { readonly kind: typeof START_RUN_FACADE_RESULT_KIND.unauthorized; readonly reason: DeniedReason }
  | {
      readonly kind: typeof START_RUN_FACADE_RESULT_KIND.adapterNotConfigured;
      readonly adapter: string;
    }
  | StartRunAcceptedResult
  | StartRunDuplicateResult
  | StartRunTenantBackpressureResult
  | StartRunSystemBackpressureResult
  | StartRunRateLimitedResult
  | StartRunPlanRejectedResult;
