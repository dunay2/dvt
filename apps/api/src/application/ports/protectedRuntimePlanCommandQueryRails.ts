/**
 * Owned concern: catalog protected runtime session and plan command/query rails.
 */
import {
  defineProtectedRuntimeRail,
  type ProtectedRuntimeCommandQueryRail,
} from './protectedRuntimeCommandQueryRailTypes.js';
import {
  PROTECTED_RUNTIME_NEGATIVE_CASE,
  PROTECTED_RUNTIME_PLAN_RAIL,
  PROTECTED_RUNTIME_RAIL_KIND,
  PROTECTED_RUNTIME_TEST_REF,
} from './protectedRuntimeRailVocabulary.js';

export const PROTECTED_RUNTIME_PLAN_COMMAND_QUERY_RAILS = [
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_PLAN_RAIL.getRuntimeSession,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    coverage: [
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.sessionRoute],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.authenticationFailed,
        PROTECTED_RUNTIME_TEST_REF.sessionRoute,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_PLAN_RAIL.startRun,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.startRunAuthAndSuccess,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
        PROTECTED_RUNTIME_TEST_REF.startRunAuthorizedFacadeAuth,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch,
        PROTECTED_RUNTIME_TEST_REF.startRunAuthAndSuccess,
      ],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.clientRunId, PROTECTED_RUNTIME_TEST_REF.startRunValidation],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.invalidPlanSource,
        PROTECTED_RUNTIME_TEST_REF.startRunPlanSourcePolicy,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_PLAN_RAIL.previewExecutablePlan,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.previewPlanRouteAuth,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
        PROTECTED_RUNTIME_TEST_REF.previewPlanRouteAuth,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch,
        PROTECTED_RUNTIME_TEST_REF.planRequestResolver,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.invalidGraphSource,
        PROTECTED_RUNTIME_TEST_REF.previewPlanRouteInputPolicy,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.invalidSelection,
        PROTECTED_RUNTIME_TEST_REF.planRouteSelectionParser,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_PLAN_RAIL.compileExecutablePlan,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.planRequestResolver,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
        PROTECTED_RUNTIME_TEST_REF.planRequestResolver,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch,
        PROTECTED_RUNTIME_TEST_REF.planRequestResolver,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.unsupportedAdapter,
        PROTECTED_RUNTIME_TEST_REF.compilePlanRoute,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_PLAN_RAIL.importExecutablePlan,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken,
        PROTECTED_RUNTIME_TEST_REF.planRequestResolver,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction,
        PROTECTED_RUNTIME_TEST_REF.planRequestResolver,
      ],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch, PROTECTED_RUNTIME_TEST_REF.importPlanRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.invalidPlanRef, PROTECTED_RUNTIME_TEST_REF.importPlanRoute],
    ],
  }),
] as const satisfies readonly ProtectedRuntimeCommandQueryRail[];
