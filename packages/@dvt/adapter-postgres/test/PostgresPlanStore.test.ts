import { createHash } from 'node:crypto';

import type { PlannerBuildResultV2 } from '@dvt/contracts';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';

import { PostgresPlanStore } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

const NOW = '2026-03-21T00:00:00.000Z';
const PLAN_ID = {
  r4_1: toCanonicalPlanId('plan-r4-1'),
  r4_2: toCanonicalPlanId('plan-r4-2'),
  r4_3: toCanonicalPlanId('plan-r4-3'),
  r4_4: toCanonicalPlanId('plan-r4-4'),
  r4_5: toCanonicalPlanId('plan-r4-5'),
  r4_6: toCanonicalPlanId('plan-r4-6'),
  r4_7: toCanonicalPlanId('plan-r4-7'),
  r4_8: toCanonicalPlanId('plan-r4-8'),
  r4_9: toCanonicalPlanId('plan-r4-9'),
  r4_10: toCanonicalPlanId('plan-r4-10'),
  r4_11: toCanonicalPlanId('plan-r4-11'),
  r4_missing: toCanonicalPlanId('plan-r4-missing'),
} as const;

describeIfPg('PostgresPlanStore integration (real PostgreSQL)', () => {
  const schema = `dvt_plan_it_${Date.now()}`;

  afterAll(async () => {
    const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (!connectionString) return;
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    } finally {
      await client.end();
    }
  });

  async function withStore(fn: (store: PostgresPlanStore) => Promise<void>): Promise<void> {
    const store = new PostgresPlanStore({
      schema,
      toExecutablePlan: (buildResult) => ({
        schemaVersion: 'v1.2',
        text: JSON.stringify({
          metadata: {
            planId: buildResult.plan.metadata.planId,
            planVersion: buildResult.plan.metadata.planVersion,
            schemaVersion: 'v1.2',
            contractVersion: '1.0.0',
            inputHashSha256: buildResult.plan.metadata.inputHashSha256,
          },
          steps: buildResult.plan.steps,
        }),
      }),
    });

    try {
      await store.migrate();
      await fn(store);
    } finally {
      await store.close();
    }
  }

  test('storePlan persists a PENDING_VALIDATION record and returns a stable PlanRef', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_1));
      const record = await store.getValidationRecord(PLAN_ID.r4_1);

      expect(planRef).toMatchObject({
        uri: `dvt-plan://postgres/${PLAN_ID.r4_1}`,
        schemaVersion: 'v1.2',
        planId: PLAN_ID.r4_1,
        planVersion: '1.0',
      });
      expect(record).toMatchObject({
        planId: PLAN_ID.r4_1,
        state: 'PENDING_VALIDATION',
      });
      expect(record?.storedAtIso).toBeTruthy();
      expect(record?.updatedAtIso).toBeTruthy();
    }));

  test('markValid transitions the plan and enables fetch by PlanRef', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_2));
      const pendingBytes = await store.fetchForValidation(planRef);

      await expect(store.fetch(planRef)).rejects.toThrow('PLAN_NOT_VALID');
      expect(JSON.parse(Buffer.from(pendingBytes).toString('utf8'))).toMatchObject({
        metadata: {
          planId: PLAN_ID.r4_2,
          planVersion: '1.0',
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
        },
      });

      await store.markValid(planRef);

      const record = await store.getValidationRecord(PLAN_ID.r4_2);
      const bytes = await store.fetch(planRef);

      expect(record?.state).toBe('VALID');
      expect(JSON.parse(Buffer.from(bytes).toString('utf8'))).toMatchObject({
        metadata: {
          planId: PLAN_ID.r4_2,
          planVersion: '1.0',
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
        },
      });
    }));

  test('markInvalid stores the structured rejection report and keeps the plan non-runnable', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_3));
      const rejection = {
        status: 'ERROR' as const,
        planId: PLAN_ID.r4_3,
        adapterId: 'temporal',
        code: 'REJECTED' as const,
        degradable: false,
        reason: 'adapter does not support this plan',
        cause: 'targetAdapter',
      };

      await store.markInvalid(planRef, rejection);

      const record = await store.getValidationRecord(PLAN_ID.r4_3);
      await expect(store.fetch(planRef)).rejects.toThrow('PLAN_NOT_VALID');
      await expect(store.fetchForValidation(planRef)).rejects.toThrow('PLAN_NOT_VALID');

      expect(record).toMatchObject({
        planId: PLAN_ID.r4_3,
        state: 'INVALID',
        rejectionReport: rejection,
      });
    }));

  test('treats an identical pending plan store attempt as idempotent and returns the persisted ref', () =>
    withStore(async (store) => {
      const first = await store.storePlan(makeBuildResult(PLAN_ID.r4_5));
      const second = await store.storePlan(makeBuildResult(PLAN_ID.r4_5));

      expect(second).toEqual(first);
      expect(await store.getValidationRecord(PLAN_ID.r4_5)).toMatchObject({
        planId: PLAN_ID.r4_5,
        state: 'PENDING_VALIDATION',
      });
    }));

  test('rejects conflicting plan collisions for the same planId', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_6));

      await expect(
        store.storePlan({
          plan: {
            metadata: {
              planId: PLAN_ID.r4_6,
              planVersion: '9.9',
              schemaVersion: 'v1.2',
              contractVersion: '1.0.0',
              inputHashSha256: '2'.repeat(64),
              createdAtIso: NOW,
            },
            steps: [
              {
                stepId: `${PLAN_ID.r4_6}.step.changed`,
                kind: 'DBT_MODEL',
                dependsOn: [],
              },
            ],
          },
          canonicalPlanJson: JSON.stringify({
            metadata: {
              planId: PLAN_ID.r4_6,
              planVersion: '9.9',
              schemaVersion: 'v1.2',
              contractVersion: '1.0.0',
              inputHashSha256: '2'.repeat(64),
              createdAtIso: NOW,
            },
            steps: [
              {
                stepId: `${PLAN_ID.r4_6}.step.changed`,
                kind: 'DBT_MODEL',
                dependsOn: [],
              },
            ],
          }),
        })
      ).rejects.toThrow('PLAN_STORE_CONFLICT');
    }));

  test('rejects reuse of an already validated plan because storePlan must return a non-runnable ref', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_7));
      await store.markValid(planRef);

      await expect(store.storePlan(makeBuildResult(PLAN_ID.r4_7))).rejects.toThrow(
        'PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED'
      );
    }));

  test('allows duplicate pending admission but only one caller can claim the validation transition', () =>
    withStore(async (store) => {
      const first = await store.storePlan(makeBuildResult(PLAN_ID.r4_8));
      const second = await store.storePlan(makeBuildResult(PLAN_ID.r4_8));

      expect(second).toEqual(first);

      await store.markValid(first);

      await expect(store.markValid(second)).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );

      expect(await store.getValidationRecord(PLAN_ID.r4_8)).toMatchObject({
        planId: PLAN_ID.r4_8,
        state: 'VALID',
      });
    }));

  test('rejects invalid lifecycle transitions', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_4));
      await store.markValid(planRef);

      await expect(store.markInvalid(planRef, makeRejection(PLAN_ID.r4_4))).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );
      await expect(store.markValid(planRef)).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );
    }));

  test('persists and reads the S08 three-part model while keeping lifecycle facade compatibility', () =>
    withStore(async (store) => {
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

      const record = await store.getPlanRecordByRef(planRef);
      const executability = await store.listExecutabilityByAdapter(PLAN_ID.r4_9);
      const links = await store.getAdmissionLinks(PLAN_ID.r4_9);

      expect(record).toMatchObject({
        planId: PLAN_ID.r4_9,
        state: 'ACTIVE',
      });
      expect(executability).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            planId: PLAN_ID.r4_9,
            adapterId: 'temporal',
            state: 'VALID',
          }),
        ])
      );
      expect(links).toEqual([
        {
          planId: PLAN_ID.r4_9,
          runId: 'run-r4-9',
          adapterId: 'temporal',
          admittedAtIso: expect.any(String),
        },
      ]);
    }));

  test('markSuperseded links old->new coherently and getSupersession resolves the new plan id', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));

      await store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11);

      const oldRecord = await store.getPlanRecord(PLAN_ID.r4_10);
      const newRecord = await store.getPlanRecord(PLAN_ID.r4_11);
      const supersession = await store.getSupersession(PLAN_ID.r4_10);

      expect(oldRecord?.state).toBe('SUPERSEDED');
      expect(newRecord?.supersedesPlanId).toBe(PLAN_ID.r4_10);
      expect(supersession).toEqual({ supersededByPlanId: PLAN_ID.r4_11 });
    }));

  test('markSuperseded rejects missing superseder target', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));

      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_missing)).rejects.toThrow(
        'PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND'
      );
    }));

  test('markSuperseded rejects self supersession', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));

      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_10)).rejects.toThrow(
        'PLAN_RECORD_INVALID_SUPERSESSION_SELF'
      );
    }));

  test('archivePlan marks record as ARCHIVED with archivedAtIso', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));

      await store.archivePlan(PLAN_ID.r4_11, NOW);

      const record = await store.getPlanRecord(PLAN_ID.r4_11);
      expect(record).toMatchObject({
        planId: PLAN_ID.r4_11,
        state: 'ARCHIVED',
        archivedAtIso: expect.any(String),
      });
    }));

  test('markSuperseded rejects non-active superseder target', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await store.archivePlan(PLAN_ID.r4_11, NOW);

      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11)).rejects.toThrow(
        'PLAN_RECORD_SUPERSEDER_NOT_ACTIVE_OR_NOT_FOUND'
      );
    }));

  test('markSuperseded rejects source that is no longer ACTIVE', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_10));
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));

      await store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11);
      await expect(store.markSuperseded(PLAN_ID.r4_10, PLAN_ID.r4_11)).rejects.toThrow(
        'PLAN_RECORD_NOT_ACTIVE'
      );
    }));

  test('archivePlan rejects unknown plan id', () =>
    withStore(async (store) => {
      await expect(store.archivePlan(PLAN_ID.r4_missing, NOW)).rejects.toThrow(
        'PLAN_RECORD_NOT_FOUND'
      );
    }));

  test('getPlanRecordByRef rejects mismatched uri and schemaVersion', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await expect(
        store.getPlanRecordByRef({
          ...planRef,
          uri: `dvt-plan://postgres/${PLAN_ID.r4_10}`,
          schemaVersion: 'v1.3',
        })
      ).rejects.toThrow('PLAN_REF_MISMATCH');
    }));

  test('listExecutabilityByAdapter fails fast when persisted VALID row is corrupted', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_11));
      await store.recordExecutability({
        planId: PLAN_ID.r4_11,
        adapterId: 'temporal',
        state: 'VALID',
        validatedAtIso: NOW,
      });

      const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('missing postgres connection string for integration test');
      }
      const client = new Client({ connectionString });
      await client.connect();
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

  test('getPlanRecordByRef rejects mismatched PlanRef metadata', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_11));

      await expect(store.getPlanRecordByRef({ ...planRef, planVersion: '9.9' })).rejects.toThrow(
        'PLAN_REF_MISMATCH'
      );
    }));

  test('createPlanRecord rejects duplicate plan id instead of silently mutating', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_9));
      const record = await store.getPlanRecordByRef(planRef);
      if (!record) {
        throw new Error('expected persisted plan record');
      }

      await expect(store.createPlanRecord(record)).rejects.toThrow('PLAN_RECORD_ALREADY_EXISTS');
    }));
});

function makeBuildResult(planId: string): PlannerBuildResultV2 {
  return {
    plan: {
      metadata: {
        planId,
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: '1'.repeat(64),
        createdAtIso: NOW,
      },
      steps: [
        {
          stepId: `${planId}.step`,
          kind: 'DBT_MODEL',
          dependsOn: [],
        },
      ],
    },
    canonicalPlanJson: JSON.stringify({
      metadata: {
        planId,
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: '1'.repeat(64),
        createdAtIso: NOW,
      },
      steps: [
        {
          stepId: `${planId}.step`,
          kind: 'DBT_MODEL',
          dependsOn: [],
        },
      ],
    }),
  };
}

function toCanonicalPlanId(seed: string): string {
  return createHash('sha256').update(seed).digest('hex');
}

function makeRejection(planId: string): {
  status: 'ERROR';
  planId: string;
  adapterId: 'mock';
  code: 'REJECTED';
  degradable: false;
  reason: string;
} {
  return {
    status: 'ERROR' as const,
    planId,
    adapterId: 'mock',
    code: 'REJECTED' as const,
    degradable: false,
    reason: 'invalid transition test',
  };
}
