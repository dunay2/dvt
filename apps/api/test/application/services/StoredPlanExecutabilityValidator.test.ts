import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  asNonBlankString,
  type IStepTypeRegistry,
  type PlanRefSchemaT,
  type RunExecutionPolicy,
} from '@dvt/contracts';
import type { IProviderAdapter } from '@dvt/engine';
import { describe, expect, it, vi } from 'vitest';

import { StoredPlanExecutabilityValidator } from '../../../src/application/services/StoredPlanExecutabilityValidator.js';

const PLAN_REF: PlanRefSchemaT = {
  uri: asNonBlankString(
    'dvt-plan://postgres/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  ),
  sha256: asNonBlankString('abc123'),
  schemaVersion: asNonBlankString('v1.2'),
  planId: asNonBlankString('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
  planVersion: asNonBlankString('1.0'),
};

describe('StoredPlanExecutabilityValidator', () => {
  it('returns OK when the stored executable plan matches the ref and capabilities', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () => storedPlanArtifact()),
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
          storedPlanArtifact({
            executionPolicy: { requiresCapabilities: [asNonBlankString('workflow.pause')] },
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
          storedPlanArtifact({
            executionPolicy: { requiresCapabilities: [asNonBlankString('workflow.pause')] },
          })
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
            async getProviderStatusView() {
              throw new Error('not used');
            },
            async signal() {
              throw new Error('not used');
            },
            signalSemanticsVersions() {
              return [CURRENT_SIGNAL_SEMANTICS_VERSION] as const;
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
          storedPlanArtifact({
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

  it('rejects invalid stepTypeConfig before capability checks', async () => {
    const capabilitiesSpy = vi.fn(() => ['basic-execution']);
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          storedPlanArtifact({
            stepTypeConfig: {
              retries: {
                maxAttempts: 3,
                backoffMs: 'invalid-backoff-ms',
              },
            },
          })
        ),
      },
      adapters: new Map([
        [
          'mock',
          {
            ...makeAdapter(['basic-execution']),
            capabilities: capabilitiesSpy,
          },
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
      reason: expect.stringContaining('INVALID_STEP_TYPE_CONFIG'),
      cause: 'plan_fetch',
    });
    expect(capabilitiesSpy).not.toHaveBeenCalled();
  });

  it('accepts custom step kinds when an explicit stepTypeRegistry is injected', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
          })
        ),
      },
      adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
      stepTypeRegistry: makeRegistryForKind('SPARK_SQL'),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'OK',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
    });
  });

  it('rejects when a step kind is not executable on the selected adapter', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
          })
        ),
      },
      adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
      stepTypeRegistry: makeRegistryForKind('SPARK_SQL', {
        supportedAdapters: ['temporal'],
        requiredCapabilities: [],
      }),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'ERROR',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
      code: 'INVALID_STEP_KIND',
      degradable: false,
      reason: 'Step kind SPARK_SQL is not executable on adapter mock',
      cause: 'SPARK_SQL',
    });
  });

  it('derives required capabilities from step-kind registry profiles', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
          })
        ),
      },
      adapters: new Map([['mock', makeAdapter(['basic-execution'])]]),
      stepTypeRegistry: makeRegistryForKind('SPARK_SQL', {
        supportedAdapters: ['mock'],
        requiredCapabilities: ['spark.submit'],
      }),
    });

    const result = await validator.validatePlan(PLAN_REF, 'mock');

    expect(result).toEqual({
      status: 'ERROR',
      planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      adapterId: 'mock',
      code: 'MISSING_CAPABILITY',
      degradable: false,
      reason: 'Missing adapter capability: spark.submit',
      cause: 'spark.submit',
    });
  });

  it('rejects unknown step kinds when no custom stepTypeRegistry is injected', async () => {
    const validator = new StoredPlanExecutabilityValidator({
      fetcher: {
        fetchForValidation: vi.fn(async () =>
          storedPlanArtifact({
            stepKind: 'SPARK_SQL',
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
      reason: expect.stringContaining('INVALID_STEP_KIND'),
      cause: 'plan_fetch',
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

function storedPlanArtifact(
  overrides?: Partial<{
    planId: string;
    planVersion: string;
    schemaVersion: string;
    stepKind: string;
    stepTypeConfig: Record<string, unknown>;
    executionPolicy: RunExecutionPolicy;
  }>
): { bytes: Uint8Array; executionPolicy: RunExecutionPolicy } {
  return {
    bytes: Buffer.from(
      JSON.stringify({
        metadata: {
          planId:
            overrides?.planId ?? 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          planVersion: overrides?.planVersion ?? '1.0',
          schemaVersion: overrides?.schemaVersion ?? 'v1.2',
          contractVersion: '1.0.0',
          inputHashSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          createdAtIso: '2026-03-01T00:00:00.000Z',
        },
        steps: [
          {
            stepId: 'step-1',
            kind: overrides?.stepKind ?? 'DBT_MODEL',
            dependsOn: [],
            ...(overrides?.stepTypeConfig === undefined
              ? {}
              : { stepTypeConfig: overrides.stepTypeConfig }),
          },
        ],
      }),
      'utf8'
    ),
    executionPolicy: overrides?.executionPolicy ?? {},
  };
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
    async getProviderStatusView() {
      throw new Error('not used');
    },
    async signal() {
      throw new Error('not used');
    },
    signalSemanticsVersions() {
      return [CURRENT_SIGNAL_SEMANTICS_VERSION] as const;
    },
    capabilities() {
      return capabilities.map((value) => asNonBlankString(value));
    },
  };
}

function makeRegistryForKind(
  kind: string,
  profile?: {
    supportedAdapters: readonly ('temporal' | 'conductor' | 'mock')[];
    requiredCapabilities: readonly string[];
  }
): IStepTypeRegistry {
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
    getExecutionProfile(candidate: string) {
      return candidate === kind ? profile : undefined;
    },
  };
}

