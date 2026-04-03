import { afterAll, expect, test } from 'vitest';

import { quoteIdentifier } from '../src/sqlUtils.js';

import {
  NOW,
  createPgClient,
  describeIfPg,
  dropSchema,
  makeBuildResult,
  toCanonicalPlanId,
  withStore,
} from './PostgresPlanStore.integration.helpers.js';

const PLAN_ID = {
  r4_10: toCanonicalPlanId('plan-r4-10'),
  r4_11: toCanonicalPlanId('plan-r4-11'),
  r4_missing: toCanonicalPlanId('plan-r4-missing'),
} as const;

describeIfPg('PostgresPlanStore records guard integration', () => {
  const schema = `dvt_plan_records_guards_it_${Date.now()}`;

  afterAll(async () => {
    await dropSchema(schema);
  });

  test('markSuperseded rejects missing superseder target', () =>
    withStore(schema, async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_missing)).rejects.toThrow(
        'PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND'
      );
    }));

  test('markSuperseded rejects self supersession', () =>
    withStore(schema, async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_10)).rejects.toThrow(
        'PLAN_RECORD_INVALID_SUPERSESSION_SELF'
      );
    }));

  test('markSuperseded rejects non-active superseder target', () =>
    withStore(schema, async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await store.archivePlan(PLAN_ID.r4_11, NOW);
      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11)).rejects.toThrow(
        'PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND'
      );
    }));

  test('markSuperseded rejects source that is no longer ACTIVE', () =>
    withStore(schema, async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11);
      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11)).rejects.toThrow(
        'PLAN_RECORD_NOT_ACTIVE'
      );
    }));

  test('markSuperseded rejects superseder already linked to another plan', () =>
    withStore(schema, async (store) => {
      const oldA = toCanonicalPlanId('old-a');
      const oldB = toCanonicalPlanId('old-b');
      const superseder = toCanonicalPlanId('superseder');
      await store.storePlan(makeBuildResult(oldA));
      await store.storePlan(makeBuildResult(oldB));
      await store.storePlan(makeBuildResult(superseder));
      await store.markSuperseded(oldA, superseder);
      await expect(store.markSuperseded(oldB, superseder)).rejects.toThrow(
        'PLAN_RECORD_SUPERSEDER_ALREADY_LINKED'
      );
    }));

  test('archivePlan rejects unknown plan id', () =>
    withStore(schema, async (store) => {
      await expect(store.archivePlan(PLAN_ID.r4_missing, NOW)).rejects.toThrow(
        'PLAN_RECORD_NOT_FOUND'
      );
    }));

  test('listExecutabilityByAdapter fails fast when persisted VALID row is corrupted', () =>
    withStore(schema, async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await store.recordExecutability({
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
            WHERE plan_id = $1 AND adapter_id = 'temporal'
          `,
          [PLAN_ID.r4_11]
        );
      } finally {
        await client.end();
      }
      await expect(store.listExecutabilityByAdapter(PLAN_ID.r4_11)).rejects.toThrow(
        'PLAN_EXECUTABILITY_ROW_INVALID'
      );
    }));

  test('schema enforces lineage FKs at DB level', () =>
    withStore(schema, async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      const client = await createPgClient();
      try {
        await expect(
          client.query(
            `
              INSERT INTO ${quoteIdentifier(schema)}.plan_records (
                plan_id, canonical_plan_json, canonical_hash, plan_version, schema_version,
                contract_version, source_ref, state, created_at, updated_at, derived_from_plan_id
              ) VALUES (
                $1, $2, $3, '1.0', 'v1.2', '1.0.0', $4, 'ACTIVE', NOW(), NOW(), $5
              )
            `,
            [
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
