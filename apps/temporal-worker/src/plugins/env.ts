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
    DVT_POSTGRES_CREDENTIAL_BINDINGS: z.string().trim().min(2).optional(),
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
    TEMPORAL_STEP_ACTIVITY_ROUTES: z.string().optional(),
    DVT_TEMPORAL_ADMIN_HOST: z.string().default('0.0.0.0'),
    DVT_TEMPORAL_ADMIN_PORT: z.coerce.number().int().min(1).max(65535).default(9468),
    DVT_TEMPORAL_DBT_ENABLED: envBoolean.default(false),
    DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED: envBoolean.default(false),
    DVT_TEMPORAL_HTTP_JSON_ENABLED: envBoolean.default(false),
    DVT_HTTP_JSON_ENDPOINTS: z.string().optional(),
    DVT_HTTP_JSON_AUTH_TOKENS: z.string().optional(),
    DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF: z.string().optional(),
    DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE: envBoolean.default(false),
    DVT_HTTP_JSON_CA_FILE: z.string().optional(),
    DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF: z.string().optional(),
    DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF: z.string().optional(),
    DVT_OBJECT_FILE_S3_ENDPOINT: z.string().url().optional(),
    DVT_OBJECT_FILE_S3_REGION: nonBlankString.optional(),
    DVT_OBJECT_FILE_S3_FORCE_PATH_STYLE: envBoolean.default(false),
    DVT_DBT_BIN: z.string().default('dbt'),
    DVT_DBT_WORKDIR_ROOT: z.string().default(join(tmpdir(), 'dvt', 'temporal-worker')),
    DVT_DBT_BUNDLE_STORE_BACKEND: z.enum(['file', 's3']).optional(),
    DVT_DBT_BUNDLE_S3_BUCKET: z.string().optional(),
    DVT_DBT_BUNDLE_FILE_ROOT: z.string().optional(),
  })
  .superRefine((input, ctx) => {
    if (input.DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE && input.NODE_ENV === 'production') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DVT_HTTP_JSON_ALLOW_LOOPBACK_FIXTURE'],
        message: 'loopback fixture access is forbidden in production',
      });
    }

    if (input.DVT_TEMPORAL_HTTP_JSON_ENABLED) {
      validateJsonBindings(
        input.DVT_HTTP_JSON_ENDPOINTS,
        'DVT_HTTP_JSON_ENDPOINTS',
        'http-endpoint:',
        true,
        ctx
      );
      if (input.DVT_HTTP_JSON_AUTH_TOKENS !== undefined) {
        validateJsonBindings(
          input.DVT_HTTP_JSON_AUTH_TOKENS,
          'DVT_HTTP_JSON_AUTH_TOKENS',
          'http-auth:',
          false,
          ctx
        );
      }
      validateCredentialBinding(
        input.DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF,
        'DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF',
        'object-store:',
        ctx
      );
    }

    if (input.DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED) {
      validateCredentialBinding(
        input.DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF,
        'DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF',
        'object-store:',
        ctx
      );
      validateCredentialBinding(
        input.DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF,
        'DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF',
        'postgres:',
        ctx
      );
    }

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

function validateCredentialBinding(
  value: string | undefined,
  field:
    | 'DVT_OBJECT_FILE_SOURCE_CREDENTIAL_REF'
    | 'DVT_OBJECT_FILE_POSTGRES_TARGET_CREDENTIAL_REF'
    | 'DVT_HTTP_JSON_ARTIFACT_CREDENTIAL_REF',
  namespace: 'object-store:' | 'postgres:',
  ctx: z.RefinementCtx
): void {
  if (value === undefined || value.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [field],
      message: `required when DVT_TEMPORAL_OBJECT_FILE_POSTGRES_ENABLED=true`,
    });
    return;
  }

  if (!value.startsWith(namespace)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [field],
      message: `must use the ${namespace.slice(0, -1)} namespace`,
    });
  }
}

function validateJsonBindings(
  value: string | undefined,
  field: 'DVT_HTTP_JSON_ENDPOINTS' | 'DVT_HTTP_JSON_AUTH_TOKENS',
  keyPrefix: 'http-endpoint:' | 'http-auth:',
  requireHttps: boolean,
  ctx: z.RefinementCtx
): void {
  if (value === undefined || value.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [field],
      message: `required when DVT_TEMPORAL_HTTP_JSON_ENABLED=true`,
    });
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = undefined;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'must be a JSON object' });
    return;
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: 'must not be empty' });
    return;
  }
  for (const [key, binding] of entries) {
    if (!key.startsWith(keyPrefix) || typeof binding !== 'string' || binding.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `keys must use ${keyPrefix} and values must be non-empty strings`,
      });
      continue;
    }
    if (requireHttps) {
      try {
        const endpoint = new globalThis.URL(binding);
        if (
          endpoint.protocol !== 'https:' ||
          endpoint.username.length > 0 ||
          endpoint.password.length > 0 ||
          endpoint.hash.length > 0
        ) {
          throw new Error('invalid HTTPS endpoint');
        }
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'endpoint bindings must be credential-free https URLs',
        });
      }
    }
  }
}

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
