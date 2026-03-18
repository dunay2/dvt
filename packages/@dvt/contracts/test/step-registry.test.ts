import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createDefaultStepTypeRegistry,
  DBT_MODEL,
  DBT_SNAPSHOT,
  DBT_TEST,
  DbtStepTypeConfigSchema,
  StepTypeRegistry,
} from '../src/step-registry/StepTypeRegistry.js';

// ── DbtStepTypeConfigSchema ───────────────────────────────────────────────────

describe('DbtStepTypeConfigSchema', () => {
  it('accepts empty config', () => {
    const result = DbtStepTypeConfigSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts full policy config', () => {
    const config = {
      stepTimeoutMs: 30_000,
      retries: { maxAttempts: 3, backoffMs: 1000 },
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
    const result = DbtStepTypeConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('accepts compiledCodeRef without encoding (optional)', () => {
    const config = {
      compiledCodeRef: {
        sha256: 'b'.repeat(64),
        storageUri: 'file:///tmp/step.sql',
        sizeBytes: 0,
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

  it('rejects unknown fields (strict)', () => {
    const result = DbtStepTypeConfigSchema.safeParse({ unknownField: true });
    expect(result.success).toBe(false);
  });

  it('rejects negative stepTimeoutMs', () => {
    const result = DbtStepTypeConfigSchema.safeParse({ stepTimeoutMs: -1 });
    expect(result.success).toBe(false);
  });
});

// ── createDefaultStepTypeRegistry ────────────────────────────────────────────

describe('createDefaultStepTypeRegistry', () => {
  const registry = createDefaultStepTypeRegistry();

  it('knows DBT_MODEL, DBT_TEST, DBT_SNAPSHOT', () => {
    expect(registry.isKnown(DBT_MODEL)).toBe(true);
    expect(registry.isKnown(DBT_TEST)).toBe(true);
    expect(registry.isKnown(DBT_SNAPSHOT)).toBe(true);
  });

  it('does not know unregistered kinds', () => {
    expect(registry.isKnown('CUSTOM_SPARK_JOB')).toBe(false);
    expect(registry.isKnown('')).toBe(false);
  });

  it('returns all registered kinds', () => {
    const kinds = registry.getKinds();
    expect(kinds).toContain(DBT_MODEL);
    expect(kinds).toContain(DBT_TEST);
    expect(kinds).toContain(DBT_SNAPSHOT);
    expect(kinds).toHaveLength(3);
  });

  describe('validate — known kinds', () => {
    it('passes valid empty config for DBT_MODEL', () => {
      const result = registry.validate(DBT_MODEL, {});
      expect(result.success).toBe(true);
    });

    it('passes valid full config for DBT_TEST', () => {
      const result = registry.validate(DBT_TEST, {
        stepTimeoutMs: 5000,
        retries: { maxAttempts: 2, backoffMs: 500 },
      });
      expect(result.success).toBe(true);
    });

    it('fails when known-kind config has invalid compiledCodeRef', () => {
      const result = registry.validate(DBT_SNAPSHOT, {
        compiledCodeRef: { sha256: 'bad', storageUri: 's3://x', sizeBytes: 1 },
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('INVALID_STEP_TYPE_CONFIG[DBT_SNAPSHOT]');
      }
    });

    it('fails on unknown fields for known kinds', () => {
      const result = registry.validate(DBT_MODEL, { rogue: true });
      expect(result.success).toBe(false);
    });
  });

  describe('validate — unknown kinds (fail-open)', () => {
    it('passes any config for unregistered kind', () => {
      const result = registry.validate('UNKNOWN_KIND', { anything: 'goes' });
      expect(result.success).toBe(true);
    });

    it('passes null-ish config for unregistered kind', () => {
      const result = registry.validate('FUTURE_KIND', undefined);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toStrictEqual({});
    });
  });
});

// ── Extension via createDefaultStepTypeRegistry ───────────────────────────────

describe('createDefaultStepTypeRegistry with extensions', () => {
  const SparkJobSchema = z.object({ sparkVersion: z.string() }).strict();
  const extended = createDefaultStepTypeRegistry(new Map([['SPARK_JOB', SparkJobSchema]]));

  it('includes both default and custom kinds', () => {
    expect(extended.isKnown(DBT_MODEL)).toBe(true);
    expect(extended.isKnown('SPARK_JOB')).toBe(true);
  });

  it('validates custom kind schema', () => {
    expect(extended.validate('SPARK_JOB', { sparkVersion: '3.5' }).success).toBe(true);
    expect(extended.validate('SPARK_JOB', { sparkVersion: 42 }).success).toBe(false);
  });
});

// ── StepTypeRegistry constructor ──────────────────────────────────────────────

describe('StepTypeRegistry — custom construction', () => {
  it('empty registry fails-open for all kinds', () => {
    const empty = new StepTypeRegistry(new Map());
    expect(empty.validate('DBT_MODEL', { any: 'thing' }).success).toBe(true);
    expect(empty.getKinds()).toHaveLength(0);
  });
});
