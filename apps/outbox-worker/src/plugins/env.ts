import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return value;
}, z.boolean());

const envShardIdList = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return [];
    }
    return value.split(',').map((segment) => segment.trim());
  }
  return value;
}, z.array(z.coerce.number().int().nonnegative()));

const nonBlankString = z.string().refine((value) => value.trim().length > 0, {
  message: 'must not be empty',
});

const httpTargetUrl = z.string().refine(isValidHttpTargetUrl, {
  message: 'must be a valid http/https URL',
});

const CommonEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DVT_OUTBOX_OWNERSHIP_MODE: z.enum(['active', 'passive']),
  DVT_OUTBOX_ADMIN_HOST: z.string().default('0.0.0.0'),
  DVT_OUTBOX_ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(9464),
  SERVICE_NAME: z.string().default('dvt-outbox-worker'),
});

const ActiveCommonEnvSchema = CommonEnvSchema.extend({
  DVT_OUTBOX_OWNERSHIP_MODE: z.literal('active'),
  DATABASE_URL: nonBlankString,
  DVT_PG_SCHEMA: z.string().default('dvt'),
  DVT_PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_PG_QUERY_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_OUTBOX_SHARD_COUNT: z.coerce.number().int().positive().default(1),
  DVT_OUTBOX_OWNED_SHARD_IDS: envShardIdList.optional(),
  DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  DVT_OUTBOX_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: z.coerce.number().int().positive().default(5000),
  DVT_OUTBOX_WORKER_STOP_ON_ERROR: envBoolean.default(false),
  DVT_OUTBOX_WORKER_RUN_MIGRATIONS: envBoolean.default(false),
  DVT_PURGE_ENABLED: envBoolean.default(false),
  DVT_PURGE_INTERVAL_MS: z.coerce.number().int().positive().default(3_600_000),
  DVT_PURGE_DELIVERED_OUTBOX_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
  DVT_PURGE_OUTBOX_DEAD_LETTER_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  DVT_PURGE_LINEAGE_DEAD_LETTER_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  DVT_PURGE_MAX_ROWS_PER_RUN: z.coerce.number().int().positive().default(5_000),
  DVT_RUN_EVENT_RETENTION_ENABLED: envBoolean.default(false),
  DVT_RUN_EVENT_RETENTION_INITIAL_DELAY_MS: z.coerce.number().int().min(0).default(30_000),
  DVT_RUN_EVENT_RETENTION_INTERVAL_MS: z.coerce.number().int().positive().default(3_600_000),
  DVT_RUN_EVENT_RETENTION_HOT_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  DVT_RUN_EVENT_RETENTION_ARCHIVE_BUCKET_COUNT: z.coerce.number().int().positive().default(64),
  DVT_RUN_EVENT_RETENTION_PIN_TERMINAL_SNAPSHOTS: envBoolean.default(true),
  DVT_RUN_EVENT_RETENTION_ARCHIVE_DIRECTORY: nonBlankString.default('.dvt/archive'),
  DVT_OUTBOX_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  DVT_OUTBOX_HTTP_BEARER_TOKEN: z.string().optional(),
});

const ActiveHttpEnvSchema = ActiveCommonEnvSchema.extend({
  DVT_OUTBOX_EVENT_BUS_MODE: z.literal('http'),
  DVT_OUTBOX_HTTP_TARGET_URL: httpTargetUrl,
});

const ActiveLogEnvSchema = ActiveCommonEnvSchema.extend({
  DVT_OUTBOX_EVENT_BUS_MODE: z.literal('log'),
});

const ActiveEnvSchema = z.discriminatedUnion('DVT_OUTBOX_EVENT_BUS_MODE', [
  ActiveHttpEnvSchema,
  ActiveLogEnvSchema,
]);

const PassiveEnvSchema = CommonEnvSchema.extend({
  DVT_OUTBOX_OWNERSHIP_MODE: z.literal('passive'),
});

const OwnershipModeSchema = CommonEnvSchema.pick({
  DVT_OUTBOX_OWNERSHIP_MODE: true,
});

type ParsedActiveHttpEnv = z.infer<typeof ActiveHttpEnvSchema>;
type ParsedActiveLogEnv = z.infer<typeof ActiveLogEnvSchema>;
type ParsedActiveEnv = ParsedActiveHttpEnv | ParsedActiveLogEnv;
type WithOwnedShardIds<T> = Omit<T, 'DVT_OUTBOX_OWNED_SHARD_IDS'> & {
  DVT_OUTBOX_OWNED_SHARD_IDS: readonly number[];
};

