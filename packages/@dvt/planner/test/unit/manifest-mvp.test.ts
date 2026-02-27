import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { Planner } from '../../src/domain/Planner.js';
import {
  FIXTURE_MANIFEST_10,
  FIXTURE_MANIFEST_100,
  FIXTURE_MANIFEST_500,
} from '../fixtures/dbt-manifest.fixtures.js';

function sha256Sync(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('planner MVP manifest.json -> DAG -> layers -> ExecutionPlan', () => {
  it('fixture 10: compila plan determinista desde manifest', async () => {
    const planner = new Planner();

    const a = await planner.buildPlan(FIXTURE_MANIFEST_10);
    const b = await planner.buildPlan({
      ...FIXTURE_MANIFEST_10,
      requestId: 'fixture-10-alt',
      requestedBy: 'different-user',
    });

    expect(a.plan.steps.length).toBe(10);
    expect(a.plan.metadata.planVersion).toBe('2.3');
    expect(a.plan.metadata.planId).toBe(b.plan.metadata.planId);

    const layers = a.plan.observability?.extra?.['plannerLayers'];
    expect(Array.isArray(layers)).toBe(true);
    expect((layers as unknown[]).length).toBeGreaterThan(0);

    expect(sha256Sync(a.canonicalPlanJson)).toBe(a.plan.metadata.planId);
  });

  it('fixture 100: compila plan con capas y hash verificable', async () => {
    const planner = new Planner();

    const { plan, canonicalPlanJson } = await planner.buildPlan(FIXTURE_MANIFEST_100);

    expect(plan.steps.length).toBe(100);
    expect(plan.steps[0]?.stepId).toBe('model.analytics.n000');
    expect(plan.steps[99]?.stepId).toBe('model.analytics.n099');
    expect(sha256Sync(canonicalPlanJson)).toBe(plan.metadata.planId);

    const layers = plan.observability?.extra?.['plannerLayers'] as unknown;
    expect(Array.isArray(layers)).toBe(true);
    expect((layers as number[]).reduce((acc, n) => acc + n, 0)).toBe(100);
  });

  it('fixture 500: compila plan y mantiene determinismo en hash', async () => {
    const planner = new Planner({
      limits: {
        maxNodes: 2_000,
        timeoutMs: 20_000,
      },
    });

    const one = await planner.buildPlan(FIXTURE_MANIFEST_500);
    const two = await planner.buildPlan(FIXTURE_MANIFEST_500);

    expect(one.plan.steps.length).toBe(500);
    expect(one.plan.metadata.planId).toBe(two.plan.metadata.planId);
    expect(one.plan.metadata.inputHashSha256).toBe(two.plan.metadata.inputHashSha256);
    expect(sha256Sync(one.canonicalPlanJson)).toBe(one.plan.metadata.planId);

    const layers = one.plan.observability?.extra?.['plannerLayers'] as unknown;
    expect(Array.isArray(layers)).toBe(true);
    expect((layers as number[]).reduce((acc, n) => acc + n, 0)).toBe(500);
  });
});
