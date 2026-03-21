import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { StoredExecutablePlanResolver } from '../../../src/application/services/StoredExecutablePlanResolver.js';

const EXECUTABLE_PLAN_TEXT = JSON.stringify({
  metadata: {
    planId: 'plan-1',
    planVersion: '2.3',
    schemaVersion: 'v1.2',
    contractVersion: '1.0.0',
  },
  steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
});

const PLAN_REF = {
  uri: 'dvt-plan://postgres/plan-1',
  sha256: createHash('sha256').update(EXECUTABLE_PLAN_TEXT).digest('hex'),
  schemaVersion: 'v1.2',
  planId: 'plan-1',
  planVersion: '2.3',
};

describe('StoredExecutablePlanResolver', () => {
  it('parses executable bytes for stored dvt-plan refs', async () => {
    const fetcher = {
      fetch: vi.fn(async () => Buffer.from(EXECUTABLE_PLAN_TEXT, 'utf8')),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });

    const plan = await resolver.fetch(PLAN_REF);

    expect(plan).toEqual({
      metadata: {
        planId: 'plan-1',
        planVersion: '2.3',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
      },
      steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
    });
    expect(fetcher.fetch).toHaveBeenCalledWith(PLAN_REF);
  });

  it('rejects stored dvt-plan refs when the executable bytes do not match the ref hash', async () => {
    const fetcher = {
      fetch: vi.fn(async () => Buffer.from(`${EXECUTABLE_PLAN_TEXT}\n`, 'utf8')),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });

    await expect(resolver.fetch(PLAN_REF)).rejects.toThrow('PLAN_INTEGRITY_VALIDATION_FAILED');
  });

  it('rejects stored dvt-plan refs when persisted metadata does not match the ref', async () => {
    const mismatchedText = JSON.stringify({
      metadata: {
        planId: 'plan-1',
        planVersion: '9.9',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
      },
      steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
    });
    const fetcher = {
      fetch: vi.fn(async () => Buffer.from(mismatchedText, 'utf8')),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });
    const planRef = {
      ...PLAN_REF,
      sha256: createHash('sha256').update(mismatchedText).digest('hex'),
    };

    await expect(resolver.fetch(planRef)).rejects.toThrow('PLAN_REF_MISMATCH: planVersion');
  });

  it('preserves legacy external planRef behavior for non-dvt-plan schemes', async () => {
    const fetcher = {
      fetch: vi.fn(async () => new Uint8Array()),
    };
    const resolver = new StoredExecutablePlanResolver({ fetcher: fetcher as never });

    const plan = await resolver.fetch({
      ...PLAN_REF,
      uri: 'https://plans.example.com/plan-1.json',
      requiresCapabilities: ['basic-execution'],
    });

    expect(plan).toEqual({
      metadata: {
        planId: 'plan-1',
        planVersion: '2.3',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        requiresCapabilities: ['basic-execution'],
      },
      steps: [],
    });
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });
});
