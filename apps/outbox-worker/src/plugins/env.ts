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

const CommonEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DVT_OUTBOX_OWNERSHIP_MODE: z.enum(['active', 'passive']),
  DVT_OUTBOX_ADMIN_HOST: z.string().default('0.0.0.0'),
  DVT_OUTBOX_ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(9464),
  SERVICE_NAME: z.string().default('dvt-outbox-worker'),
});

const ActiveCommonEnvSchema = CommonEnvSchema.extend({
  DVT_OUTBOX_OWNERSHIP_MODE: z.literal('active'),
  DATABASE_URL: z.string(),
  DVT_PG_SCHEMA: z.string().default('dvt'),
  DVT_PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_PG_QUERY_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  DVT_OUTBOX_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: z.coerce.number().int().positive().default(5000),
  DVT_OUTBOX_WORKER_STOP_ON_ERROR: envBoolean.default(false),
  DVT_OUTBOX_WORKER_RUN_MIGRATIONS: envBoolean.default(false),
  DVT_OUTBOX_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  DVT_OUTBOX_HTTP_BEARER_TOKEN: z.string().optional(),
});

const ActiveHttpEnvSchema = ActiveCommonEnvSchema.extend({
  DVT_OUTBOX_EVENT_BUS_MODE: z.literal('http'),
  DVT_OUTBOX_HTTP_TARGET_URL: z.string().min(1),
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

export type ActiveEnv = z.infer<typeof ActiveEnvSchema>;
export type PassiveEnv = z.infer<typeof PassiveEnvSchema>;
export type Env = ActiveEnv | PassiveEnv;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const ownershipMode = OwnershipModeSchema.safeParse(input);
  if (!ownershipMode.success) {
    throw new Error(`Invalid environment: ${formatIssues(ownershipMode.error.issues)}`);
  }

  const normalizedInput =
    ownershipMode.data.DVT_OUTBOX_OWNERSHIP_MODE === 'active' && input.DVT_OUTBOX_EVENT_BUS_MODE === undefined
      ? { ...input, DVT_OUTBOX_EVENT_BUS_MODE: 'http' }
      : input;

  const parsed =
    ownershipMode.data.DVT_OUTBOX_OWNERSHIP_MODE === 'passive'
      ? PassiveEnvSchema.safeParse(normalizedInput)
      : ActiveEnvSchema.safeParse(normalizedInput);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${formatIssues(parsed.error.issues)}`);
  }
  return parsed.data;
}

export function isActiveEnv(env: Env): env is ActiveEnv {
  return env.DVT_OUTBOX_OWNERSHIP_MODE === 'active';
}

function formatIssues(issues: readonly z.ZodIssue[]): string {
  return issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
}
