import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { z } from 'zod';

const envBoolean = z.preprocess((value) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }
  return value;
}, z.boolean());

const nonBlankString = z.string().refine((value) => value.trim().length > 0, {
  message: 'must not be empty',
});

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    SERVICE_NAME: z.string().default('dvt-temporal-worker'),
    DATABASE_URL: nonBlankString,
    DVT_PG_SCHEMA: z.string().default('dvt'),
    DVT_PG_STATEMENT_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
    DVT_PG_QUERY_TIMEOUT_MS: z.coerce.number().int().min(0).default(0),
    DVT_RUNSTATE_CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().int().min(1).default(3),
    DVT_RUNSTATE_CIRCUIT_BREAKER_OPEN_DURATION_MS: z.coerce.number().int().min(1).default(10000),
    DVT_RUNSTATE_CIRCUIT_BREAKER_OPERATION_TIMEOUT_MS: z.coerce.number().int().min(1).default(2000),
    DVT_TEMPORAL_WORKER_RUN_MIGRATIONS: envBoolean.default(false),
    TEMPORAL_ADDRESS: nonBlankString,
    TEMPORAL_NAMESPACE: nonBlankString,
    TEMPORAL_TASK_QUEUE: nonBlankString,
    TEMPORAL_IDENTITY: z.string().optional(),
    TEMPORAL_CONNECT_TIMEOUT_MS: z.string().optional(),
    TEMPORAL_REQUEST_TIMEOUT_MS: z.string().optional(),
    TEMPORAL_MAX_START_PAYLOAD_BYTES: z.string().optional(),
    TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES: z.string().optional(),
    TEMPORAL_CONTINUE_AS_NEW_AFTER_LAYERS: z.string().optional(),
    DVT_TEMPORAL_ADMIN_HOST: z.string().default('0.0.0.0'),
    DVT_TEMPORAL_ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(9468),
    DVT_TEMPORAL_DBT_ENABLED: envBoolean.default(false),
    DVT_DBT_BIN: z.string().default('dbt'),
    DVT_DBT_WORKDIR_ROOT: z.string().default(join(tmpdir(), 'dvt', 'temporal-worker')),
    DVT_DBT_BUNDLE_STORE_BACKEND: z.enum(['file', 's3']).optional(),
    DVT_DBT_BUNDLE_S3_BUCKET: z.string().optional(),
    DVT_DBT_BUNDLE_FILE_ROOT: z.string().optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.DVT_TEMPORAL_DBT_ENABLED) {
      return;
    }

    if (input.DVT_DBT_BUNDLE_STORE_BACKEND === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DVT_DBT_BUNDLE_STORE_BACKEND'],
        message: 'required when DVT_TEMPORAL_DBT_ENABLED=true',
      });
      return;
    }

    if (input.DVT_DBT_BUNDLE_STORE_BACKEND === 's3') {
      if (
        input.DVT_DBT_BUNDLE_S3_BUCKET === undefined ||
        input.DVT_DBT_BUNDLE_S3_BUCKET.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DVT_DBT_BUNDLE_S3_BUCKET'],
          message: 'required when DVT_DBT_BUNDLE_STORE_BACKEND=s3',
        });
      }
      return;
    }

    if (
      input.DVT_DBT_BUNDLE_FILE_ROOT === undefined ||
      input.DVT_DBT_BUNDLE_FILE_ROOT.trim().length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DVT_DBT_BUNDLE_FILE_ROOT'],
        message: 'required when DVT_DBT_BUNDLE_STORE_BACKEND=file',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment: ${message}`);
  }

  return parsed.data;
}
