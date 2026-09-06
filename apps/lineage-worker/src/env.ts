import { z } from 'zod';

const BOOLEAN_TRUE_VALUES = new Set(['true', '1', 'yes', 'y', 'on']);
const BOOLEAN_FALSE_VALUES = new Set(['false', '0', 'no', 'n', 'off']);

function explicitBooleanWithDefault(
  defaultValue: boolean
): z.ZodEffects<z.ZodBoolean, boolean, unknown> {
  return z.preprocess((value) => {
    if (value === undefined) {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (BOOLEAN_TRUE_VALUES.has(normalized)) {
        return true;
      }
      if (BOOLEAN_FALSE_VALUES.has(normalized)) {
        return false;
      }
    }
    return value;
  }, z.boolean());
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  DVT_PG_SCHEMA: z.string().default('dvt'),
  DVT_PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_PG_QUERY_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_ARTIFACT_S3_ENDPOINT: z.string().url().optional(),
  DVT_ARTIFACT_S3_REGION: z.string().min(1).optional(),
  DVT_ARTIFACT_S3_FORCE_PATH_STYLE: explicitBooleanWithDefault(false),
  DVT_ARTIFACT_FILE_READ_ROOT: z.string().min(1).optional(),
  /** Base URL for the OpenLineage / Marquez API. */
  DVT_LINEAGE_API_URL: z.string().url(),
  /** Namespace for all OpenLineage RunEvents emitted by this worker. */
  DVT_LINEAGE_NAMESPACE: z.string().default('dvt'),
  /** Optional Bearer token for the OpenLineage API. */
  DVT_LINEAGE_API_TOKEN: z.string().optional(),
  DVT_LINEAGE_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  DVT_LINEAGE_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  DVT_LINEAGE_ERROR_BACKOFF_MS: z.coerce.number().int().positive().default(10000),
  DVT_LINEAGE_DLQ_ALERT_TENANT_ID: z.string().trim().min(1).optional(),
  DVT_LINEAGE_DLQ_ALERT_THRESHOLD: z.coerce.number().int().min(0).default(0),
  DVT_LINEAGE_DLQ_AUTO_REPLAY_ENABLED: explicitBooleanWithDefault(false),
  DVT_LINEAGE_DLQ_AUTO_REPLAY_BATCH_SIZE: z.coerce.number().int().positive().default(25),
  DVT_LINEAGE_ADMIN_HOST: z.string().default('0.0.0.0'),
  DVT_LINEAGE_ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(9466),
  SERVICE_NAME: z.string().default('dvt-lineage-worker'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const result = EnvSchema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  return result.data;
}
