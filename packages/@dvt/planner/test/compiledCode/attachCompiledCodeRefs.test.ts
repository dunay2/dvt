import { describe, expect, it, vi } from 'vitest';

import { InMemoryCompiledCodeStorage } from '../../src/compiledCode/adapters/InMemoryCompiledCodeStorage.js';
import { attachCompiledCodeRefs } from '../../src/compiledCode/attachCompiledCodeRefs.js';
import { DBT_MODEL, DBT_SNAPSHOT, DBT_TEST, type ExecutionPlanV2 } from '../../src/domain/types.js';
import type { ICompiledCodeStorage } from '../../src/ports/ICompiledCodeStorage.js';

const TENANT = 'test-tenant';

function buildPlan(): ExecutionPlanV2 {
  return {
    metadata: {
      planVersion: '2.3',
      inputHashSha256: 'hash',
      planId: 'plan',
      createdAtIso: '2026-03-05T00:00:00.000Z',
    },
    steps: [
      { stepId: 'model.analytics.orders', kind: DBT_MODEL, dependsOn: [] },
      { stepId: 'test.analytics.orders_not_null', kind: DBT_TEST, dependsOn: [] },
      { stepId: 'snapshot.analytics.orders', kind: DBT_SNAPSHOT, dependsOn: [] },
    ],
  };
}

describe('attachCompiledCodeRefs', () => {
  it('adds compiledCodeRef when compiled_code exists', async () => {
    const storage = new InMemoryCompiledCodeStorage();
    const plan = buildPlan();
    const compiledCodeByNodeId = new Map<string, string>([
      ['model.analytics.orders', 'select * from raw.orders'],
    ]);

    const enriched = await attachCompiledCodeRefs(plan, {
      tenantId: TENANT,
      compiledCodeByNodeId,
      storage,
    });
    expect(enriched.steps[0]?.stepTypeConfig?.['compiledCodeRef']).toBeDefined();
  });

  it('skips upload when no compiled_code exists for the step', async () => {
    const storage = new InMemoryCompiledCodeStorage();
    const uploadSpy = vi.spyOn(storage, 'upload');
    const plan = buildPlan();
    const compiledCodeByNodeId = new Map<string, string>([['another.step', 'select 1']]);

    const enriched = await attachCompiledCodeRefs(plan, {
      tenantId: TENANT,
      compiledCodeByNodeId,
      storage,
    });

    expect(uploadSpy).not.toHaveBeenCalled();
    expect(enriched.steps[0]?.stepTypeConfig?.['compiledCodeRef']).toBeUndefined();
  });

  it('uploads once when two steps share exactly the same SQL', async () => {
    const storage = new InMemoryCompiledCodeStorage();
    const uploadSpy = vi.spyOn(storage, 'upload');
    const plan = buildPlan();
    const compiledCodeByNodeId = new Map<string, string>([
      ['model.analytics.orders', 'select * from shared.table'],
      ['test.analytics.orders_not_null', 'select * from shared.table'],
    ]);

    const enriched = await attachCompiledCodeRefs(plan, {
      tenantId: TENANT,
      compiledCodeByNodeId,
      storage,
    });

    expect(uploadSpy).toHaveBeenCalledTimes(1);
    expect(enriched.steps[0]?.stepTypeConfig?.['compiledCodeRef']).toBeDefined();
    expect(enriched.steps[1]?.stepTypeConfig?.['compiledCodeRef']).toBeDefined();
  });

  it('fails open when upload throws', async () => {
    const storage: ICompiledCodeStorage = {
      async upload(): Promise<string> {
        throw new Error('upload failed');
      },
      async read(): Promise<Buffer> {
        return Buffer.alloc(0);
      },
      async exists(): Promise<boolean> {
        return false;
      },
    };

    const plan = buildPlan();
    const compiledCodeByNodeId = new Map<string, string>([
      ['model.analytics.orders', 'select * from broken.upload'],
    ]);

    const enriched = await attachCompiledCodeRefs(plan, {
      tenantId: TENANT,
      compiledCodeByNodeId,
      storage,
    });
    expect(enriched.steps[0]?.stepTypeConfig?.['compiledCodeRef']).toBeUndefined();
  });

  it('scopes storageUri to tenantId', async () => {
    const storage = new InMemoryCompiledCodeStorage();
    const enriched = await attachCompiledCodeRefs(buildPlan(), {
      tenantId: 'tenant-a',
      compiledCodeByNodeId: new Map([['model.analytics.orders', 'select 1']]),
      storage,
    });
    const ref = enriched.steps[0]?.stepTypeConfig?.['compiledCodeRef'] as
      | { storageUri: string }
      | undefined;
    expect(ref?.storageUri).toContain('tenant-a');
  });
});
