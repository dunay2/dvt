import { createHash } from 'node:crypto';

import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/contracts';
import { expect, test } from 'vitest';

import type { PostgresPlanStore } from '../src/PostgresPlanStore.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

import {
  NOW,
  createPgClient,
  describeIfPg,
  dropSchema,
  makeBuildResult,
  toCanonicalPlanId,
  createStore,
} from './PostgresPlanStore.integration.helpers.js';

const PLAN_ID = {
  r4_9: toCanonicalPlanId('plan-r4-9'),
  r4_10: toCanonicalPlanId('plan-r4-10'),
  r4_11: toCanonicalPlanId('plan-r4-11'),
} as const;

describeIfPg('PostgresPlanStore records core integration', () => {
  let schemaCounter = 0;

  async function withIsolatedStore(
    fn: (store: PostgresPlanStore, schema: string) => Promise<void>
  ): Promise<void> {
    const schema = `dvt_plan_records_core_it_${Date.now()}_${schemaCounter++}`;
    const store = createStore(schema);
    try {
      await store.migrate();
      await fn(store, schema);
    } finally {
      await store.close();
      await dropSchema(schema);
    }
  }

  test('persists and reads three-part model', () =>
    withIsolatedStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_9));
      await store.recordExecutability({
        planId: PLAN_ID.r4_9,
        adapterId: 'temporal',
        state: 'VALID',
        validatedAtIso: NOW,
      });
      await store.markAdmitted({
        planId: PLAN_ID.r4_9,
        runId: 'run-r4-9',
        adapterId: 'temporal',
        admittedAtIso: NOW,
      });

      expect(await store.getPlanRecordByRef(planRef)).toMatchObject({ planId: PLAN_ID.r4_9 });
      expect(await store.listExecutabilityByAdapter(PLAN_ID.r4_9)).toEqual(
        expect.arrayContaining([expect.objectContaining({ state: 'VALID' })])
      );
      expect((await store.getAdmissionLinks(PLAN_ID.r4_9))[0]).toMatchObject({ runId: 'run-r4-9' });
    }));

  test('markSuperseded links old->new coherently', () =>
    withIsolatedStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11);

      expect((await store.getPlanRecord(PLAN_ID.r4_10))?.state).toBe('SUPERSEDED');
      expect((await store.getPlanRecord(PLAN_ID.r4_11))?.supersedesPlanId).toBe(PLAN_ID.r4_10);
      expect(await store.getSupersession(PLAN_ID.r4_10)).toEqual({
        supersededByPlanId: PLAN_ID.r4_11,
      });
    }));

  test('archivePlan marks record as ARCHIVED', () =>
    withIsolatedStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await store.archivePlan(PLAN_ID.r4_11, NOW);
      expect(await store.getPlanRecord(PLAN_ID.r4_11)).toMatchObject({
        state: 'ARCHIVED',
        archivedAtIso: expect.any(String),
      });
    }));

  test('getPlanRecordByRef rejects mismatched metadata', () =>
    withIsolatedStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await expect(
        store.getPlanRecordByRef({ ...planRef, uri: `dvt-plan://postgres/${PLAN_ID.r4_10}` })
      ).rejects.toThrow('PLAN_REF_MISMATCH');
      await expect(store.getPlanRecordByRef({ ...planRef, planVersion: '9.9' })).rejects.toThrow(
        'PLAN_REF_MISMATCH'
      );
    }));

  test('createPlanRecord rejects duplicate and missing lineage refs', () =>
    withIsolatedStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_9));
      const record = await store.getPlanRecordByRef(planRef);
      if (!record) throw new Error('expected persisted plan record');
      await expect(store.createPlanRecord(record)).rejects.toThrow('PLAN_RECORD_ALREADY_EXISTS');
      const missingLineagePlanId = toCanonicalPlanId('new-plan-with-missing-ref');
      const missingLineageSourceRef = `dvt-plan://postgres/${missingLineagePlanId}`;
      const missingLineageCanonicalPlanJson = jcsCanonicalize({
        metadata: {
          planId: missingLineagePlanId,
          planVersion: record.planVersion,
          schemaVersion: record.schemaVersion,
          contractVersion: record.contractVersion,
          inputHashSha256: '1'.repeat(64),
          createdAtIso: record.createdAtIso,
        },
        steps: [{ stepId: `${missingLineagePlanId}.step`, kind: 'DBT_MODEL', dependsOn: [] }],
      });
      await expect(
        store.createPlanRecord({
          ...record,
          planId: missingLineagePlanId,
          canonicalHash: sha256HexUtf8(missingLineageCanonicalPlanJson),
          canonicalPlanJson: missingLineageCanonicalPlanJson,
          canonicalHash: sha256HexUtf8(missingLineageCanonicalPlanJson),
          sourceRef: missingLineageSourceRef,
          derivedFromPlanId: toCanonicalPlanId('missing-lineage-ref'),
        })
      ).rejects.toThrow('PLAN_RECORD_REFERENCE_NOT_FOUND: derived_from_plan_id');
    }));

  test('migrate backfill normalizes canonical_hash from canonical_plan_json', () =>
    withIsolatedStore(async (store, schema) => {
      const client = await createPgClient();
      const legacyPlanId = toCanonicalPlanId('legacy-backfill-plan');
      const canonicalPlanJson = jcsCanonicalize({
        metadata: {
          planId: legacyPlanId,
          planVersion: '1.0',
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
          inputHashSha256: '3'.repeat(64),
          createdAtIso: NOW,
        },
        steps: [{ stepId: `${legacyPlanId}.step`, kind: 'DBT_MODEL', dependsOn: [] }],
      });
      const canonicalHash = sha256HexUtf8(canonicalPlanJson);
      const executablePlanJson = JSON.stringify({ metadata: { planId: legacyPlanId }, steps: [] });
      const wrongHash = createHash('sha256').update(executablePlanJson).digest('hex');
      try {
        await client.query(
          `
            INSERT INTO ${quoteIdentifier(schema)}.stored_plans (
              plan_id, plan_version, plan_uri, plan_sha256, schema_version, size_bytes,
              requires_capabilities, canonical_plan_json, executable_plan_json, validation_state,
              rejection_report_json, stored_at, updated_at
            ) VALUES (
              $1, '1.0', $2, $3, 'v1.2', $4, NULL, $5, $6, 'PENDING_VALIDATION', NULL, NOW(), NOW()
            ) ON CONFLICT (plan_id) DO NOTHING
          `,
          [
            legacyPlanId,
            `dvt-plan://postgres/${legacyPlanId}`,
            wrongHash,
            Buffer.byteLength(executablePlanJson, 'utf8'),
            canonicalPlanJson,
            executablePlanJson,
          ]
        );
      } finally {
        await client.end();
      }
      await store.migrate();
      const record = await store.getPlanRecord(legacyPlanId);
      expect(record?.canonicalHash).toBe(canonicalHash);
      expect(record?.canonicalHash).not.toBe(wrongHash);
    }));
});
