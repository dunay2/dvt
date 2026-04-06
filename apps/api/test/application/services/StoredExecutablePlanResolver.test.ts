import { createHash } from 'node:crypto';

import type { IStepTypeRegistry } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { StoredExecutablePlanResolver } from '../../../src/application/services/StoredExecutablePlanResolver.js';

const EXECUTABLE_PLAN_TEXT = JSON.stringify({
  metadata: {
    planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    planVersion: '1.0',
    schemaVersion: 'v1.2',
    contractVersion: '1.0.0',
    inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    createdAtIso: '2026-03-01T00:00:00.000Z',
  },
  steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
});

const PLAN_REF = {
  uri: 'dvt-plan://postgres/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  sha256: createHash('sha256').update(EXECUTABLE_PLAN_TEXT).digest('hex'),
  schemaVersion: 'v1.2',
  planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  planVersion: '1.0',
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
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAtIso: '2026-03-01T00:00:00.000Z',
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
        planId: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAtIso: '2026-03-01T00:00:00.000Z',
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

    await expect(resolver.fetch(planRef)).rejects.toThrow('PLAN_REF_MISMATCH: planId');
  });

  it('accepts custom step kinds when an explicit stepTypeRegistry is injected', async () => {
    const executablePlanText = JSON.stringify({
      metadata: {
        ...JSON.parse(EXECUTABLE_PLAN_TEXT).metadata,
      },
      steps: [{ stepId: 'step-1', kind: 'SPARK_SQL', dependsOn: [] }],
    });
    const fetcher = {
      fetch: vi.fn(async () => Buffer.from(executablePlanText, 'utf8')),
    };
    const resolver = new StoredExecutablePlanResolver({
      fetcher: fetcher as never,
      stepTypeRegistry: makeRegistryForKind('SPARK_SQL'),
    });
    const planRef = {
      ...PLAN_REF,
      sha256: createHash('sha256').update(executablePlanText).digest('hex'),
    };

    await expect(resolver.fetch(planRef)).resolves.toMatchObject({
      steps: [{ stepId: 'step-1', kind: 'SPARK_SQL', dependsOn: [] }],
    });
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
        planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        planVersion: '1.0',
        schemaVersion: 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: PLAN_REF.sha256,
        createdAtIso: expect.any(String),
        requiresCapabilities: ['basic-execution'],
      },
      steps: [],
    });
    expect(fetcher.fetch).not.toHaveBeenCalled();
  });
});

function makeRegistryForKind(kind: string): IStepTypeRegistry {
  return {
    isKnown(candidate: string): boolean {
      return candidate === kind;
    },
    validate(candidate: string): { success: true; data: Record<string, unknown> } {
      if (candidate !== kind) {
        throw new Error(`unexpected kind validation request: ${candidate}`);
      }
      return { success: true, data: {} };
    },
    getKinds(): readonly string[] {
      return [kind];
    },
  };
}
