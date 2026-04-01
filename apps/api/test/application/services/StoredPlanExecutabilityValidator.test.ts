import type { IProviderAdapter } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import { StoredPlanExecutabilityValidator } from '../../../src/application/services/StoredPlanExecutabilityValidator.js';

const PLAN_REF = {
  uri: 'dvt-plan://postgres/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  sha256: 'abc123',
  schemaVersion: 'v1.2',
  planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  planVersion: '1.0',
};

describe('StoredPlanExecutabilityValidator', () => {
  it('returns OK when the stored executable plan matches the ref and capabilities', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () => executablePlanBytes()),
      },
      adapters: new Map([['mock', makeAdapter(['basic-execution', 'workflow.fan.parallel'])]]),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'OK',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
    });
  });

  it('rejects when the adapter lacks a required capability', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          executablePlanBytes({ requiresCapabilities: ['workflow.pause'] })
        ),
      },
      adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'ERROR',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
      code: 'MISSING_CAPABILITY',
      degradable: false,
      reason: 'Missing adapter capability: workflow.pause',
      cause: 'workflow.pause',
    });
  });

  it('rejects when the plan requires capabilities but the adapter does not declare any', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          executablePlanBytes({ requiresCapabilities: ['workflow.pause'] })
        ),
      },
      adapters: new Map([
        [
          'mock',
          {
            provider: 'mock',
            async startRun() {
              throw new Error('not used');
            },
            async cancelRun() {
              throw new Error('not used');
            },
            async getRunStatus() {
              throw new Error('not used');
            },
            async signal() {
              throw new Error('not used');
            },
          } as IProviderAdapter,
        ],
      ]),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'ERROR',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
      code: 'REJECTED',
      degradable: false,
      reason: 'Adapter does not declare capabilities required for executability validation',
      cause: 'capabilities',
    });
  });

  it('rejects when the persisted executable plan metadata no longer matches the ref', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          executablePlanBytes({
            planId: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
          })
        ),
      },
      adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'ERROR',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
      code: 'REJECTED',
      degradable: false,
      reason: 'PLAN_REF_MISMATCH: planId',
      cause: 'plan_ref',
    });
  });

  it('rejects when fetching the persisted executable plan fails', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () => {
          throw new Error('PLAN_NOT_FOUND: plan-1');
        }),
      },
      adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'ERROR',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
      code: 'REJECTED',
      degradable: false,
      reason: 'PLAN_NOT_FOUND: plan-1',
      cause: 'plan_fetch',
    });
  });
});

function executablePlanBytes(
  overrides?: Partial<{
    planId: string;
    planVersion: string;
    schemaVersion: string;
    requiresCapabilities: string[];
  }>
): Uint8Array {
  return Buffer.from(
    JSON.stringify({
      metadata: {
        planId:
          overrides?.planId ?? 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        planVersion: overrides?.planVersion ?? '1.0',
        schemaVersion: overrides?.schemaVersion ?? 'v1.2',
        contractVersion: '1.0.0',
        inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        createdAtIso: '2026-03-01T00:00:00.000Z',
        ...(overrides?.requiresCapabilities === undefined
          ? {}
          : { requiresCapabilities: overrides.requiresCapabilities }),
      },
      steps: [{ stepId: 'step-1', kind: 'DBT_MODEL', dependsOn: [] }],
    }),
    'utf8'
  );
}

function makeAdapter(capabilities: ReadonlyArray<string>): IProviderAdapter {
  return {
    provider: 'mock',
    async startRun() {
      throw new Error('not used');
    },
    async cancelRun() {
      throw new Error('not used');
    },
    async getRunStatus() {
      throw new Error('not used');
    },
    async signal() {
      throw new Error('not used');
    },
    capabilities() {
      return [...capabilities];
    },
  };
}
