// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import { makePlanRef } from '../../testing/contractTestUtils';
import type { PlanViewModel } from '../../types/plans';
import { canvasViewCopy, resolveCanvasViewCopy } from './copy';
import {
  observePlanRunReadiness,
  hasPersistedPreviewProof,
  hasPersistedPreviewIdentityMismatch,
  resolvePlanRefForStartRun,
} from './canvasPlanReadiness';
import { deriveCanvasExecutionState } from './canvasExecutionState';
import {
  presentCanvasExecutionState,
  presentPlanRunReadiness,
} from './canvasReadinessPresentation';

describe('canvasPlanReadiness', () => {
  it.each([
    ['required', { currentPlan: null }],
    ['stale', { isCurrentPlanStale: true }],
    ['plan_ref_unavailable', { currentPlan: { ...mockExecutionPlan, planRef: undefined } }],
    ['identity_mismatch', { persistedPreviewIdentityMismatch: true }],
    ['not_persisted', { hasPersistedPlanForRun: false }],
    ['ready', {}],
  ] as const)(
    'evaluates typed Preview state %s without presentation prose',
    (previewState, overrides) => {
      const evaluation = observePlanRunReadiness({
        runAdmission: { allowed: true },
        currentPlan: mockExecutionPlan,
        isCurrentPlanStale: false,
        persistedPreviewIdentityMismatch: false,
        hasPersistedPlanForRun: true,
        ...overrides,
      });
      expect(evaluation).toMatchObject({ previewState, summaryBlocker: null });
      expect(evaluation).not.toHaveProperty('summary');
      expect(evaluation).not.toHaveProperty('diagnostic');
    }
  );

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
    const plan: PlanViewModel = {
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

  it('keeps saving distinct from authorization and reports the pending draft', () => {
    const readiness = observePlanRunReadiness({
      runAdmission: { allowed: false, reason: 'draft_saving' },
      currentPlan: null,
      isCurrentPlanStale: false,
      persistedPreviewIdentityMismatch: false,
      hasPersistedPlanForRun: false,
    });
    expect(readiness.blockers).toEqual(['draft_saving', 'plan_integrity']);
    expect(presentPlanRunReadiness(readiness, 'es').summary).toContain('guardado');
    expect(readiness.blockers).not.toContain('authorization_denied');
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
      presentPlanRunReadiness(
        observePlanRunReadiness({
          runAdmission: { allowed: true },
          currentPlan: plan,
          isCurrentPlanStale: false,
          persistedPreviewIdentityMismatch: false,
          hasPersistedPlanForRun: true,
        })
      )
    ).toEqual({
      blockers: [],
      rail: 'ObservePlanRunReadiness',
      status: 'ready',
      summary: canvasViewCopy.planStatusPreviewReadyMessage,
    });
  });

  it('resolves the readiness summary from the requested application language', () => {
    const args = {
      runAdmission: { allowed: true },
      currentPlan: null,
      isCurrentPlanStale: false,
      persistedPreviewIdentityMismatch: false,
      hasPersistedPlanForRun: false,
    } as const;

    const evaluation = observePlanRunReadiness(args);
    Object.freeze(evaluation.blockers);
    Object.freeze(evaluation);
    const before = structuredClone(evaluation);
    expect(presentPlanRunReadiness(evaluation, 'en').summary).toBe(
      resolveCanvasViewCopy('en').planStatusPreviewRequiredMessage
    );
    expect(presentPlanRunReadiness(evaluation, 'es').summary).toBe(
      resolveCanvasViewCopy('es').planStatusPreviewRequiredMessage
    );
    expect(evaluation).toEqual(before);
    expect(presentPlanRunReadiness(evaluation, 'es')).toMatchObject({
      status: 'blocked',
      blockers: ['plan_integrity'],
    });
  });

  it('keeps blocker order and summary priority independent of presentation', () => {
    const evaluation = observePlanRunReadiness({
      runAdmission: { allowed: false, reason: 'capability_mismatch' },
      currentPlan: null,
      isCurrentPlanStale: false,
      persistedPreviewIdentityMismatch: false,
      hasPersistedPlanForRun: false,
      backpressure: true,
      capabilityMismatch: true,
      adapterDegraded: true,
    });
    expect(evaluation.blockers).toEqual([
      'capability_mismatch',
      'plan_integrity',
      'backpressure',
      'adapter_degraded',
    ]);
    expect(evaluation.summaryBlocker).toBe('backpressure');
    const copy = resolveCanvasViewCopy('es');
    expect(presentPlanRunReadiness(evaluation, 'es')).toMatchObject({
      summary: copy.planStatusBackpressureMessage,
      diagnostic: { blocker: 'plan_integrity', message: copy.planStatusPreviewRequiredMessage },
    });
  });

  it.each([
    ['plan_integrity', { currentPlan: null }],
    ['backpressure', { backpressure: true }],
    ['capability_mismatch', { capabilityMismatch: true }],
    ['adapter_degraded', { adapterDegraded: true }],
    [
      'authorization_denied',
      { runAdmission: { allowed: false, reason: 'authorization_denied' } as const },
    ],
  ] as const)(
    'keeps %s explicit in the ObservePlanRunReadiness read model',
    (expectedBlocker, overrides) => {
      expect(
        observePlanRunReadiness({
          runAdmission: { allowed: true },
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

  it('blocks a persisted dbt project preview when its authoritative revision is stale', () => {
    const plan: PlanViewModel = {
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
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId: 'warehouse-development',
              provider: 'postgres',
            },
            resolutionSource: 'environment-default',
            credentialRef: 'vault:dbt/development',
          },
        },
      },
    };

    const executionState = deriveCanvasExecutionState({
      runAdmission: { allowed: true },
      executionStrategy: {
        kind: 'dbt_project_file_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
        canvasId: 'analytics-canvas',
        projectRoot: 'analytics',
        contentSetSha256: '1'.repeat(64),
        analysisSha256: '3'.repeat(64),
        dbtVersion: '1.10.0',
        plannerGraphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: '1.0',
          nodes: [
            {
              nodeId: 'model.analytics.orders',
              stepKind: 'DBT_MODEL',
              dependsOn: [],
            },
          ],
        },
        executionTarget: {
          provider: 'server-config',
          adapter: 'postgres',
          targetName: 'development',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-development',
            provider: 'postgres',
          },
          resolutionSource: 'environment-default',
          credentialRef: 'vault:dbt/development',
        },
      },
      currentPlan: plan,
      lastPlannedDraftSignature: null,
      canonicalNodes: [
        {
          id: 'model.analytics.orders',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [],
      selectionIntent: { mode: 'explicit', nodeIds: ['model.analytics.orders'] },
      workspaceNodeIds: ['model.analytics.orders'],
      latestPreviewOutcome: null,
    });

    expect(executionState.persistedPreviewIdentityMismatch).toBe(true);
    expect(executionState.isCurrentPlanStale).toBe(true);
    expect(executionState.canStartRun).toBe(false);
    expect(executionState.planRunReadiness.blockers).toContain('plan_integrity');
  });

  it('blocks Preview when an explicit dbt selection has no executable resources', () => {
    const executionState = deriveCanvasExecutionState({
      runAdmission: { allowed: true },
      executionStrategy: {
        kind: 'dbt_project_file_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
        canvasId: 'analytics-canvas',
        projectRoot: 'analytics',
        contentSetSha256: '1'.repeat(64),
        analysisSha256: '2'.repeat(64),
        dbtVersion: '1.10.0',
        plannerGraphSource: {
          kind: 'generic-graph-v1',
          sourceFamily: 'dbt',
          sourceVersion: '1.0',
          nodes: [{ nodeId: 'model.analytics.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
        },
        executionTarget: {
          provider: 'server-config',
          adapter: 'postgres',
          targetName: 'development',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-development',
            provider: 'postgres',
          },
          resolutionSource: 'environment-default',
          credentialRef: 'vault:dbt/development',
        },
      },
      currentPlan: null,
      lastPlannedDraftSignature: null,
      canonicalNodes: [
        {
          id: 'source.analytics.raw.orders',
          name: 'raw_orders',
          pluginId: 'dvt',
          kind: 'dvt:source',
          role: 'input',
          status: 'idle',
          tags: [],
        },
        {
          id: 'model.analytics.orders',
          name: 'orders',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
        },
      ],
      canonicalEdges: [],
      selectionIntent: {
        mode: 'explicit',
        nodeIds: ['source.analytics.raw.orders'],
      },
      workspaceNodeIds: ['source.analytics.raw.orders', 'model.analytics.orders'],
      latestPreviewOutcome: null,
    });

    expect(executionState.canPlanGraph).toBe(false);
    expect(executionState.executableGraphFailure?.kind).toBe('projection');
    expect(presentCanvasExecutionState(executionState).executableGraphFailureMessage).toBe(
      'Execution selection contains unavailable or non-executable resources. Resolve the explicit selection in Operations before Preview.'
    );
    expect(executionState.planRunReadiness.blockers).toContain('plan_integrity');
  });
});
