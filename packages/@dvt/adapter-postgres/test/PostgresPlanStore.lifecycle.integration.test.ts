import { afterAll, expect, test } from 'vitest';

import {
  describeIfPg,
  dropSchema,
  makeBuildResult,
  makeRejection,
  toCanonicalPlanId,
  withStore,
} from './PostgresPlanStore.integration.helpers.js';

const PLAN_ID = {
  r4_1: toCanonicalPlanId('plan-r4-1'),
  r4_2: toCanonicalPlanId('plan-r4-2'),
  r4_3: toCanonicalPlanId('plan-r4-3'),
  r4_4: toCanonicalPlanId('plan-r4-4'),
  r4_5: toCanonicalPlanId('plan-r4-5'),
  r4_6: toCanonicalPlanId('plan-r4-6'),
  r4_7: toCanonicalPlanId('plan-r4-7'),
  r4_8: toCanonicalPlanId('plan-r4-8'),
} as const;

describeIfPg('PostgresPlanStore lifecycle integration (real PostgreSQL)', () => {
  const schema = `dvt_plan_lifecycle_it_${Date.now()}`;

  afterAll(async () => {
    await dropSchema(schema);
  });

  test('storePlan persists a PENDING_VALIDATION record and returns a stable PlanRef', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_1));
      const record = await store.getValidationRecord(PLAN_ID.r4_1);
      expect(planRef).toMatchObject({ planId: PLAN_ID.r4_1, planVersion: '1.0' });
      expect(record).toMatchObject({ planId: PLAN_ID.r4_1, state: 'PENDING_VALIDATION' });
    }));

  test('markValid transitions the plan and enables fetch by PlanRef', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_2));
      await expect(store.fetch(planRef)).rejects.toThrow('PLAN_NOT_VALID');
      await store.markValid(planRef);
      expect((await store.getValidationRecord(PLAN_ID.r4_2))?.state).toBe('VALID');
      expect(JSON.parse(Buffer.from(await store.fetch(planRef)).toString('utf8'))).toMatchObject({
        metadata: { planId: PLAN_ID.r4_2 },
      });
    }));

  test('markInvalid stores rejection report and keeps plan non-runnable', () =>
    withStore(schema, async (store) => {
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
      await expect(store.fetch(planRef)).rejects.toThrow('PLAN_NOT_VALID');
      expect(await store.getValidationRecord(PLAN_ID.r4_3)).toMatchObject({
        state: 'INVALID',
        rejectionReport: rejection,
      });
    }));

  test('treats identical pending plan store attempt as idempotent', () =>
    withStore(schema, async (store) => {
      const first = await store.storePlan(makeBuildResult(PLAN_ID.r4_5));
      const second = await store.storePlan(makeBuildResult(PLAN_ID.r4_5));
      expect(second).toEqual(first);
    }));

  test('rejects conflicting plan collisions for same planId', () =>
    withStore(schema, async (store) => {
      await store.storePlan(makeBuildResult(PLAN_ID.r4_6));
      await expect(
        store.storePlan({
          ...makeBuildResult(PLAN_ID.r4_6),
          plan: {
            ...makeBuildResult(PLAN_ID.r4_6).plan,
            metadata: { ...makeBuildResult(PLAN_ID.r4_6).plan.metadata, planVersion: '9.9' },
          },
          canonicalPlanJson: JSON.stringify({
            ...JSON.parse(makeBuildResult(PLAN_ID.r4_6).canonicalPlanJson),
            metadata: {
              ...JSON.parse(makeBuildResult(PLAN_ID.r4_6).canonicalPlanJson).metadata,
              planVersion: '9.9',
            },
          }),
        })
      ).rejects.toThrow('PLAN_STORE_CONFLICT');
    }));

  test('rejects reuse of already validated plan', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_7));
      await store.markValid(planRef);
      await expect(store.storePlan(makeBuildResult(PLAN_ID.r4_7))).rejects.toThrow(
        'PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED'
      );
    }));

  test('allows duplicate pending admission but only one transition succeeds', () =>
    withStore(schema, async (store) => {
      const first = await store.storePlan(makeBuildResult(PLAN_ID.r4_8));
      const second = await store.storePlan(makeBuildResult(PLAN_ID.r4_8));
      expect(second).toEqual(first);
      await store.markValid(first);
      await expect(store.markValid(second)).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );
    }));

  test('rejects invalid lifecycle transitions', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlan(makeBuildResult(PLAN_ID.r4_4));
      await store.markValid(planRef);
      await expect(store.markInvalid(planRef, makeRejection(PLAN_ID.r4_4))).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );
      await expect(store.markValid(planRef)).rejects.toThrow(
        'PLAN_VALIDATION_STATE_INVALID_TRANSITION'
      );
    }));
});
