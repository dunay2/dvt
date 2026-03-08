import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string(),
  DVT_PG_SCHEMA: z.string().default('dvt'),
  DVT_PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_PG_QUERY_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_OUTBOX_WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  DVT_OUTBOX_WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS: z.coerce.number().int().positive().default(5000),
  DVT_OUTBOX_WORKER_STOP_ON_ERROR: z.coerce.boolean().default(false),
  DVT_OUTBOX_EVENT_BUS_MODE: z.enum(['log']).default('log'),
  SERVICE_NAME: z.string().default('dvt-outbox-worker'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Invalid environment: ${msg}`);
  }
  return parsed.data;
}
