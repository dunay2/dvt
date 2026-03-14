/**
 * @file StepTypeRegistry — G9 implementation
 *
 * Provides a kind-keyed registry that maps step kinds to Zod schemas,
 * replacing the opaque `Record<string, unknown>` stepTypeConfig with
 * schema-driven validation at planner output and adapter consumption boundaries.
 *
 * Design constraints:
 *  - Fail-open for unknown kinds: unregistered kinds pass through without error.
 *  - Fail-hard for known kinds with invalid config: returns a structured error.
 *  - Registry is immutable after construction.
 *  - `compiledCodeRef` is validated here per ADR-0032 (optional field in DbtStepTypeConfig).
 *
 * @see ADR-0006 — Extensibility strategy
 * @see ADR-0032 — compiledCodeRef ownership
 */
import { z } from 'zod';

// ── CompiledCodeRef schema (mirrors IRunStateStore.v1.ts, kept local to avoid circular import) ──

const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const CompiledCodeRefSchema = z
  .object({
    sha256: HexSha256Schema,
    storageUri: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    encoding: z.literal('utf-8').optional(),
  })
  .strict();

// ── DbtStepTypeConfig ─────────────────────────────────────────────────────────

/**
 * Typed config for DBT_MODEL, DBT_TEST, DBT_SNAPSHOT step kinds.
 *
 * Written by the planner's dbtStepFactory (policy fields), then optionally
 * enriched with compiledCodeRef by attachCompiledCodeRefs (ADR-0032).
 */
export interface DbtStepTypeConfig extends Record<string, unknown> {
  stepTimeoutMs?: number;
  retries?: {
    maxAttempts: number;
    backoffMs: number;
  };
  concurrency?: {
    maxInFlight: number;
  };
  custom?: Record<string, unknown>;
  /** Set post-plan-build by attachCompiledCodeRefs. ADR-0032. */
  compiledCodeRef?: {
    sha256: string;
    storageUri: string;
    sizeBytes: number;
    encoding?: 'utf-8';
  };
}

export const DbtStepTypeConfigSchema = z
  .object({
    stepTimeoutMs: z.number().positive().optional(),
    retries: z
      .object({
        maxAttempts: z.number().int().positive(),
        backoffMs: z.number().nonnegative(),
      })
      .strict()
      .optional(),
    concurrency: z
      .object({
        maxInFlight: z.number().int().positive(),
      })
      .strict()
      .optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
    compiledCodeRef: CompiledCodeRefSchema.optional(),
  })
  .strict();

// ── IStepTypeRegistry ─────────────────────────────────────────────────────────

export type StepTypeValidationResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string };

/**
 * Maps step kinds to their config schemas.
 * Unknown kinds always pass through (fail-open per ADR-0006 extensibility policy).
 */
export interface IStepTypeRegistry {
  /**
   * Validate `config` against the schema registered for `kind`.
   * Returns `{ success: true, data }` for known-valid or unknown kinds.
   * Returns `{ success: false, error }` for known-invalid configs.
   */
  validate(kind: string, config: unknown): StepTypeValidationResult;

  /** Returns true if this kind has a registered schema. */
  isKnown(kind: string): boolean;

  /** All registered kind names. */
  getKinds(): readonly string[];
}

// ── StepTypeRegistry ──────────────────────────────────────────────────────────

export class StepTypeRegistry implements IStepTypeRegistry {
  private readonly schemas: ReadonlyMap<string, z.ZodType>;

  constructor(schemas: ReadonlyMap<string, z.ZodType>) {
    this.schemas = schemas;
  }

  validate(kind: string, config: unknown): StepTypeValidationResult {
    const schema = this.schemas.get(kind);
    if (schema === undefined) {
      // Unknown kind: fail-open — pass through as-is
      const data =
        config !== null && typeof config === 'object' && !Array.isArray(config)
          ? (config as Record<string, unknown>)
          : {};
      return { success: true, data };
    }

    const result = schema.safeParse(config ?? {});
    if (result.success) {
      return { success: true, data: result.data as Record<string, unknown> };
    }

    return {
      success: false,
      error: `INVALID_STEP_TYPE_CONFIG[${kind}]: ${result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    };
  }

  isKnown(kind: string): boolean {
    return this.schemas.has(kind);
  }

  getKinds(): readonly string[] {
    return Array.from(this.schemas.keys());
  }
}

// ── Default registry ──────────────────────────────────────────────────────────

/** DBT step kind constants (mirrors planner/src/domain/types.ts). */
export const DBT_MODEL = 'DBT_MODEL';
export const DBT_TEST = 'DBT_TEST';
export const DBT_SNAPSHOT = 'DBT_SNAPSHOT';

const DEFAULT_SCHEMAS = new Map<string, z.ZodType>([
  [DBT_MODEL, DbtStepTypeConfigSchema],
  [DBT_TEST, DbtStepTypeConfigSchema],
  [DBT_SNAPSHOT, DbtStepTypeConfigSchema],
]);

/**
 * Creates the default registry with built-in DBT step kind schemas.
 * Pass additional entries to extend for custom step kinds.
 */
export function createDefaultStepTypeRegistry(
  extensions?: ReadonlyMap<string, z.ZodType>
): IStepTypeRegistry {
  const schemas = new Map(DEFAULT_SCHEMAS);
  if (extensions) {
    for (const [kind, schema] of extensions) {
      schemas.set(kind, schema);
    }
  }
  return new StepTypeRegistry(schemas);
}
