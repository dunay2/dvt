import { describe, expect, it } from 'vitest';

import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import { makePlanRef } from '../../testing/contractTestUtils';
import { canvasViewCopy } from './copy';
import {
  observePlanRunReadiness,
  hasPersistedPreviewProof,
  hasPersistedPreviewIdentityMismatch,
  resolvePlanRefForStartRun,
} from './canvasPlanReadiness';
import { deriveCanvasExecutionState } from './canvasExecutionState';

describe('canvasPlanReadiness', () => {
  it('returns planRef from the execution plan when available', () => {
    const planRef = resolvePlanRefForStartRun(mockExecutionPlan);

    expect(planRef).toEqual(mockExecutionPlan.planRef);
  });

  it('returns null when planRef is missing', () => {
    const planRef = resolvePlanRefForStartRun({
      ...mockExecutionPlan,
      planRef: undefined,
    });

    expect(planRef).toBeNull();
  });

  it('accepts persisted preview proof when plan identity aligns even if canonical and executable hashes differ', () => {
    const plan = {
      ...mockExecutionPlan,
      planId: 'plan_live_1',
      planRef: makePlanRef({
        ...mockExecutionPlan.planRef!,
        planId: 'plan_live_1',
        sha256: 'a'.repeat(64),
      }),
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          planRecordId: 'plan_live_1',
          canonicalPlanSha256: 'b'.repeat(64),
        },
      },
    };

    expect(hasPersistedPreviewProof(plan)).toBe(true);
    expect(hasPersistedPreviewIdentityMismatch(plan)).toBe(false);
  });

  it('reports persisted preview mismatch when plan record identity drifts from the active plan', () => {
    const plan = {
      ...mockExecutionPlan,
      planId: 'plan_live_1',
      planRef: makePlanRef({
        ...mockExecutionPlan.planRef!,
        planId: 'plan_live_1',
        sha256: 'a'.repeat(64),
      }),
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          planRecordId: 'plan_other',
          canonicalPlanSha256: 'b'.repeat(64),
        },
      },
    };

    expect(hasPersistedPreviewProof(plan)).toBe(false);
    expect(hasPersistedPreviewIdentityMismatch(plan)).toBe(true);
  });

  it('publishes a ready ObservePlanRunReadiness read model when run inputs are admitted', () => {
    const plan = {
      ...mockExecutionPlan,
      planId: 'plan_live_1',
      planRef: makePlanRef({
        ...mockExecutionPlan.planRef!,
        planId: 'plan_live_1',
        sha256: 'a'.repeat(64),
      }),
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          planRecordId: 'plan_live_1',
          canonicalPlanSha256: 'b'.repeat(64),
        },
      },
    };

    expect(
      observePlanRunReadiness({
        canRun: true,
        currentPlan: plan,
        isCurrentPlanStale: false,
        persistedPreviewIdentityMismatch: false,
        hasPersistedPlanForRun: true,
      })
    ).toEqual({
      blockers: [],
      rail: 'ObservePlanRunReadiness',
      status: 'ready',
      summary: canvasViewCopy.planStatusPreviewReadyMessage,
    });
  });

  it.each([
    ['plan_integrity', { currentPlan: null }],
    ['backpressure', { backpressure: true }],
    ['capability_mismatch', { capabilityMismatch: true }],
    ['adapter_degraded', { adapterDegraded: true }],
    ['authorization_denied', { canRun: false }],
  ] as const)(
    'keeps %s explicit in the ObservePlanRunReadiness read model',
    (expectedBlocker, overrides) => {
      expect(
        observePlanRunReadiness({
          canRun: true,
          currentPlan: {
            ...mockExecutionPlan,
            preview: {
              ...mockExecutionPlan.preview!,
              persisted: {
                planRecordId: mockExecutionPlan.planId,
                canonicalPlanSha256: 'b'.repeat(64),
              },
            },
          },
          isCurrentPlanStale: false,
          persistedPreviewIdentityMismatch: false,
          hasPersistedPlanForRun: true,
          ...overrides,
        }).blockers
      ).toContain(expectedBlocker);
    }
  );

  it('blocks readiness when a persisted plan exists but the current graph is not executable', () => {
    const plan = {
      ...mockExecutionPlan,
      planId: 'plan_live_1',
      planRef: makePlanRef({
        ...mockExecutionPlan.planRef!,
        planId: 'plan_live_1',
        sha256: 'a'.repeat(64),
      }),
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          planRecordId: 'plan_live_1',
          canonicalPlanSha256: 'b'.repeat(64),
        },
      },
    };

    const executionState = deriveCanvasExecutionState({
      canRun: true,
      executionStrategy: {
        kind: 'transformation_preview',
        previewProfile: 'transformation-sql-first-v1',
      },
      currentPlan: plan,
      lastPlannedDraftSignature: null,
      canonicalNodes: [
        {
          id: 'transform_1',
          name: 'Transform',
          pluginId: 'dvt',
          kind: 'dvt:sql_transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [],
      selectedNodeIds: [],
      workspaceNodeIds: ['transform_1'],
    });

    expect(executionState.canStartRun).toBe(false);
    expect(executionState.planRunReadiness.status).toBe('blocked');
    expect(executionState.planRunReadiness.blockers).toContain('plan_integrity');
    expect(executionState.planRunReadiness.summary).toBe(
      executionState.executableGraphFailureMessage
    );
  });

  it('blocks a persisted dbt project preview when its authoritative revision is stale', () => {
    const plan = {
      ...mockExecutionPlan,
      planId: 'plan_dbt_files_1',
      planRef: makePlanRef({
        ...mockExecutionPlan.planRef!,
        planId: 'plan_dbt_files_1',
        sha256: 'a'.repeat(64),
      }),
      preview: {
        ...mockExecutionPlan.preview!,
        persisted: {
          planRecordId: 'plan_dbt_files_1',
          canonicalPlanSha256: 'b'.repeat(64),
        },
        provenance: {
          kind: 'dbt-project-files' as const,
          canvasId: 'analytics-canvas',
          projectRoot: 'analytics',
          contentSetSha256: '1'.repeat(64),
          analysisSha256: '2'.repeat(64),
          dbtVersion: '1.10.0',
          selectedUniqueIds: ['model.analytics.orders'],
          executionTarget: {
            provider: 'server-config',
            adapter: 'postgres',
            targetName: 'development',
            credentialRef: 'vault:dbt/development',
          },
        },
      },
    };

    const executionState = deriveCanvasExecutionState({
      canRun: true,
      executionStrategy: {
        kind: 'dbt_project_file_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
        canvasId: 'analytics-canvas',
        projectRoot: 'analytics',
        contentSetSha256: '1'.repeat(64),
        analysisSha256: '3'.repeat(64),
        dbtVersion: '1.10.0',
        executionTarget: {
          provider: 'server-config',
          adapter: 'postgres',
          targetName: 'development',
          credentialRef: 'vault:dbt/development',
        },
      },
      currentPlan: plan,
      lastPlannedDraftSignature: null,
      canonicalNodes: [
        {
          id: 'model.analytics.orders',
          name: 'orders',
          pluginId: 'dbt',
          kind: 'dbt:model',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [],
      selectedNodeIds: ['model.analytics.orders'],
      workspaceNodeIds: ['model.analytics.orders'],
    });

    expect(executionState.persistedPreviewIdentityMismatch).toBe(true);
    expect(executionState.isCurrentPlanStale).toBe(true);
    expect(executionState.canStartRun).toBe(false);
    expect(executionState.planRunReadiness.blockers).toContain('plan_integrity');
  });
});
