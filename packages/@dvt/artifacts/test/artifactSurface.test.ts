import { KNOWN_STEP_KINDS, type ExecutionPlanV2 } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  attachCompiledCodeRefs,
  computeSha256,
  InMemoryCompiledCodeStorage,
  type ICompiledCodeStorage,
} from '../src/index.js';

const TENANT_ID = 'artifact-test-tenant';

function buildPlan(): ExecutionPlanV2 {
  return {
    metadata: {
      planVersion: '1.0',
      inputHashSha256: 'input-hash',
      planId: 'plan-id',
      createdAtIso: '2026-03-19T00:00:00.000Z',
    },
    steps: [
      {
        stepId: 'model.analytics.orders',
        kind: KNOWN_STEP_KINDS.DBT_MODEL,
        dependsOn: [],
      },
      {
        stepId: 'test.analytics.orders_not_null',
        kind: KNOWN_STEP_KINDS.DBT_TEST,
        dependsOn: ['model.analytics.orders'],
      },
      {
        stepId: 'snapshot.analytics.orders',
        kind: KNOWN_STEP_KINDS.DBT_SNAPSHOT,
        dependsOn: ['model.analytics.orders'],
      },
    ],
  };
}

describe('@dvt/artifacts public surface', () => {
  it('computeSha256 is deterministic', () => {
    const content = Buffer.from('select 1', 'utf-8');

    expect(computeSha256(content)).toBe(computeSha256(content));
  });

  it('InMemoryCompiledCodeStorage stores and reads blobs by tenant and hash', async () => {
    const storage = new InMemoryCompiledCodeStorage();
    const content = Buffer.from('select * from analytics.orders', 'utf-8');
    const sha256 = computeSha256(content);

    const storageUri = await storage.upload(TENANT_ID, sha256, content);

    expect(storageUri).toContain(TENANT_ID);
    await expect(storage.exists(TENANT_ID, sha256)).resolves.toBe(true);
    await expect(storage.read(TENANT_ID, sha256)).resolves.toEqual(content);
  });

  it('attachCompiledCodeRefs enriches eligible steps and deduplicates uploads', async () => {
    const upload = vi.fn<ICompiledCodeStorage['upload']>(async (tenantId, sha256) => {
      return `memory://${tenantId}/${sha256}`;
    });
    const storage: ICompiledCodeStorage = {
      upload,
      read: vi.fn(async () => Buffer.from('select 1', 'utf-8')),
      exists: vi.fn(async () => true),
    };

    const enrichedPlan = await attachCompiledCodeRefs(buildPlan(), {
      tenantId: TENANT_ID,
      storage,
      compiledCodeByNodeId: new Map([
        ['model.analytics.orders', 'select * from analytics.orders'],
        ['test.analytics.orders_not_null', 'select * from analytics.orders'],
        ['snapshot.analytics.orders', 'select * from analytics.orders_snapshot'],
      ]),
    });

    expect(upload).toHaveBeenCalledTimes(1);

    const modelStep = enrichedPlan.steps.find((step) => step.stepId === 'model.analytics.orders');
    const testStep = enrichedPlan.steps.find(
      (step) => step.stepId === 'test.analytics.orders_not_null'
    );
    const snapshotStep = enrichedPlan.steps.find(
      (step) => step.stepId === 'snapshot.analytics.orders'
    );

    expect(modelStep?.stepTypeConfig?.compiledCodeRef?.storageUri).toContain(TENANT_ID);
    expect(testStep?.stepTypeConfig?.compiledCodeRef?.storageUri).toContain(TENANT_ID);
    expect(snapshotStep?.stepTypeConfig?.compiledCodeRef).toBeUndefined();
  });
});
