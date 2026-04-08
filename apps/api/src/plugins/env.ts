import { z } from 'zod';

const strictTrueBoolean = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
  return false;
}, z.boolean());

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Railway injects PORT. We still keep a sane default for local runs.
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  // Railway: set this to your Vercel domain (comma-separated allowed)
  // Example: https://dbf.vercel.app,https://dbf-staging.vercel.app
  CORS_ORIGIN: z.string().default('*'),
  // Postgres connection string used by /db/ready (and later persistence)
  DATABASE_URL: z.string().optional(),
  DVT_PG_SCHEMA: z.string().default('dvt'),
  DVT_PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_PG_QUERY_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_START_RUN_BACKPRESSURE_MODE: z.enum(['off', 'observe', 'enforce']).default('off'),
  DVT_START_RUN_MAX_PENDING_EVENTS_PER_TENANT: z.coerce.number().int().positive().default(100),
  DVT_START_RUN_MAX_OUTBOX_LAG_MS: z.coerce.number().int().positive().default(300000),
  DVT_START_RUN_STUCK_EVENT_AGE_THRESHOLD_MS: z.coerce.number().int().positive().default(604800000),
  DVT_START_RUN_BACKPRESSURE_QUERY_TIMEOUT_MS: z.coerce.number().int().positive().default(1000),
  DVT_START_RUN_BACKPRESSURE_CACHE_TTL_MS: z.coerce.number().int().positive().default(2000),
  DVT_START_RUN_RETRY_AFTER_SECONDS: z.coerce.number().int().positive().default(30),
  DVT_OUTBOX_SHARD_COUNT: z.coerce.number().int().positive().default(1),
  DVT_INTENT_RECONCILER_ENABLED: strictTrueBoolean.default(false),
  DVT_INTENT_RECONCILER_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
  DVT_INTENT_RECONCILER_ORPHAN_THRESHOLD_MS: z.coerce.number().int().positive().default(300000),
  DVT_INTENT_RECONCILER_LIMIT: z.coerce.number().int().positive().default(50),
  DVT_INTENT_RECONCILER_BACKOFF_BASE_MS: z.coerce.number().int().positive().default(1000),
  DVT_INTENT_RECONCILER_BACKOFF_MAX_MS: z.coerce.number().int().positive().default(60000),
  DVT_INTENT_RECONCILER_TICK_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  DVT_INTENT_RECONCILER_PROVIDERS: z.string().default('mock'),
  SERVICE_NAME: z.string().default('dbf-api'),
  OBS_ENABLED: strictTrueBoolean.default(false),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_RESOURCE_ATTRIBUTES: z.string().optional(),
  // Temporal -- optional; when set, the Temporal adapter is registered alongside mock
  TEMPORAL_ADDRESS: z.string().optional(),
  TEMPORAL_NAMESPACE: z.string().optional(),
  TEMPORAL_TASK_QUEUE: z.string().optional(),
  TEMPORAL_IDENTITY: z.string().optional(),
  TEMPORAL_CONNECT_TIMEOUT_MS: z.string().optional(),
  TEMPORAL_REQUEST_TIMEOUT_MS: z.string().optional(),
  TEMPORAL_MAX_START_PAYLOAD_BYTES: z.string().optional(),
  TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: z.string().optional(),
  // OIDC / auth -- all three required together when auth is enabled
  OIDC_JWKS_URI: z.string().optional(),
  OIDC_ISSUER: z.string().optional(),
  OIDC_AUDIENCE: z.string().optional(),
  OIDC_ALGORITHMS: z.string().default('RS256'),
  // Route exposure policy -- off by default; enable explicitly per deployment
  DVT_READYZ_ENABLED: strictTrueBoolean.default(false),
  DVT_VERSION_ENABLED: strictTrueBoolean.default(false),
  DVT_DB_READY_ENABLED: strictTrueBoolean.default(false),
  // Admin routes (snapshot repair, etc.) -- disabled by default; never expose publicly
  DVT_ADMIN_ROUTES_ENABLED: strictTrueBoolean.default(false),
  // Compatibility switch: allow CANCEL through /signal while /cancel coexists.
  DVT_SIGNAL_ROUTE_ALLOW_CANCEL: strictTrueBoolean.default(true),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  return parsed.data;
}
