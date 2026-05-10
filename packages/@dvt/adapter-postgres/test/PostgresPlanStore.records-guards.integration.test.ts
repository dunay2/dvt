import type { ArchivePlanInput, MarkPlanSupersededInput } from '@dvt/artifacts';
import type { ScopedPlanId } from '@dvt/contracts';
import { expect, test } from 'vitest';

import type { PostgresPlanStore } from '../src/PostgresPlanStore.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

import {
  NOW,
  PLAN_STORE_SCOPE,
  createPgClient,
  describeIfPg,
  dropSchema,
  makeBuildResult,
  toCanonicalPlanId,
  createStore,
} from './PostgresPlanStore.integration.helpers.js';

const PLAN_ID = {
  r4_10: toCanonicalPlanId('plan-r4-10'),
  r4_11: toCanonicalPlanId('plan-r4-11'),
  r4_12: toCanonicalPlanId('plan-r4-12'),
  r4_missing: toCanonicalPlanId('plan-r4-missing'),
} as const;

function scopedPlan(planId: string): ScopedPlanId {
  return { ...PLAN_STORE_SCOPE, planId };
}

function supersession(planId: string, supersededByPlanId: string): MarkPlanSupersededInput {
  return { ...PLAN_STORE_SCOPE, planId, supersededByPlanId };
}

function archive(planId: string): ArchivePlanInput {
  return { ...PLAN_STORE_SCOPE, planId, archivedAtIso: NOW };
}

function storePlanArtifact(
  store: PostgresPlanStore,
  planId: string
): ReturnType<PostgresPlanStore['storePlanArtifact']> {
  return store.storePlanArtifact({ buildResult: makeBuildResult(planId) });
}

