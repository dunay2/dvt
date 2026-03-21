import { describe, expect, it, vi } from 'vitest';

import { StoredExecutablePlanResolver } from '../../../src/application/services/StoredExecutablePlanResolver.js';

const PLAN_REF = {
  uri: 'dvt-plan://postgres/plan-1',
  sha256: 'abc123',
  schemaVersion: 'v1.2',
  planId: 'plan-1',
  planVersion: '2.3',
};

describe('StoredExecutablePlanResolver', () => {
  it('parses executable bytes for stored dvt-plan refs', async () => {
    const fetcher = {
      fetch: vi.fn(async () =>
        Buffer.from(
          JSON.stringify({
            metadata: {
              planId: 'plan-1',
              planVersion: '2.3',
              schemaVersion: 'v1.2',
              contractVersion: '1.0.0',
            },
            steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
          }),
          'utf8'
        )
      ),
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
