/**
 * Owned concern: catalog protected runtime run read/control/repair rails.
 */
import {
  defineProtectedRuntimeRail,
  type ProtectedRuntimeCommandQueryRail,
} from './protectedRuntimeCommandQueryRailTypes.js';
import {
  PROTECTED_RUNTIME_NEGATIVE_CASE,
  PROTECTED_RUNTIME_RAIL_KIND,
  PROTECTED_RUNTIME_TEST_REF,
} from './protectedRuntimeRailVocabulary.js';
import {
  PROTECTED_RUNTIME_RUN_COMPATIBILITY_POLICY,
  PROTECTED_RUNTIME_RUN_RAIL,
} from './protectedRuntimeRunRailVocabulary.js';

export const PROTECTED_RUNTIME_RUN_COMMAND_QUERY_RAILS = [
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_RUN_RAIL.listRuns,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    coverage: [
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.listRunsRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction, PROTECTED_RUNTIME_TEST_REF.listRunsRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch, PROTECTED_RUNTIME_TEST_REF.listRunsRoute],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_RUN_RAIL.getRunStatus,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    coverage: [
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.getRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction, PROTECTED_RUNTIME_TEST_REF.getRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch, PROTECTED_RUNTIME_TEST_REF.getRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.unknownRun, PROTECTED_RUNTIME_TEST_REF.getRunRoute],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_RUN_RAIL.getRunEvents,
    kind: PROTECTED_RUNTIME_RAIL_KIND.query,
    coverage: [
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.getRunEventsRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction, PROTECTED_RUNTIME_TEST_REF.getRunEventsRoute],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch,
        PROTECTED_RUNTIME_TEST_REF.getRunEventsRoute,
      ],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.unknownRun, PROTECTED_RUNTIME_TEST_REF.getRunEventsRoute],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_RUN_RAIL.signalRun,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.signalRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction, PROTECTED_RUNTIME_TEST_REF.signalRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch, PROTECTED_RUNTIME_TEST_REF.signalRunRoute],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.unsupportedSignal,
        PROTECTED_RUNTIME_TEST_REF.signalRunParser,
      ],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.compatibilityDisabled,
        PROTECTED_RUNTIME_TEST_REF.signalRunParser,
      ],
    ],
    compatibilityPosture: PROTECTED_RUNTIME_RUN_COMPATIBILITY_POLICY.cancelThroughSignal,
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_RUN_RAIL.cancelRun,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.cancelRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction, PROTECTED_RUNTIME_TEST_REF.cancelRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch, PROTECTED_RUNTIME_TEST_REF.cancelRunParser],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.nonEmptyReason, PROTECTED_RUNTIME_TEST_REF.cancelRunParser],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_RUN_RAIL.recoverRun,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.recoverRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction, PROTECTED_RUNTIME_TEST_REF.recoverRunRoute],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch, PROTECTED_RUNTIME_TEST_REF.recoverRunParser],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.invalidRecoverySource,
        PROTECTED_RUNTIME_TEST_REF.recoverRunParser,
      ],
    ],
  }),
  defineProtectedRuntimeRail({
    ...PROTECTED_RUNTIME_RUN_RAIL.rebuildRunSnapshot,
    kind: PROTECTED_RUNTIME_RAIL_KIND.command,
    coverage: [
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.disabledRoute,
        PROTECTED_RUNTIME_TEST_REF.protectedRuntimeRoutes,
      ],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingToken, PROTECTED_RUNTIME_TEST_REF.adminRoutes],
      [PROTECTED_RUNTIME_NEGATIVE_CASE.missingAction, PROTECTED_RUNTIME_TEST_REF.adminRoutes],
      [
        PROTECTED_RUNTIME_NEGATIVE_CASE.tenantMismatch,
        PROTECTED_RUNTIME_TEST_REF.adminRebuildSnapshotAccess,
      ],
    ],
  }),
] as const satisfies readonly ProtectedRuntimeCommandQueryRail[];
