// @vitest-environment jsdom
import { describe, expect, expectTypeOf, it } from 'vitest';
import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';
import { makePlanRef } from '../../testing/contractTestUtils';
import type { PlanViewModel } from '../../types/plans';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import { observePlanRunReadiness, type PlanRunReadinessArgs } from './canvasPlanReadiness';
import { deriveCanvasExecutionState } from './canvasExecutionState';
import { evaluateCanvasExecutionGraph } from './canvasExecutionGraph';
import { presentPlanRunReadiness } from './canvasReadinessPresentation';

function persistedPlan(): PlanViewModel {
  return {
    ...mockExecutionPlan,
    preview: {
      ...mockExecutionPlan.preview!,
      persisted: { planRecordId: mockExecutionPlan.planId, canonicalPlanSha256: 'a'.repeat(64) },
    },
  };
}
function readinessFacts(overrides: Partial<PlanRunReadinessArgs> = {}): PlanRunReadinessArgs {
  return {
    runAdmission: { allowed: true },
    currentPlan: persistedPlan(),
    isCurrentPlanStale: false,
    previewProvenanceMismatch: false,
    executionAvailable: true,
    graphFailure: null,
    previewRejection: null,
    ...overrides,
  };
}

describe('canvasPlanReadiness', () => {
  it('carries only an admitted exact target and derives proof from the actual plan', () => {
    const plan = persistedPlan();
    const evaluation = observePlanRunReadiness(readinessFacts({ currentPlan: plan }));
    expect(evaluation).toMatchObject({ status: 'ready', target: { plan, planRef: plan.planRef } });
    expect(evaluation.target?.plan).toBe(plan);
    const invalid = observePlanRunReadiness(
      readinessFacts({ currentPlan: { ...plan, preview: undefined } })
    );
    expect(invalid).toMatchObject({
      status: 'blocked',
      target: null,
      previewState: 'not_persisted',
    });
  });

  it.each([
    ['required', { currentPlan: null }],
    ['stale', { isCurrentPlanStale: true }],
    ['plan_ref_unavailable', { currentPlan: { ...persistedPlan(), planRef: undefined } }],
    ['identity_mismatch', { previewProvenanceMismatch: true }],
    ['not_persisted', { currentPlan: { ...persistedPlan(), preview: undefined } }],
    ['ready', {}],
  ] as const)(
    'evaluates typed Preview state %s without localized prose',
    (previewState, overrides) => {
      const evaluation = observePlanRunReadiness(readinessFacts(overrides));
      expect(evaluation.previewState).toBe(previewState);
      expect(evaluation.status).toBe(previewState === 'ready' ? 'ready' : 'blocked');
      expect(evaluation).not.toHaveProperty('summary');
      expect(evaluation.diagnostic).toBeNull();
    }
  );

  it.each(['plan_id', 'plan_ref_id', 'missing_hash', 'missing_record'] as const)(
    'rejects incomplete or mismatched persisted proof: %s',
    (fault) => {
      const plan = persistedPlan();
      if (fault === 'plan_id') plan.planId = 'different-plan';
      if (fault === 'plan_ref_id')
        plan.planRef = makePlanRef({ ...plan.planRef!, planId: 'different-ref' });
      if (fault === 'missing_hash')
        plan.preview = {
          ...plan.preview!,
          persisted: { planRecordId: plan.planId, canonicalPlanSha256: '' },
        };
      if (fault === 'missing_record')
        plan.preview = {
          ...plan.preview!,
          persisted: { planRecordId: '', canonicalPlanSha256: 'a'.repeat(64) },
        };
      expect(observePlanRunReadiness(readinessFacts({ currentPlan: plan }))).toMatchObject({
        status: 'blocked',
        target: null,
        blockers: ['plan_integrity'],
      });
    }
  );

  it('accepts distinct canonical and executable hashes when persisted identity aligns', () => {
    const plan = persistedPlan();
    plan.planRef = makePlanRef({ ...plan.planRef!, sha256: 'b'.repeat(64) });
    expect(observePlanRunReadiness(readinessFacts({ currentPlan: plan })).status).toBe('ready');
  });

  it.each([
    'draft_saving',
    'draft_unavailable',
    'authorization_denied',
    'capability_mismatch',
  ] as const)('preserves current admission %s and never returns a target', (reason) => {
    const evaluation = observePlanRunReadiness(
      readinessFacts({
        runAdmission: { allowed: false, reason },
        currentPlan: null,
        executionAvailable: reason !== 'capability_mismatch',
      })
    );
    expect(evaluation).toMatchObject({ status: 'blocked', target: null, primaryBlocker: reason });
    expect(evaluation.blockers).toEqual([reason, 'plan_integrity']);
  });

  it('keeps denial primary while retaining a cause-specific graph diagnostic', () => {
    const evaluation = observePlanRunReadiness(
      readinessFacts({
        runAdmission: { allowed: false, reason: 'authorization_denied' },
        currentPlan: null,
        graphFailure: { cause: 'protected_path_required' },
      })
    );
    const copy = resolveCanvasViewCopy('es');
    expect(presentPlanRunReadiness(evaluation, 'es')).toMatchObject({
      summary: copy.planStatusRunAuthorizationDeniedMessage,
      diagnostic: {
        blocker: 'plan_integrity',
        message: copy.previewProvenanceTransformPathRequiredMessage,
      },
    });
  });

  it('presentation preserves frozen admission facts and changes only language', () => {
    const evaluation = observePlanRunReadiness(readinessFacts({ currentPlan: null }));
    Object.freeze(evaluation.blockers);
    Object.freeze(evaluation);
    const before = structuredClone(evaluation);
    for (const language of ['en', 'es']) {
      expect(presentPlanRunReadiness(evaluation, language)).toMatchObject({
        status: 'blocked',
        summary: resolveCanvasViewCopy(language).planStatusPreviewRequiredMessage,
        blockers: ['plan_integrity'],
      });
    }
    expect(evaluation).toEqual(before);
  });

  it('a Preview rejection without trusted prose cannot describe a blocked target as ready', () => {
    const evaluation = observePlanRunReadiness(
      readinessFacts({
        previewRejection: {
          kind: 'preview',
          blocker: 'plan_integrity',
          diagnostic: { code: 'UNKNOWN_PREVIEW_OUTCOME' },
        },
      })
    );
    expect(evaluation).toMatchObject({ status: 'blocked', target: null });
    const copy = resolveCanvasViewCopy('en');
    expect(presentPlanRunReadiness(evaluation, 'en').summary).toBe(
      copy.planStatusPreviewRequiredMessage
    );
  });

  it('has no dormant capacity inputs or caller-supplied persisted-proof flags', () => {
    expectTypeOf<PlanRunReadinessArgs>().not.toHaveProperty('backpressure');
    expectTypeOf<PlanRunReadinessArgs>().not.toHaveProperty('adapterDegraded');
    expectTypeOf<PlanRunReadinessArgs>().not.toHaveProperty('hasPersistedPlanForRun');
  });

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

    const executionStateGraph = evaluateCanvasExecutionGraph({
      registeredStrategy: {
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
      graphDraftCanvasId: null,
    });
    const executionState = deriveCanvasExecutionState({
      graph: executionStateGraph,
      runAdmission: { allowed: true },
      currentPlan: plan,
      lastPlannedDraftSignature: null,
      latestPreviewOutcome: null,
    });

    expect(executionState.planRunReadiness.target).toBeNull();
    expect(executionState.isCurrentPlanStale).toBe(true);
    expect(executionState.planRunReadiness.status).toBe('blocked');
    expect(executionState.planRunReadiness.blockers).toContain('plan_integrity');
  });

  it('blocks Preview when an explicit dbt selection has no executable resources', () => {
    const executionStateGraph = evaluateCanvasExecutionGraph({
      registeredStrategy: {
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
      graphDraftCanvasId: null,
    });
    const executionState = deriveCanvasExecutionState({
      graph: executionStateGraph,
      runAdmission: { allowed: true },
      currentPlan: null,
      lastPlannedDraftSignature: null,
      latestPreviewOutcome: null,
    });

    expect(executionStateGraph.canPlanGraph).toBe(false);
    expect(executionStateGraph.failure?.cause).toBe('execution_selection_unavailable');
    expect(presentPlanRunReadiness(executionState.planRunReadiness).summary).toBe(
      'Execution selection contains unavailable or non-executable resources. Resolve the explicit selection in Operations before Preview.'
    );
    expect(executionState.planRunReadiness.blockers).toContain('plan_integrity');
  });
});
