import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  collectRequiredCapabilitiesForSteps,
  createDefaultStepTypeRegistry,
  DBT_MODEL,
  DBT_SNAPSHOT,
  DBT_TEST,
  DbtStepTypeConfigSchema,
  isStepKindSupportedByAdapter,
  StepTypeRegistry,
  type StepKindExecutionProfile,
} from '../src/step-registry/StepTypeRegistry.js';

describe('DbtStepTypeConfigSchema', () => {
  it('accepts empty config', () => {
    expect(DbtStepTypeConfigSchema.safeParse({}).success).toBe(true);
  });

  it('accepts full built-in DBT config without retry metadata', () => {
    const config = {
      stepTimeoutMs: 30_000,
      concurrency: { maxInFlight: 4 },
      custom: { warehouse: 'xs' },
    };
    const result = DbtStepTypeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toStrictEqual(config);
  });

  it('accepts compiledCodeRef when present', () => {
    const config = {
      compiledCodeRef: {
        sha256: 'a'.repeat(64),
        storageUri: 's3://bucket/compiled/step.sql',
        sizeBytes: 512,
        encoding: 'utf-8' as const,
      },
    };
    expect(DbtStepTypeConfigSchema.safeParse(config).success).toBe(true);
  });

  it('rejects invalid sha256 in compiledCodeRef', () => {
    const config = {
      compiledCodeRef: {
        sha256: 'not-a-hex-sha',
        storageUri: 's3://bucket/step.sql',
        sizeBytes: 10,
      },
    };
    expect(DbtStepTypeConfigSchema.safeParse(config).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(DbtStepTypeConfigSchema.safeParse({ unknownField: true }).success).toBe(false);
  });

  it('rejects retries under built-in DBT stepTypeConfig', () => {
    expect(
      DbtStepTypeConfigSchema.safeParse({
        retries: { maxAttempts: 3, backoffMs: 1000 },
      }).success
    ).toBe(false);
  });
});

describe('createDefaultStepTypeRegistry', () => {
  const registry = createDefaultStepTypeRegistry();

  it('knows DBT default kinds', () => {
    expect(registry.isKnown(DBT_MODEL)).toBe(true);
    expect(registry.isKnown(DBT_TEST)).toBe(true);
    expect(registry.isKnown(DBT_SNAPSHOT)).toBe(true);
  });

  it('passes any config for unknown kinds (planner-level fail-open)', () => {
    expect(registry.validate('UNKNOWN_KIND', { anything: 'goes' }).success).toBe(true);
    expect(registry.validate('FUTURE_KIND', undefined).success).toBe(true);
  });

  it('rejects invalid config for known kinds', () => {
    const result = registry.validate(DBT_MODEL, { rogue: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('INVALID_STEP_TYPE_CONFIG[DBT_MODEL]');
    }
  });
});

describe('execution profile metadata', () => {
  const profile: StepKindExecutionProfile = {
    supportedAdapters: ['mock'],
    requiredCapabilities: ['spark.submit', 'spark.observe'],
  };

  const registry = createDefaultStepTypeRegistry(
    new Map([['SPARK_JOB', z.object({ image: z.string() }).strict()]]),
    new Map([['SPARK_JOB', profile]])
  );

  it('returns execution profile for registered extension kinds', () => {
    expect(registry.getExecutionProfile?.('SPARK_JOB')).toEqual(profile);
  });

  it('evaluates adapter support from the profile', () => {
    expect(isStepKindSupportedByAdapter(registry, 'SPARK_JOB', 'mock')).toBe(true);
    expect(isStepKindSupportedByAdapter(registry, 'SPARK_JOB', 'temporal')).toBe(false);
  });

  it('collects required capabilities across steps deterministically', () => {
    const capabilities = collectRequiredCapabilitiesForSteps(registry, [
      { kind: 'SPARK_JOB' },
      { kind: 'SPARK_JOB' },
      { kind: DBT_MODEL },
    ]);
    expect(capabilities).toEqual(['spark.observe', 'spark.submit']);
  });
});

describe('StepTypeRegistry constructor', () => {
  it('supports raw schema map and optional profile map', () => {
    const registry = new StepTypeRegistry(
      new Map([['SPARK_JOB', z.object({ sparkVersion: z.string() }).strict()]]),
      new Map([
        [
          'SPARK_JOB',
          {
            supportedAdapters: ['mock'],
            requiredCapabilities: ['spark.submit'],
          },
        ],
      ])
    );

    expect(registry.validate('SPARK_JOB', { sparkVersion: '3.5' }).success).toBe(true);
    expect(registry.validate('SPARK_JOB', { sparkVersion: 42 }).success).toBe(false);
    expect(registry.getExecutionProfile('SPARK_JOB')).toEqual({
      supportedAdapters: ['mock'],
      requiredCapabilities: ['spark.submit'],
    });
  });
});
