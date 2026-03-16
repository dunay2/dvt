import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.string().min(1),
  DVT_PG_SCHEMA: z.string().default('dvt'),
  DVT_PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_PG_QUERY_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
  DVT_PROJECTOR_BATCH_SIZE: z.coerce.number().int().positive().default(50),
  DVT_PROJECTOR_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  DVT_PROJECTOR_ERROR_BACKOFF_MS: z.coerce.number().int().positive().default(10000),
  DVT_PROJECTOR_ADMIN_HOST: z.string().default('0.0.0.0'),
  DVT_PROJECTOR_ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(9465),
  SERVICE_NAME: z.string().default('dvt-projector-worker'),
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
