/**
 * Owned concern: define the local engine-error taxonomy returned by the
 * start-run application port before HTTP translation.
 */
export const START_RUN_ENGINE_ERROR_KIND = {
  adapterNotRegistered: 'adapter_not_registered',
  unsupportedPlanVersion: 'unsupported_plan_version',
  commandInvalid: 'command_invalid',
} as const;

export const START_RUN_ENGINE_ERROR_CODE = {
  intentActiveConflict: 'INTENT_ACTIVE_CONFLICT',
  planRefRequired: 'PLAN_REF_REQUIRED',
} as const;

export const START_RUN_ENGINE_ERROR_REASON = {
  planRefRequired: 'A plan reference is required to start a run.',
} as const;

export type StartRunEngineError =
  | {
      readonly kind: typeof START_RUN_ENGINE_ERROR_KIND.adapterNotRegistered;
      readonly adapter: string;
    }
  | {
      readonly kind: typeof START_RUN_ENGINE_ERROR_KIND.unsupportedPlanVersion;
      readonly planVersion: string;
      readonly supportedVersions: readonly string[];
    }
  | {
      readonly kind: typeof START_RUN_ENGINE_ERROR_KIND.commandInvalid;
      readonly code: typeof START_RUN_ENGINE_ERROR_CODE.planRefRequired;
      readonly reason: typeof START_RUN_ENGINE_ERROR_REASON.planRefRequired;
    };
