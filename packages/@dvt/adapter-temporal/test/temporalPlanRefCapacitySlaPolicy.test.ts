import { describe, expect, it } from 'vitest';

import {
  TEMPORAL_PLANREF_CAPACITY_PROFILE,
  evaluateTemporalPlanRefCapacitySla,
} from '../src/temporalPlanRefCapacitySlaPolicy.js';

describe('Temporal PlanRef capacity SLA policy', () => {
  it('accepts the governed standard profile when rollover, payload, and retention budgets align', () => {
    expect(
      evaluateTemporalPlanRefCapacitySla({
        profile: TEMPORAL_PLANREF_CAPACITY_PROFILE.standard,
        continueAsNewAfterLayerCount: 100,
        maxStartPayloadBytes: 2_000_000,
        maxContinueAsNewPayloadBytes: 500_000,
        expectedMaxWorkflowDurationHours: 24,
        planRefRetentionHours: 72,
      })
    ).toEqual({
      status: 'production_ready',
      violations: [],
    });
  });

  it('reports explicit capacity violations instead of treating diagnostic overrides as production ready', () => {
    expect(
      evaluateTemporalPlanRefCapacitySla({
        profile: TEMPORAL_PLANREF_CAPACITY_PROFILE.standard,
        continueAsNewAfterLayerCount: 0,
        maxStartPayloadBytes: 2_000_000,
        maxContinueAsNewPayloadBytes: 2_000_001,
        expectedMaxWorkflowDurationHours: 96,
        planRefRetentionHours: 24,
      })
    ).toEqual({
      status: 'not_production_ready',
      violations: [
        {
          code: 'CONTINUE_AS_NEW_DISABLED',
          message: 'continueAsNewAfterLayerCount must be greater than 0 for production profiles',
        },
        {
          code: 'CONTINUE_AS_NEW_PAYLOAD_EXCEEDS_START_BUDGET',
          message:
            'maxContinueAsNewPayloadBytes must be less than or equal to maxStartPayloadBytes',
        },
        {
          code: 'CONTINUE_AS_NEW_PAYLOAD_EXCEEDS_PROFILE',
          message:
            'maxContinueAsNewPayloadBytes must be less than or equal to the profile continuation payload limit',
        },
        {
          code: 'PLAN_REF_RETENTION_TOO_SHORT',
          message:
            'planRefRetentionHours must be greater than expectedMaxWorkflowDurationHours plus the profile safety margin',
        },
      ],
    });
  });

  it('reports profile maximum violations for segment, history, and rollover budgets', () => {
    expect(
      evaluateTemporalPlanRefCapacitySla({
        profile: TEMPORAL_PLANREF_CAPACITY_PROFILE.standard,
        continueAsNewAfterLayerCount: 101,
        maxStartPayloadBytes: 2_000_000,
        maxContinueAsNewPayloadBytes: 500_000,
        expectedMaxWorkflowDurationHours: 24,
        planRefRetentionHours: 72,
        expectedMaxSegmentCount: 1_001,
        estimatedWorkflowHistoryEvents: 10_001,
        estimatedWorkflowHistoryBytes: 40_000_001,
      })
    ).toEqual({
      status: 'not_production_ready',
      violations: [
        {
          code: 'LAYER_COUNT_EXCEEDS_PROFILE',
          message:
            'continueAsNewAfterLayerCount must be less than or equal to the profile layer limit',
        },
        {
          code: 'SEGMENT_COUNT_EXCEEDS_PROFILE',
          message:
            'expectedMaxSegmentCount must be less than or equal to the profile segment limit',
        },
        {
          code: 'WORKFLOW_HISTORY_EVENTS_EXCEEDS_PROFILE',
          message:
            'estimatedWorkflowHistoryEvents must be less than or equal to the profile event limit',
        },
        {
          code: 'WORKFLOW_HISTORY_BYTES_EXCEEDS_PROFILE',
          message:
            'estimatedWorkflowHistoryBytes must be less than or equal to the profile byte limit',
        },
      ],
    });
  });

  it('rejects continue-as-new payload budgets that exceed the governed profile cap', () => {
    expect(
      evaluateTemporalPlanRefCapacitySla({
        profile: TEMPORAL_PLANREF_CAPACITY_PROFILE.standard,
        continueAsNewAfterLayerCount: 100,
        maxStartPayloadBytes: 2_000_000,
        maxContinueAsNewPayloadBytes: 500_001,
        expectedMaxWorkflowDurationHours: 24,
        planRefRetentionHours: 72,
      })
    ).toEqual({
      status: 'not_production_ready',
      violations: [
        {
          code: 'CONTINUE_AS_NEW_PAYLOAD_EXCEEDS_PROFILE',
          message:
            'maxContinueAsNewPayloadBytes must be less than or equal to the profile continuation payload limit',
        },
      ],
    });
  });
});