describeIfPg('PostgresPlanStore records guard integration', () => {
  let schemaCounter = 0;

  async function withIsolatedStore(
    fn: (store: PostgresPlanStore, schema: string) => Promise<void>
  ): Promise<void> {
    const schema = `dvt_plan_records_guards_it_${Date.now()}_${schemaCounter++}`;
    const store = createStore(schema);
    try {
      await store.migrate();
      await fn(store, schema);
    } finally {
      await store.close();
      await dropSchema(schema);
    }
  }

  test('markSuperseded rejects missing superseder target', () =>
    withIsolatedStore(async (store) => {
      await storePlanArtifact(store, PLAN_ID.r4_10);
      await expect(
        store.markSuperseded(supersession(PLAN_ID.r4_10, PLAN_ID.r4_missing))
      ).rejects.toThrow('PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND');
    }));

  test('markSuperseded rejects self supersession', () =>
    withIsolatedStore(async (store) => {
      await storePlanArtifact(store, PLAN_ID.r4_10);
      await expect(
        store.markSuperseded(supersession(PLAN_ID.r4_10, PLAN_ID.r4_10))
      ).rejects.toThrow('PLAN_RECORD_INVALID_SUPERSESSION_SELF');
    }));

  test('markSuperseded rejects non-active superseder target', () =>
    withIsolatedStore(async (store) => {
      await storePlanArtifact(store, PLAN_ID.r4_10);
      await storePlanArtifact(store, PLAN_ID.r4_11);
      await store.archivePlan(archive(PLAN_ID.r4_11));
      await expect(
        store.markSuperseded(supersession(PLAN_ID.r4_10, PLAN_ID.r4_11))
      ).rejects.toThrow('PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND');
    }));

  test('markSuperseded re-run rejects already linked superseder', () =>
    withIsolatedStore(async (store) => {
      await storePlanArtifact(store, PLAN_ID.r4_10);
      await storePlanArtifact(store, PLAN_ID.r4_11);
      await store.markSuperseded(supersession(PLAN_ID.r4_10, PLAN_ID.r4_11));
      await expect(
        store.markSuperseded(supersession(PLAN_ID.r4_10, PLAN_ID.r4_11))
      ).rejects.toThrow('PLAN_RECORD_SUPERSEDER_ALREADY_LINKED');
    }));

  test('markSuperseded rejects superseder already linked to another plan', () =>
    withIsolatedStore(async (store) => {
      const oldA = toCanonicalPlanId('old-a');
      const oldB = toCanonicalPlanId('old-b');
      const superseder = toCanonicalPlanId('superseder');
      await storePlanArtifact(store, oldA);
      await storePlanArtifact(store, oldB);
      await storePlanArtifact(store, superseder);
      await store.markSuperseded(supersession(oldA, superseder));
      await expect(store.markSuperseded(supersession(oldB, superseder))).rejects.toThrow(
        'PLAN_RECORD_SUPERSEDER_ALREADY_LINKED'
      );
    }));

  test('archivePlan rejects unknown plan id', () =>
    withIsolatedStore(async (store) => {
      await expect(store.archivePlan(archive(PLAN_ID.r4_missing))).rejects.toThrow(
        'PLAN_RECORD_NOT_FOUND'
      );
    }));

  test('storePlan rejects duplicates for ARCHIVED records (no lifecycle reopening)', () =>
    withIsolatedStore(async (store) => {
      await storePlanArtifact(store, PLAN_ID.r4_10);
      await store.archivePlan(archive(PLAN_ID.r4_10));
      await expect(storePlanArtifact(store, PLAN_ID.r4_10)).rejects.toThrow('PLAN_RECORD_CONFLICT');
    }));

  test('storePlan rejects duplicates for SUPERSEDED records (no lifecycle reopening)', () =>
    withIsolatedStore(async (store) => {
      await storePlanArtifact(store, PLAN_ID.r4_11);
      await storePlanArtifact(store, PLAN_ID.r4_12);
      await store.markSuperseded(supersession(PLAN_ID.r4_11, PLAN_ID.r4_12));
      await expect(storePlanArtifact(store, PLAN_ID.r4_11)).rejects.toThrow('PLAN_RECORD_CONFLICT');
    }));

  test('listExecutabilityByAdapter fails fast when persisted VALID row is corrupted', () =>
    withIsolatedStore(async (store, schema) => {
      await storePlanArtifact(store, PLAN_ID.r4_11);
      await store.recordExecutability({
        ...PLAN_STORE_SCOPE,
        planId: PLAN_ID.r4_11,
        adapterId: 'temporal',
        state: 'VALID',
        validatedAtIso: NOW,
      });
      const client = await createPgClient();
      try {
        await client.query(
          `
            UPDATE ${quoteIdentifier(schema)}.plan_executability_records
            SET validated_at = NULL
            WHERE tenant_id = $1
              AND project_id = $2
              AND environment_id = $3
              AND plan_id = $4
              AND adapter_id = 'temporal'
          `,
          [
            PLAN_STORE_SCOPE.tenantId,
            PLAN_STORE_SCOPE.projectId,
            PLAN_STORE_SCOPE.environmentId,
            PLAN_ID.r4_11,
          ]
        );
      } finally {
        await client.end();
      }
      await expect(store.listExecutabilityByAdapter(scopedPlan(PLAN_ID.r4_11))).rejects.toThrow(
        'PLAN_EXECUTABILITY_ROW_INVALID'
      );
    }));

  test('schema enforces lineage FKs at DB level', () =>
    withIsolatedStore(async (store, schema) => {
      await storePlanArtifact(store, PLAN_ID.r4_10);
      const client = await createPgClient();
      try {
        await expect(
          client.query(
            `
              INSERT INTO ${quoteIdentifier(schema)}.plan_records (
                tenant_id, project_id, environment_id, plan_id, canonical_plan_json, canonical_hash,
                plan_version, schema_version, contract_version, source_ref, state, created_at,
                updated_at, derived_from_plan_id
              ) VALUES (
                $1, $2, $3, $4, $5, $6, '1.0', 'v1.2', '1.0.0', $7, 'ACTIVE',
                NOW(), NOW(), $8
              )
            `,
            [
              PLAN_STORE_SCOPE.tenantId,
              PLAN_STORE_SCOPE.projectId,
              PLAN_STORE_SCOPE.environmentId,
              toCanonicalPlanId('lineage-fk-invalid'),
              '{"metadata":{"planId":"lineage-fk-invalid"}}',
              'f'.repeat(64),
              `dvt-plan://postgres/${toCanonicalPlanId('lineage-fk-invalid')}`,
              toCanonicalPlanId('missing-lineage-parent'),
            ]
          )
        ).rejects.toThrow(/foreign key/i);
      } finally {
        await client.end();
      }
    }));
});
