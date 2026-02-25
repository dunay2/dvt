import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { Planner } from '../../src/domain/Planner.js';
import type { PlannerInputEnvelopeV2 } from '../../src/domain/types.js';
import { FIXED_VECTOR } from '../vectors/fixed-vector.inline.js';

/** Helper: sha256 sync for test verification (do not use in planner). */
function sha256Sync(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('determinism', () => {
  it('produces stable planId for same semantic input, ignoring volatile fields and observability', async () => {
    const planner = new Planner();

    const base: PlannerInputEnvelopeV2 = {
      nodes: [
        { nodeId: 'model.a', resourceType: 'model', dependsOn: [] },
        { nodeId: 'model.b', resourceType: 'model', dependsOn: ['model.a'] },
      ],
      selection: { selectedNodeIds: ['model.b'], includeUpstream: true },
      policies: { custom: { x: 1 } },
      observability: { tags: { t: '1' }, extra: { y: 'z' } },
      requestedBy: 'u1',
      requestId: 'r1',
    };

    const a = await planner.buildPlan({ ...base, requestedBy: 'u1', requestId: 'r1' });
    const b = await planner.buildPlan({ ...base, requestedBy: 'u2', requestId: 'r2' });

    expect(a.plan.metadata.planId).toEqual(b.plan.metadata.planId);
    expect(a.plan.metadata.inputHashSha256).toEqual(b.plan.metadata.inputHashSha256);

    // Different observability -> same planId
    const c = await planner.buildPlan({ ...base, observability: { tags: { t: 'DIFF' } } });
    expect(a.plan.metadata.planId).toEqual(c.plan.metadata.planId);
  });

  it('planId equals sha256(canonicalPlanJson) — caller-verifiable', async () => {
    const planner = new Planner();
    const { plan, canonicalPlanJson } = await planner.buildPlan({
      nodes: [{ nodeId: 'model.a', resourceType: 'model', dependsOn: [] }],
      selection: { selectedNodeIds: ['model.a'] },
    });

    const recomputed = sha256Sync(canonicalPlanJson);
    expect(recomputed).toBe(plan.metadata.planId);
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('canonicalPlanJson does NOT contain planId or createdAtIso', async () => {
    const planner = new Planner();
    const { canonicalPlanJson } = await planner.buildPlan({
      nodes: [{ nodeId: 'model.a', resourceType: 'model', dependsOn: [] }],
      selection: { selectedNodeIds: ['model.a'] },
    });

    const parsed = JSON.parse(canonicalPlanJson) as Record<string, unknown>;
    const meta = parsed['metadata'] as Record<string, unknown> | undefined;
    expect(meta).toBeDefined();
    expect(meta?.['planId']).toBeUndefined();
    expect(meta?.['createdAtIso']).toBeUndefined();
  });

  it('fixed vector produces expected planId', async () => {
    const BOOTSTRAP_MODE = process.env['DVT_BOOTSTRAP_VECTOR'] === '1';

    const planner = new Planner();
    const { plan } = await planner.buildPlan(FIXED_VECTOR);

    if (BOOTSTRAP_MODE) {
      // Use to capture the reference hash deterministically
      // Example:
      //   DVT_BOOTSTRAP_VECTOR=1 pnpm test -- --reporter=verbose
      // Then copy printed hash into expectedPlanId.
      // eslint-disable-next-line no-console
      console.log(`BOOTSTRAP planId: ${plan.metadata.planId}`);
      expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
      return;
    }

    const expectedPlanId = '1909a49188a9b6653954d4158f77c1bba9475ce4ade76ec3db80480fef944659';
    expect(plan.metadata.planId).toBe(expectedPlanId);
  });
});
