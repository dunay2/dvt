import { z } from 'zod';

import type { Provider } from '../types/contracts.js';

const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const CompiledCodeRefSchema = z
  .object({
    sha256: HexSha256Schema,
    storageUri: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    encoding: z.literal('utf-8').optional(),
  })
  .strict();

export const StepArtifactRefSchema = z
  .object({
    artifactKind: z.string().min(1),
    sha256: HexSha256Schema,
    storageUri: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    encoding: z.literal('utf-8').optional(),
  })
  .strict();

export interface DbtStepTypeConfig extends Record<string, unknown> {
  stepTimeoutMs?: number;
  concurrency?: {
    maxInFlight: number;
  };
  custom?: Record<string, unknown>;
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

export type StepTypeValidationResult =
  | { success: true; data: Record<string, unknown> }
  | { success: false; error: string };

export interface StepKindExecutionProfile {
  /**
   * Providers that can execute this kind.
   * Keep the list explicit to avoid runtime-local allowlists.
   */
  supportedAdapters: readonly Provider[];
  /**
   * Capabilities required when this kind is present in a plan.
   */
  requiredCapabilities: readonly string[];
}

export interface IStepTypeRegistry {
  validate(kind: string, config: unknown): StepTypeValidationResult;
  isKnown(kind: string): boolean;
  getKinds(): readonly string[];
  /**
   * Optional to preserve compatibility with existing custom registries in tests.
   */
  getExecutionProfile?(kind: string): StepKindExecutionProfile | undefined;
}

type StepKindRegistryEntry = {
  readonly schema: z.ZodType;
  readonly profile: StepKindExecutionProfile;
};

const ALL_PROVIDERS: readonly Provider[] = ['temporal', 'conductor', 'mock'];
const DEFAULT_PROFILE: StepKindExecutionProfile = {
  supportedAdapters: ALL_PROVIDERS,
  requiredCapabilities: [],
};

function isStepKindRegistryEntry(value: unknown): value is StepKindRegistryEntry {
  if (value === null || typeof value !== 'object') return false;
  const candidate = value as Partial<StepKindRegistryEntry>;
  return (
    candidate.schema !== undefined &&
    typeof candidate.schema === 'object' &&
    candidate.profile !== undefined
  );
}

function normalizeConfig(config: unknown): Record<string, unknown> {
  if (config !== null && typeof config === 'object' && !Array.isArray(config)) {
    return config as Record<string, unknown>;
  }
  return {};
}

function normalizeProfile(profile: StepKindExecutionProfile | undefined): StepKindExecutionProfile {
  if (profile === undefined) return DEFAULT_PROFILE;
  return {
    supportedAdapters: [...profile.supportedAdapters],
    requiredCapabilities: [...profile.requiredCapabilities],
  };
}

export class StepTypeRegistry implements IStepTypeRegistry {
  private readonly entries: ReadonlyMap<string, StepKindRegistryEntry>;

  constructor(
    schemasOrEntries: ReadonlyMap<string, z.ZodType | StepKindRegistryEntry>,
    profiles?: ReadonlyMap<string, StepKindExecutionProfile>
  ) {
    const normalized = new Map<string, StepKindRegistryEntry>();
    for (const [kind, value] of schemasOrEntries) {
      if (isStepKindRegistryEntry(value)) {
        normalized.set(kind, {
          schema: value.schema,
          profile: normalizeProfile(value.profile),
        });
        continue;
      }
      normalized.set(kind, {
        schema: value,
        profile: normalizeProfile(profiles?.get(kind)),
      });
    }
    this.entries = normalized;
  }

  validate(kind: string, config: unknown): StepTypeValidationResult {
    const entry = this.entries.get(kind);
    if (entry === undefined) {
      return { success: true, data: normalizeConfig(config) };
    }

    const result = entry.schema.safeParse(config ?? {});
    if (result.success) {
      return { success: true, data: result.data as Record<string, unknown> };
    }

    return {
      success: false,
      error: `INVALID_STEP_TYPE_CONFIG[${kind}]: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    };
  }

  isKnown(kind: string): boolean {
    return this.entries.has(kind);
  }

  getKinds(): readonly string[] {
    return Array.from(this.entries.keys());
  }

  getExecutionProfile(kind: string): StepKindExecutionProfile | undefined {
    return this.entries.get(kind)?.profile;
  }
}

export const DBT_MODEL = 'DBT_MODEL';
export const DBT_TEST = 'DBT_TEST';
export const DBT_SNAPSHOT = 'DBT_SNAPSHOT';

const DEFAULT_ENTRIES = new Map<string, StepKindRegistryEntry>([
  [DBT_MODEL, { schema: DbtStepTypeConfigSchema, profile: DEFAULT_PROFILE }],
  [DBT_TEST, { schema: DbtStepTypeConfigSchema, profile: DEFAULT_PROFILE }],
  [DBT_SNAPSHOT, { schema: DbtStepTypeConfigSchema, profile: DEFAULT_PROFILE }],
]);

export function createDefaultStepTypeRegistry(
  extensions?: ReadonlyMap<string, z.ZodType>,
  extensionProfiles?: ReadonlyMap<string, StepKindExecutionProfile>
): IStepTypeRegistry {
  const entries = new Map(DEFAULT_ENTRIES);
  if (extensions !== undefined) {
    for (const [kind, schema] of extensions) {
      entries.set(kind, {
        schema,
        profile: normalizeProfile(extensionProfiles?.get(kind)),
      });
    }
  }
  return new StepTypeRegistry(entries);
}

export function isStepKindSupportedByAdapter(
  registry: IStepTypeRegistry,
  kind: string,
  adapter: string
): boolean {
  const profile = registry.getExecutionProfile?.(kind);
  if (profile === undefined) return true;
  return profile.supportedAdapters.includes(adapter as Provider);
}

export function collectRequiredCapabilitiesForSteps(
  registry: IStepTypeRegistry,
  steps: readonly { kind: string }[]
): readonly string[] {
  const unique = new Set<string>();
  for (const step of steps) {
    const profile = registry.getExecutionProfile?.(step.kind);
    if (profile === undefined) continue;
    for (const capability of profile.requiredCapabilities) {
      unique.add(capability);
    }
  }
  return [...unique].sort((left, right) => left.localeCompare(right));
}
