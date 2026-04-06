import { createHash } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Planner } from '../../src/domain/Planner.js';
import type { PlannerInputEnvelopeV1 } from '../../src/domain/types.js';
import { FIXED_VECTOR } from '../vectors/fixed-vector.inline.js';

/** Helper: sha256 sync for test verification (do not use in planner). */
function sha256Sync(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('determinism', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces stable planId for same semantic input, ignoring volatile fields and observability', async () => {
    const planner = new Planner();

    const base: PlannerInputEnvelopeV1 = {
      graphSource: {
        nodes: [
          { nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'model.b', stepKind: 'DBT_MODEL', dependsOn: ['model.a'] },
        ],
      },
      selection: { selectedNodeIds: ['model.b'], includeUpstream: true },
      policies: { retry: { kind: 'at-most-once' } },
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

  it('planId equals sha256(canonicalPlanJson) â€” caller-verifiable', async () => {
    const planner = new Planner();
    const { plan, canonicalPlanJson } = await planner.buildPlan({
      graphSource: { nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }] },
      selection: { selectedNodeIds: ['model.a'] },
    });

    const recomputed = sha256Sync(canonicalPlanJson);
    expect(recomputed).toBe(plan.metadata.planId);
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('canonicalPlanJson does NOT contain planId, createdAtIso, schemaVersion, or contractVersion', async () => {
    const planner = new Planner();
    const { canonicalPlanJson } = await planner.buildPlan({
      graphSource: { nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }] },
      selection: { selectedNodeIds: ['model.a'] },
    });

    const parsed = JSON.parse(canonicalPlanJson) as Record<string, unknown>;
    const meta = parsed['metadata'] as Record<string, unknown> | undefined;
    expect(meta).toBeDefined();
    expect(meta?.['planId']).toBeUndefined();
    expect(meta?.['createdAtIso']).toBeUndefined();
    expect(meta?.['schemaVersion']).toBeUndefined();
    expect(meta?.['contractVersion']).toBeUndefined();
  });

  it('keeps planId stable even when createdAtIso differs across build timestamps', async () => {
    vi.useFakeTimers();
    const planner = new Planner();
    const input: PlannerInputEnvelopeV1 = {
      graphSource: { nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }] },
      selection: { selectedNodeIds: ['model.a'] },
    };

    vi.setSystemTime(new Date('2026-04-03T10:00:00.000Z'));
    const first = await planner.buildPlan(input);

    vi.setSystemTime(new Date('2026-04-03T10:00:05.000Z'));
    const second = await planner.buildPlan(input);

    expect(first.plan.metadata.createdAtIso).not.toBe(second.plan.metadata.createdAtIso);
    expect(first.plan.metadata.planId).toBe(second.plan.metadata.planId);
    expect(first.plan.metadata.inputHashSha256).toBe(second.plan.metadata.inputHashSha256);
  });

  it('keeps planId stable for semantically equivalent node and dependency ordering', async () => {
    const planner = new Planner();

    const first = await planner.buildPlan({
      graphSource: {
        nodes: [
          { nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'b', stepKind: 'DBT_MODEL', dependsOn: ['a'] },
          { nodeId: 'c', stepKind: 'DBT_MODEL', dependsOn: ['a', 'b'] },
        ],
      },
      selection: { selectedNodeIds: ['c'], includeUpstream: true },
    });

    const second = await planner.buildPlan({
      graphSource: {
        nodes: [
          { nodeId: 'c', stepKind: 'DBT_MODEL', dependsOn: ['b', 'a'] },
          { nodeId: 'b', stepKind: 'DBT_MODEL', dependsOn: ['a'] },
          { nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: [] },
        ],
      },
      selection: { selectedNodeIds: ['c'], includeUpstream: true },
    });

    expect(first.plan.metadata.planId).toBe(second.plan.metadata.planId);
    expect(first.plan.metadata.inputHashSha256).toBe(second.plan.metadata.inputHashSha256);
  });

  it('ignores provenance-only node metadata for inputHash and planId', async () => {
    const planner = new Planner();

    const first = await planner.buildPlan({
      graphSource: {
        nodes: [
          {
            nodeId: 'model.a',
            stepKind: 'DBT_MODEL',
            dependsOn: [],
            metadata: { displayName: 'Model A', sourceRef: 'dbt://a' },
          },
        ],
      },
      selection: { selectedNodeIds: ['model.a'] },
    });

    const second = await planner.buildPlan({
      graphSource: {
        nodes: [
          {
            nodeId: 'model.a',
            stepKind: 'DBT_MODEL',
            dependsOn: [],
            metadata: {
              displayName: 'Modelo A',
              sourceRef: 'dbt://different/a',
              tags: { owner: 'analytics' },
            },
          },
        ],
      },
      selection: { selectedNodeIds: ['model.a'] },
    });

    expect(first.plan.metadata.planId).toBe(second.plan.metadata.planId);
    expect(first.plan.metadata.inputHashSha256).toBe(second.plan.metadata.inputHashSha256);
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

    const expectedPlanId = 'a554dbfa21eae1fa1e57e9ec9260b92c9c278dcce42ff6c713d6dc87d67dfc5d';
    expect(plan.metadata.planId).toBe(expectedPlanId);
  });
});
