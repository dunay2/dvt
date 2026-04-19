import { createHash } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { Planner } from '../../src/domain/Planner.js';
import type { PlannerInputEnvelopeV1 } from '../../src/domain/types.js';
import { derivePlannerGraphSourceFromManifest } from '../../src/index.js';
import { FIXED_VECTOR } from '../vectors/fixed-vector.inline.js';

/** Helper: sha256 sync for test verification (do not use in planner). */
function sha256Sync(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

describe('determinism', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces stable planId for same semantic input, ignoring volatile fields, ownership, and observability', async () => {
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
      ownership: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
      },
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

    const d = await planner.buildPlan({
      ...base,
      ownership: {
        tenantId: 'tenant-2',
        projectId: 'project-2',
        environmentId: 'env-2',
      },
    });
    expect(a.plan.metadata.planId).toEqual(d.plan.metadata.planId);
  });

  it('planId equals sha256(canonicalPlanCoreJson) - caller-verifiable', async () => {
    const planner = new Planner();
    const { plan, canonicalPlanCoreJson } = await planner.buildPlan({
      graphSource: { nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }] },
      selection: { selectedNodeIds: ['model.a'] },
    });

    const recomputed = sha256Sync(canonicalPlanCoreJson);
    expect(recomputed).toBe(plan.metadata.planId);
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('canonicalPlanCoreJson does NOT contain planId, createdAtIso, schemaVersion, or contractVersion', async () => {
    const planner = new Planner();
    const { canonicalPlanCoreJson } = await planner.buildPlan({
      graphSource: { nodes: [{ nodeId: 'model.a', stepKind: 'DBT_MODEL', dependsOn: [] }] },
      selection: { selectedNodeIds: ['model.a'] },
    });

    const parsed = JSON.parse(canonicalPlanCoreJson) as Record<string, unknown>;
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

  it('keeps planId stable across dbt manifest node-key ordering (AR-B3 golden vector)', async () => {
    const planner = new Planner();

    const manifestA = {
      nodes: {
        'model.analytics.base_orders': { resource_type: 'model', depends_on: { nodes: [] } },
        'model.analytics.order_rollup': {
          resource_type: 'model',
          depends_on: { nodes: ['model.analytics.base_orders'] },
        },
        'test.analytics.order_rollup_not_null': {
          resource_type: 'test',
          depends_on: { nodes: ['model.analytics.order_rollup'] },
        },
      },
    };

    const manifestB = {
      nodes: {
        'test.analytics.order_rollup_not_null': {
          resource_type: 'test',
          depends_on: { nodes: ['model.analytics.order_rollup'] },
        },
        'model.analytics.order_rollup': {
          resource_type: 'model',
          depends_on: { nodes: ['model.analytics.base_orders'] },
        },
        'model.analytics.base_orders': { resource_type: 'model', depends_on: { nodes: [] } },
      },
    };

    const first = await planner.buildPlan({
      graphSource: derivePlannerGraphSourceFromManifest(manifestA),
      selection: {
        selectedNodeIds: ['test.analytics.order_rollup_not_null'],
        includeUpstream: true,
      },
    });

    const second = await planner.buildPlan({
      graphSource: derivePlannerGraphSourceFromManifest(manifestB),
      selection: {
        selectedNodeIds: ['test.analytics.order_rollup_not_null'],
        includeUpstream: true,
      },
    });

    expect(first.plan.metadata.planId).toBe(second.plan.metadata.planId);
    expect(first.plan.metadata.inputHashSha256).toBe(second.plan.metadata.inputHashSha256);
    expect(first.plan.metadata.planId).toBe(
      'bc0e5d6a24fb813fb5b44e8121f56106ee6318e14956267a67e0e5e8f93cb0db'
    );
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

    const expectedPlanId = '930152ea7e21b3be5ccd7d07496b3ecaa682fb3fe53bcfc2297a84fba1ad12c7';
    expect(plan.metadata.planId).toBe(expectedPlanId);
  });
});
