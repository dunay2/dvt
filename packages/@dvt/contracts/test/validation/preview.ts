import { describe, expect, it } from 'vitest';

import { PreviewProfileSchema } from '../../src/schemas.js';
import {
  ContractValidationError,
  parsePlanPreviewPersistResponse,
  parsePlanPreviewRejectedOutcome,
  parsePlanPreviewRequest,
} from '../../src/validation.js';

const context = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'prod',
  runId: 'run-1',
  targetAdapter: 'temporal',
} as const;

const graphSource = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dbt',
  sourceVersion: 'manifest-v12',
  nodes: [{ nodeId: 'model.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
} as const;

const selection = { mode: 'explicit', nodeIds: ['model.orders'] } as const;

const plan = {
  metadata: {
    planVersion: '1.0',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    inputHashSha256: 'f'.repeat(64),
    planId: '1'.repeat(64),
    createdAtIso: '2026-09-03T00:00:00.000Z',
  },
  steps: [{ stepId: 'model.orders', kind: 'DBT_MODEL', dependsOn: [] }],
} as const;

const planRef = {
  uri: 'dvt-plan://plans/plan-1',
  sha256: 'd'.repeat(64),
  schemaVersion: '1.0',
  planId: plan.metadata.planId,
  planVersion: plan.metadata.planVersion,
} as const;

export function registerValidationPreviewSuite(): void {
  describe('plan preview contracts', () => {
    it('accepts the generic persisted-preview request', () => {
      const request = parsePlanPreviewRequest({
        previewProfile: 'planner-generic-v1',
        context,
        selection,
        graphSource,
        persist: true,
      });

      expect(request.graphSource).toEqual(graphSource);
      expect(request.selection).toEqual(selection);
    });

    it('rejects the retired SQL-first preview profile before compilation', () => {
      expect(PreviewProfileSchema.safeParse('transformation-sql-first-v2').success).toBe(false);
      expect(() =>
        parsePlanPreviewRequest({
          previewProfile: 'transformation-sql-first-v2',
          context,
          selection,
          graphSource,
          persist: true,
        })
      ).toThrow(ContractValidationError);
    });

    it('accepts the generic persisted-preview response', () => {
      const response = parsePlanPreviewPersistResponse({
        previewProfile: 'planner-generic-v1',
        plan,
        planRef,
        persisted: {
          planRecordId: plan.metadata.planId,
          canonicalPlanSha256: 'e'.repeat(64),
        },
        validation: { valid: true, warnings: [] },
      });

      expect(response.plan).toEqual(plan);
      expect(response.planRef).toEqual(planRef);
    });

    it('keeps selection rejection free of fabricated plan identity', () => {
      const outcome = parsePlanPreviewRejectedOutcome({
        contractVersion: '1.0.0',
        kind: 'selection-rejected',
        rejection: {
          code: 'REJECTED',
          cause: 'dependency_gap',
          reason: 'Selected closure is missing a dependency.',
        },
      });

      expect(outcome.kind).toBe('selection-rejected');
      expect(outcome).not.toHaveProperty('planRef');
    });

    it('keeps invalid-plan outcomes bound to their persisted plan identity', () => {
      const outcome = parsePlanPreviewRejectedOutcome({
        contractVersion: '1.0.0',
        kind: 'plan-invalid',
        previewProfile: 'planner-generic-v1',
        plan,
        planRef,
        persisted: {
          planRecordId: plan.metadata.planId,
          canonicalPlanSha256: 'e'.repeat(64),
        },
        validation: {
          status: 'ERROR',
          code: 'MISSING_CAPABILITY',
          planId: plan.metadata.planId,
          adapterId: 'temporal',
          degradable: false,
          reason: 'The adapter is missing executor.dbt.',
          cause: 'executor.dbt',
        },
      });

      expect(outcome.kind).toBe('plan-invalid');
      if (outcome.kind === 'plan-invalid') {
        expect(outcome.planRef).toEqual(planRef);
        expect(outcome.validation.code).toBe('MISSING_CAPABILITY');
      }
    });
  });
}
