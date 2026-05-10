import { jcsCanonicalize } from '@dvt/contracts';
import { afterAll, expect, test } from 'vitest';

import {
  describeIfPg,
  dropSchema,
  makeBuildResult,
  makeRejection,
  PLAN_STORE_SCOPE,
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
      const planRef = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_1),
      });
      const record = await store.getStoredPlanValidationRecord({
        ...PLAN_STORE_SCOPE,
        planId: PLAN_ID.r4_1,
      });
      expect(planRef).toMatchObject({ planId: PLAN_ID.r4_1, planVersion: '1.0' });
      expect(record).toMatchObject({ planId: PLAN_ID.r4_1, state: 'PENDING_VALIDATION' });
    }));

  test('markValid transitions the plan and enables fetch by PlanRef', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_2),
      });
      await expect(store.fetchStoredPlanArtifact({ ...PLAN_STORE_SCOPE, planRef })).rejects.toThrow(
        'PLAN_NOT_VALID'
      );
      await store.markStoredPlanArtifactValid({ ...PLAN_STORE_SCOPE, planRef });
      expect(
        (
          await store.getStoredPlanValidationRecord({
            ...PLAN_STORE_SCOPE,
            planId: PLAN_ID.r4_2,
          })
        )?.state
      ).toBe('VALID');
      const artifact = await store.fetchStoredPlanArtifact({ ...PLAN_STORE_SCOPE, planRef });
      expect(JSON.parse(Buffer.from(artifact.bytes).toString('utf8'))).toMatchObject({
        metadata: { planId: PLAN_ID.r4_2 },
      });
    }));

  test('markInvalid stores rejection report and keeps plan non-runnable', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_3),
      });
      const rejection = {
        status: 'ERROR' as const,
        planId: PLAN_ID.r4_3,
        adapterId: 'temporal',
        code: 'REJECTED' as const,
        degradable: false,
        reason: 'adapter does not support this plan',
        cause: 'targetAdapter',
      };
      await store.markStoredPlanArtifactInvalid({
        ...PLAN_STORE_SCOPE,
        planRef,
        report: rejection,
      });
      await expect(store.fetchStoredPlanArtifact({ ...PLAN_STORE_SCOPE, planRef })).rejects.toThrow(
        'PLAN_NOT_VALID'
      );
      expect(
        await store.getStoredPlanValidationRecord({
          ...PLAN_STORE_SCOPE,
          planId: PLAN_ID.r4_3,
        })
      ).toMatchObject({
        state: 'INVALID',
        rejectionReport: rejection,
      });
    }));

  test('treats identical pending plan store attempt as idempotent', () =>
    withStore(schema, async (store) => {
      const first = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_5),
      });
      const second = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_5),
      });
      expect(second).toEqual(first);
    }));

  test('rejects conflicting plan collisions for same planId', () =>
    withStore(schema, async (store) => {
      const base = makeBuildResult(PLAN_ID.r4_6);
      await store.storePlanArtifact({ buildResult: base });

      const conflictingSteps = [
        { stepId: `${PLAN_ID.r4_6}.step.changed`, kind: 'DBT_MODEL' as const, dependsOn: [] },
      ];
      const conflicting = {
        ...base,
        plan: {
          ...base.plan,
          steps: conflictingSteps,
        },
        canonicalPlanCoreJson: jcsCanonicalize({
          metadata: {
            planVersion: base.plan.metadata.planVersion,
            inputHashSha256: base.plan.metadata.inputHashSha256,
          },
          steps: conflictingSteps,
        }),
      };

      await expect(store.storePlanArtifact({ buildResult: conflicting })).rejects.toThrow(
        'PLAN_STORE_CONFLICT'
      );
    }));

  test('rejects reuse of already validated plan', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_7),
      });
      await store.markStoredPlanArtifactValid({ ...PLAN_STORE_SCOPE, planRef });
      await expect(
        store.storePlanArtifact({ buildResult: makeBuildResult(PLAN_ID.r4_7) })
      ).rejects.toThrow('PLAN_VALIDATION_STATE_REUSE_UNSUPPORTED');
    }));

  test('allows duplicate pending admission but only one transition succeeds', () =>
    withStore(schema, async (store) => {
      const first = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_8),
      });
      const second = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_8),
      });
      expect(second).toEqual(first);
      await store.markStoredPlanArtifactValid({ ...PLAN_STORE_SCOPE, planRef: first });
      await expect(
        store.markStoredPlanArtifactValid({ ...PLAN_STORE_SCOPE, planRef: second })
      ).rejects.toThrow('PLAN_VALIDATION_STATE_INVALID_TRANSITION');
    }));

  test('rejects invalid lifecycle transitions', () =>
    withStore(schema, async (store) => {
      const planRef = await store.storePlanArtifact({
        buildResult: makeBuildResult(PLAN_ID.r4_4),
      });
      await store.markStoredPlanArtifactValid({ ...PLAN_STORE_SCOPE, planRef });
      await expect(
        store.markStoredPlanArtifactInvalid({
          ...PLAN_STORE_SCOPE,
          planRef,
          report: makeRejection(PLAN_ID.r4_4),
        })
      ).rejects.toThrow('PLAN_VALIDATION_STATE_INVALID_TRANSITION');
      await expect(
        store.markStoredPlanArtifactValid({ ...PLAN_STORE_SCOPE, planRef })
      ).rejects.toThrow('PLAN_VALIDATION_STATE_INVALID_TRANSITION');
    }));
});
