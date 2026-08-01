import { EXECUTABILITY_REJECTION_CODES } from '@dvt/contracts';

import type { PlanPreviewOutcome } from '../../ports/plans';
import type { PlanViewModel } from '../../types/plans';
import type { PlanRunReadinessBlocker } from './canvasPlanReadiness';

const CAPABILITY_REJECTION_CODES = new Set([
  'MISSING_CAPABILITY',
  'POLICY_UNSUPPORTED',
  'INVALID_STEP_KIND',
]);
const KNOWN_EXECUTABILITY_REJECTION_CODES = new Set<string>(EXECUTABILITY_REJECTION_CODES);

export type CanvasPreviewOutcomeDiagnostic = Readonly<{
  code: string;
  cause?: string;
  reason?: string;
}>;

export type CanvasPreviewOutcomeProjection = Readonly<{
  currentPlan: PlanViewModel | null;
  readinessBlocker: PlanRunReadinessBlocker | null;
  diagnostic: CanvasPreviewOutcomeDiagnostic | null;
}>;

function projectDiagnostic(
  diagnostic: CanvasPreviewOutcomeDiagnostic,
  knownCode: boolean
): CanvasPreviewOutcomeDiagnostic {
  if (!knownCode) {
    return { code: diagnostic.code };
  }

  return {
    code: diagnostic.code,
    ...(diagnostic.cause ? { cause: diagnostic.cause } : {}),
    ...(diagnostic.reason ? { reason: diagnostic.reason } : {}),
  };
}

export function projectCanvasPreviewOutcome(
  outcome: PlanPreviewOutcome
): CanvasPreviewOutcomeProjection {
  switch (outcome.kind) {
    case 'accepted':
      return {
        currentPlan: outcome.plan,
        readinessBlocker: null,
        diagnostic: null,
      };
    case 'selection-rejected':
      return {
        currentPlan: null,
        readinessBlocker: 'plan_integrity',
        diagnostic: projectDiagnostic(outcome.rejection, outcome.rejection.code === 'REJECTED'),
      };
    case 'plan-invalid':
      return {
        currentPlan: outcome.plan,
        readinessBlocker: CAPABILITY_REJECTION_CODES.has(outcome.validation.code)
          ? 'capability_mismatch'
          : 'plan_integrity',
        diagnostic: projectDiagnostic(
          outcome.validation,
          KNOWN_EXECUTABILITY_REJECTION_CODES.has(outcome.validation.code)
        ),
      };
    default: {
      const unsupportedOutcome = outcome as { readonly kind?: unknown };
      return {
        currentPlan: null,
        readinessBlocker: 'plan_integrity',
        diagnostic: {
          code: 'UNKNOWN_PREVIEW_OUTCOME',
          ...(typeof unsupportedOutcome.kind === 'string'
            ? { cause: unsupportedOutcome.kind }
            : {}),
        },
      };
    }
  }
}

export function doesPreviewOutcomeOwnPlan(
  outcome: PlanPreviewOutcome,
  currentPlan: PlanViewModel | null
): boolean {
  if (outcome.kind === 'selection-rejected') {
    return currentPlan == null;
  }

  return (
    currentPlan?.planId === outcome.plan.planId &&
    currentPlan.planRef?.sha256 === outcome.plan.planRef.sha256
  );
}
