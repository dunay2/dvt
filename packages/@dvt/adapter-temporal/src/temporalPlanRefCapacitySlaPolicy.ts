/**
 * @ownedConcern Evaluate Temporal PlanRef workflow budgets against governed production capacity SLAs
 * @baseline ADR-0052: PlanRef Continuation Safety
 * @decision Evaluate continue-as-new, history, segment, payload, and retention budgets as explicit readiness evidence.
 * @consequence Production Temporal deployments expose capacity drift before PlanRef continuation safety is at risk.
 * @version 1.0.0
 */

export type TemporalPlanRefCapacityProfileName = 'standard';

export type TemporalPlanRefCapacityViolationCode =
  | 'CONTINUE_AS_NEW_DISABLED'
  | 'LAYER_COUNT_EXCEEDS_PROFILE'
  | 'CONTINUE_AS_NEW_PAYLOAD_EXCEEDS_PROFILE'
  | 'CONTINUE_AS_NEW_PAYLOAD_EXCEEDS_START_BUDGET'
  | 'PLAN_REF_RETENTION_TOO_SHORT'
  | 'SEGMENT_COUNT_EXCEEDS_PROFILE'
  | 'WORKFLOW_HISTORY_EVENTS_EXCEEDS_PROFILE'
  | 'WORKFLOW_HISTORY_BYTES_EXCEEDS_PROFILE';

export interface TemporalPlanRefCapacityProfile {
  name: TemporalPlanRefCapacityProfileName;
  maxWorkflowHistoryEvents: number;
  maxWorkflowHistoryBytes: number;
  maxSegmentCount: number;
  maxLayerCountPerSegment: number;
  maxContinueAsNewPayloadBytes: number;
  planRefRetentionSafetyMarginHours: number;
}

export interface TemporalPlanRefCapacitySlaInput {
  profile: TemporalPlanRefCapacityProfile;
  continueAsNewAfterLayerCount: number;
  maxStartPayloadBytes: number;
  maxContinueAsNewPayloadBytes: number;
  expectedMaxWorkflowDurationHours: number;
  planRefRetentionHours: number;
  expectedMaxSegmentCount?: number;
  estimatedWorkflowHistoryEvents?: number;
  estimatedWorkflowHistoryBytes?: number;
}

export interface TemporalPlanRefCapacityViolation {
  code: TemporalPlanRefCapacityViolationCode;
  message: string;
}

export interface TemporalPlanRefCapacitySlaEvaluation {
  status: 'production_ready' | 'not_production_ready';
  violations: TemporalPlanRefCapacityViolation[];
}

export const TEMPORAL_PLANREF_CAPACITY_PROFILE = {
  standard: {
    name: 'standard',
    maxWorkflowHistoryEvents: 10_000,
    maxWorkflowHistoryBytes: 40_000_000,
    maxSegmentCount: 1_000,
    maxLayerCountPerSegment: 100,
    maxContinueAsNewPayloadBytes: 500_000,
    planRefRetentionSafetyMarginHours: 24,
  },
} as const satisfies Record<TemporalPlanRefCapacityProfileName, TemporalPlanRefCapacityProfile>;

export function evaluateTemporalPlanRefCapacitySla(
  input: TemporalPlanRefCapacitySlaInput
): TemporalPlanRefCapacitySlaEvaluation {
  const violations: TemporalPlanRefCapacityViolation[] = [
    ...evaluateRolloverBudget(input),
    ...evaluatePayloadBudget(input),
    ...evaluatePlanRefRetentionBudget(input),
    ...evaluateProfileMaximums(input),
  ];

  return {
    status: violations.length === 0 ? 'production_ready' : 'not_production_ready',
    violations,
  };
}

function evaluateRolloverBudget(
  input: TemporalPlanRefCapacitySlaInput
): TemporalPlanRefCapacityViolation[] {
  if (input.continueAsNewAfterLayerCount > 0) {
    return input.continueAsNewAfterLayerCount <= input.profile.maxLayerCountPerSegment
      ? []
      : [
          {
            code: 'LAYER_COUNT_EXCEEDS_PROFILE',
            message:
              'continueAsNewAfterLayerCount must be less than or equal to the profile layer limit',
          },
        ];
  }

  return [
    {
      code: 'CONTINUE_AS_NEW_DISABLED',
      message: 'continueAsNewAfterLayerCount must be greater than 0 for production profiles',
    },
  ];
}

function evaluateProfileMaximums(
  input: TemporalPlanRefCapacitySlaInput
): TemporalPlanRefCapacityViolation[] {
  return [
    ...evaluateOptionalMaximum(
      input.expectedMaxSegmentCount,
      input.profile.maxSegmentCount,
      'SEGMENT_COUNT_EXCEEDS_PROFILE',
      'expectedMaxSegmentCount must be less than or equal to the profile segment limit'
    ),
    ...evaluateOptionalMaximum(
      input.estimatedWorkflowHistoryEvents,
      input.profile.maxWorkflowHistoryEvents,
      'WORKFLOW_HISTORY_EVENTS_EXCEEDS_PROFILE',
      'estimatedWorkflowHistoryEvents must be less than or equal to the profile event limit'
    ),
    ...evaluateOptionalMaximum(
      input.estimatedWorkflowHistoryBytes,
      input.profile.maxWorkflowHistoryBytes,
      'WORKFLOW_HISTORY_BYTES_EXCEEDS_PROFILE',
      'estimatedWorkflowHistoryBytes must be less than or equal to the profile byte limit'
    ),
  ];
}

function evaluateOptionalMaximum(
  value: number | undefined,
  maximum: number,
  code: TemporalPlanRefCapacityViolationCode,
  message: string
): TemporalPlanRefCapacityViolation[] {
  if (value === undefined || value <= maximum) {
    return [];
  }

  return [{ code, message }];
}

function evaluatePayloadBudget(
  input: TemporalPlanRefCapacitySlaInput
): TemporalPlanRefCapacityViolation[] {
  const violations: TemporalPlanRefCapacityViolation[] = [];

  if (input.maxContinueAsNewPayloadBytes > input.maxStartPayloadBytes) {
    violations.push({
      code: 'CONTINUE_AS_NEW_PAYLOAD_EXCEEDS_START_BUDGET',
      message: 'maxContinueAsNewPayloadBytes must be less than or equal to maxStartPayloadBytes',
    });
  }

  if (input.maxContinueAsNewPayloadBytes > input.profile.maxContinueAsNewPayloadBytes) {
    violations.push({
      code: 'CONTINUE_AS_NEW_PAYLOAD_EXCEEDS_PROFILE',
      message:
        'maxContinueAsNewPayloadBytes must be less than or equal to the profile continuation payload limit',
    });
  }

  return violations;
}

function evaluatePlanRefRetentionBudget(
  input: TemporalPlanRefCapacitySlaInput
): TemporalPlanRefCapacityViolation[] {
  const minimumRetentionHours =
    input.expectedMaxWorkflowDurationHours + input.profile.planRefRetentionSafetyMarginHours;

  if (input.planRefRetentionHours > minimumRetentionHours) {
    return [];
  }

  return [
    {
      code: 'PLAN_REF_RETENTION_TOO_SHORT',
      message:
        'planRefRetentionHours must be greater than expectedMaxWorkflowDurationHours plus the profile safety margin',
    },
  ];
}
