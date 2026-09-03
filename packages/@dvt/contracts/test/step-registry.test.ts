import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { isKnownStepKind } from '../src/contracts/planner/StepKindRegistry.v1.js';
import { SparkJobStepTypeConfigSchema } from '../src/index.js';
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

describe('SparkJobStepTypeConfigSchema', () => {
  it('accepts spark-specific required fields with shared execution metadata', () => {
    const config = {
      application: 'orders-daily',
      entrypoint: 'jobs/orders.py',
      runtime: 'python' as const,
      stepTimeoutMs: 60_000,
      concurrency: { maxInFlight: 2 },
    };

    const result = SparkJobStepTypeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toStrictEqual(config);
  });

  it('rejects invalid runtime values', () => {
    expect(
      SparkJobStepTypeConfigSchema.safeParse({
        application: 'orders-daily',
        entrypoint: 'jobs/orders.py',
        runtime: 'java',
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

  it('rejects unknown kinds at the registry boundary', () => {
    expect(registry.validate('UNKNOWN_KIND', { anything: 'goes' })).toEqual({
      success: false,
      error:
        'UNKNOWN_STEP_KIND[UNKNOWN_KIND]: step kind is not registered in the canonical registry.',
    });
    expect(registry.validate('FUTURE_KIND', undefined)).toEqual({
      success: false,
      error:
        'UNKNOWN_STEP_KIND[FUTURE_KIND]: step kind is not registered in the canonical registry.',
    });
  });

  it('rejects invalid config for known kinds', () => {
    const result = registry.validate(DBT_MODEL, { rogue: true });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('INVALID_STEP_TYPE_CONFIG[DBT_MODEL]');
    }
  });
});

describe('isKnownStepKind', () => {
  it('accepts canonical step kind values only', () => {
    expect(isKnownStepKind(DBT_MODEL)).toBe(true);
  });

  it('rejects retired, inherited, and arbitrary kinds', () => {
    expect(isKnownStepKind('PREPARE_POSTGRES_TRANSFORM')).toBe(false);
    expect(isKnownStepKind('POSTGRES_SQL_TRANSFORM')).toBe(false);
    expect(isKnownStepKind('CAPTURE_MATERIALIZATION_EVIDENCE')).toBe(false);
    expect(isKnownStepKind('toString')).toBe(false);
    expect(isKnownStepKind('constructor')).toBe(false);
    expect(isKnownStepKind('UNKNOWN_KIND')).toBe(false);
  });
});

describe('execution profile metadata', () => {
  const dbtExecutorCapability = 'executor.dbt';
  const profile: StepKindExecutionProfile = {
    supportedAdapters: ['temporal'],
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
    expect(isStepKindSupportedByAdapter(registry, 'SPARK_JOB', 'temporal')).toBe(true);
    expect(isStepKindSupportedByAdapter(registry, 'SPARK_JOB', 'conductor')).toBe(false);
  });

  it('collects required capabilities across steps deterministically', () => {
    const capabilities = collectRequiredCapabilitiesForSteps(registry, [
      { kind: 'SPARK_JOB' },
      { kind: 'SPARK_JOB' },
      { kind: DBT_MODEL },
    ]);
    expect(capabilities).toEqual([dbtExecutorCapability, 'spark.observe', 'spark.submit']);
  });

  it('requires the DBT executor capability for every built-in DBT step kind', () => {
    const defaultRegistry = createDefaultStepTypeRegistry();

    expect(defaultRegistry.getExecutionProfile?.(DBT_MODEL)?.requiredCapabilities).toContain(
      dbtExecutorCapability
    );
    expect(defaultRegistry.getExecutionProfile?.(DBT_TEST)?.requiredCapabilities).toContain(
      dbtExecutorCapability
    );
    expect(defaultRegistry.getExecutionProfile?.(DBT_SNAPSHOT)?.requiredCapabilities).toContain(
      dbtExecutorCapability
    );
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
            supportedAdapters: ['temporal'],
            requiredCapabilities: ['spark.submit'],
          },
        ],
      ])
    );

    expect(registry.validate('SPARK_JOB', { sparkVersion: '3.5' }).success).toBe(true);
    expect(registry.validate('SPARK_JOB', { sparkVersion: 42 }).success).toBe(false);
    expect(registry.getExecutionProfile('SPARK_JOB')).toEqual({
      supportedAdapters: ['temporal'],
      requiredCapabilities: ['spark.submit'],
    });
  });
});