export type ActiveEnv =
  | WithOwnedShardIds<ParsedActiveHttpEnv>
  | WithOwnedShardIds<ParsedActiveLogEnv>;
export type ActiveHttpEnv = WithOwnedShardIds<ParsedActiveHttpEnv>;
export type ActiveLogEnv = WithOwnedShardIds<ParsedActiveLogEnv>;
export type PassiveEnv = z.infer<typeof PassiveEnvSchema>;
export type Env = ActiveEnv | PassiveEnv;

interface ActiveEnvWithOwnedShardIds {
  DVT_OUTBOX_OWNED_SHARD_IDS: readonly number[];
}

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const ownershipMode = OwnershipModeSchema.safeParse(input);
  if (!ownershipMode.success) {
    throw new Error(`Invalid environment: ${formatIssues(ownershipMode.error.issues)}`);
  }

  const normalizedInput =
    ownershipMode.data.DVT_OUTBOX_OWNERSHIP_MODE === 'active' &&
    input.DVT_OUTBOX_EVENT_BUS_MODE === undefined
      ? { ...input, DVT_OUTBOX_EVENT_BUS_MODE: 'http' }
      : input;

  if (ownershipMode.data.DVT_OUTBOX_OWNERSHIP_MODE === 'passive') {
    const parsed = PassiveEnvSchema.safeParse(normalizedInput);
    if (!parsed.success) {
      throw new Error(`Invalid environment: ${formatIssues(parsed.error.issues)}`);
    }
    return parsed.data;
  }

  const parsed = ActiveEnvSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${formatIssues(parsed.error.issues)}`);
  }
  return normalizeActiveEnv(parsed.data);
}

export function isActiveEnv(env: Env): env is ActiveEnv {
  return env.DVT_OUTBOX_OWNERSHIP_MODE === 'active';
}

function formatIssues(issues: readonly z.ZodIssue[]): string {
  return issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}

function isValidHttpTargetUrl(value: string): boolean {
  if (value.trim().length === 0) {
    return false;
  }

  try {
    const parsed = new globalThis.URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeActiveEnv(env: ParsedActiveEnv): ActiveEnv {
  validateRunEventRetentionConfiguration(env);

  const ownedShardIds =
    env.DVT_OUTBOX_OWNED_SHARD_IDS ?? (env.DVT_OUTBOX_SHARD_COUNT === 1 ? [0] : null);

  if (ownedShardIds === null) {
    throw new Error(
      'Invalid environment: DVT_OUTBOX_OWNED_SHARD_IDS: required when DVT_OUTBOX_SHARD_COUNT is greater than 1'
    );
  }
  if (ownedShardIds.length === 0) {
    throw new Error(
      'Invalid environment: DVT_OUTBOX_OWNED_SHARD_IDS: must include at least one shard id'
    );
  }

  const normalizedShardIds = [...ownedShardIds].sort((left, right) => left - right);
  const uniqueShardIds = new Set(normalizedShardIds);
  if (uniqueShardIds.size !== normalizedShardIds.length) {
    throw new Error(
      'Invalid environment: DVT_OUTBOX_OWNED_SHARD_IDS: duplicate shard ids are not allowed'
    );
  }

  const outOfRangeShardId = normalizedShardIds.find(
    (shardId) => shardId >= env.DVT_OUTBOX_SHARD_COUNT
  );
  if (outOfRangeShardId !== undefined) {
    throw new Error(
      `Invalid environment: DVT_OUTBOX_OWNED_SHARD_IDS: shard id ${outOfRangeShardId} is outside 0..${env.DVT_OUTBOX_SHARD_COUNT - 1}`
    );
  }

  const normalizedEnv: ActiveEnvWithOwnedShardIds = {
    ...env,
    DVT_OUTBOX_OWNED_SHARD_IDS: normalizedShardIds,
  };

  return normalizedEnv as ActiveEnv;
}

function validateRunEventRetentionConfiguration(env: ParsedActiveEnv): void {
  if (env.NODE_ENV === 'production' && env.DVT_RUN_EVENT_RETENTION_ENABLED) {
    process.emitWarning(
      'DVT_RUN_EVENT_RETENTION_ENABLED is active in production with filesystem archive storage. This mode risks data loss across node restarts/replacements.',
      {
        code: 'DVT_RUN_EVENT_RETENTION_PROD_FILESYSTEM',
      }
    );
  }
}
