import type { PlannerBuildResultV2 } from '@dvt/contracts';
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';

import { PostgresPlanStore } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

const NOW = '2026-03-21T00:00:00.000Z';

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
      const planRef = await store.storePlan(makeBuildResult('plan-r4-1'));
      const record = await store.getValidationRecord('plan-r4-1');

      expect(planRef).toMatchObject({
        uri: 'dvt-plan://postgres/plan-r4-1',
        schemaVersion: 'v1.2',
        planId: 'plan-r4-1',
        planVersion: '2.3',
      });
      expect(record).toMatchObject({
        planId: 'plan-r4-1',
        state: 'PENDING_VALIDATION',
      });
      expect(record?.storedAtIso).toBeTruthy();
      expect(record?.updatedAtIso).toBeTruthy();
    }));

  test('markValid transitions the plan and enables fetch by PlanRef', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult('plan-r4-2'));
      const pendingBytes = await store.fetchForValidation(planRef);

      await expect(store.fetch(planRef)).rejects.toThrow('PLAN_NOT_VALID');
      expect(JSON.parse(Buffer.from(pendingBytes).toString('utf8'))).toMatchObject({
        metadata: {
          planId: 'plan-r4-2',
          planVersion: '2.3',
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
        },
      });

      await store.markValid(planRef);

      const record = await store.getValidationRecord('plan-r4-2');
      const bytes = await store.fetch(planRef);

      expect(record?.state).toBe('VALID');
      expect(JSON.parse(Buffer.from(bytes).toString('utf8'))).toMatchObject({
        metadata: {
          planId: 'plan-r4-2',
          planVersion: '2.3',
          schemaVersion: 'v1.2',
          contractVersion: '1.0.0',
        },
      });
    }));

  test('markInvalid stores the structured rejection report and keeps the plan non-runnable', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult('plan-r4-3'));
      const rejection = {
        status: 'ERROR' as const,
        planId: 'plan-r4-3',
        adapterId: 'temporal',
        code: 'REJECTED' as const,
        degradable: false,
        reason: 'adapter does not support this plan',
        cause: 'targetAdapter',
      };

      await store.markInvalid(planRef, rejection);

      const record = await store.getValidationRecord('plan-r4-3');
      await expect(store.fetch(planRef)).rejects.toThrow('PLAN_NOT_VALID');
      await expect(store.fetchForValidation(planRef)).rejects.toThrow('PLAN_NOT_VALID');

      expect(record).toMatchObject({
        planId: 'plan-r4-3',
        state: 'INVALID',
        rejectionReport: rejection,
      });
    }));

  test('treats an identical pending plan store attempt as idempotent and returns the persisted ref', () =>
    withStore(async (store) => {
      const first = await store.storePlan(makeBuildResult('plan-r4-5'));
      const second = await store.storePlan(makeBuildResult('plan-r4-5'));

      expect(second).toEqual(first);
      expect(await store.getValidationRecord('plan-r4-5')).toMatchObject({
        planId: 'plan-r4-5',
        state: 'PENDING_VALIDATION',
      });
    }));

  test('rejects conflicting plan collisions for the same planId', () =>
    withStore(async (store) => {
      await store.storePlan(makeBuildResult('plan-r4-6'));

      await expect(
        store.storePlan({
          plan: {
            metadata: {
              planId: 'plan-r4-6',
              planVersion: '9.9',
              inputHashSha256: '2'.repeat(64),
              createdAtIso: NOW,
            },
            steps: [
              {
                stepId: 'plan-r4-6.step.changed',
                kind: 'DBT_MODEL',
                dependsOn: [],
              },
            ],
          },
          canonicalPlanJson: JSON.stringify({
            metadata: {
              planId: 'plan-r4-6',
              planVersion: '9.9',
              inputHashSha256: '2'.repeat(64),
              createdAtIso: NOW,
            },
            steps: [
              {
                stepId: 'plan-r4-6.step.changed',
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
      const planRef = await store.storePlan(makeBuildResult('plan-r4-7'));
      await store.markValid(planRef);

      await expect(store.storePlan(makeBuildResult('plan-r4-7'))).rejects.toThrow(
        'PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED'
      );
    }));

  test('rejects invalid lifecycle transitions', () =>
    withStore(async (store) => {
      const planRef = await store.storePlan(makeBuildResult('plan-r4-4'));
      await store.markValid(planRef);

      await expect(store.markInvalid(planRef, makeRejection('plan-r4-4'))).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );
      await expect(store.markValid(planRef)).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );
    }));
});

function makeBuildResult(planId: string): PlannerBuildResultV2 {
  return {
    plan: {
      metadata: {
        planId,
        planVersion: '2.3',
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
        planVersion: '2.3',
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
