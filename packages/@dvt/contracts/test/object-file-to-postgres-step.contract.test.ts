import { describe, expect, it } from 'vitest';

import {
  LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  LoadObjectFileToPostgresStepTypeConfigSchema,
  createDefaultStepTypeRegistry,
} from '../src/index.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

const SHA256 = 'a'.repeat(64);

function csvConfig(): Record<string, unknown> {
  return {
    scope: SCOPE,
    source: {
      storageUri: `s3://dvt-fixtures/tenants/${SCOPE.tenantId}/${SHA256}`,
      sha256: SHA256,
      sizeBytes: 128,
      maxBytes: 1_000_000,
      format: 'csv',
      mediaType: 'text/csv',
      encoding: 'utf-8',
      header: true,
      delimiter: ',',
      credentialRef: 'object-store:het1-fixture',
    },
    target: {
      dialect: 'postgres',
      schema: 'staging',
      relation: 'orders_import',
      loadMode: 'replace',
      credentialRef: 'postgres:het1-staging',
    },
    columns: [
      {
        sourceField: 'order_id',
        targetColumn: 'order_id',
        dataType: 'bigint',
        nullable: false,
      },
      {
        sourceField: 'amount',
        targetColumn: 'amount',
        dataType: 'numeric',
        nullable: true,
      },
    ],
  };
}

function jsonLinesConfig(): Record<string, unknown> {
  const config = csvConfig();
  const {
    header: _header,
    delimiter: _delimiter,
    ...commonSource
  } = config.source as Record<string, unknown>;
  return {
    ...config,
    source: {
      ...commonSource,
      format: 'jsonl',
      mediaType: 'application/x-ndjson',
    },
  };
}

function withSource(patch: Record<string, unknown>): Record<string, unknown> {
  const config = csvConfig();
  return {
    ...config,
    source: { ...(config.source as Record<string, unknown>), ...patch },
  };
}

function withTarget(patch: Record<string, unknown>): Record<string, unknown> {
  const config = csvConfig();
  return {
    ...config,
    target: { ...(config.target as Record<string, unknown>), ...patch },
  };
}

function withoutSourceField(field: string): Record<string, unknown> {
  const config = csvConfig();
  const source = { ...(config.source as Record<string, unknown>) };
  delete source[field];
  return { ...config, source };
}

describe('LoadObjectFileToPostgresStepTypeConfigSchema', () => {
  it.each([
    ['CSV', csvConfig()],
    ['JSON Lines', jsonLinesConfig()],
  ])('accepts one bounded %s object load', (_label, config) => {
    expect(LoadObjectFileToPostgresStepTypeConfigSchema.safeParse(config).success).toBe(true);
  });

  it.each([
    ['unsupported format', withSource({ format: 'parquet' })],
    ['unsupported encoding', withSource({ encoding: 'utf-16' })],
    ['format/media-type mismatch', withSource({ mediaType: 'application/json' })],
    ['malformed digest', withSource({ sha256: 'not-a-digest' })],
    ['missing digest', withoutSourceField('sha256')],
    [
      'object above contract limit',
      withSource({ sizeBytes: LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES + 1 }),
    ],
    [
      'declared limit above contract limit',
      withSource({ maxBytes: LOAD_OBJECT_FILE_TO_POSTGRES_MAX_BYTES + 1 }),
    ],
    ['object above declared limit', withSource({ sizeBytes: 2_000_000, maxBytes: 1_000_000 })],
    ['arbitrary HTTPS URL', withSource({ storageUri: `https://example.test/${SHA256}` })],
    ['arbitrary filesystem path', withSource({ storageUri: 'C:\\imports\\orders.csv' })],
    [
      'non-content-addressed object key',
      withSource({ storageUri: 's3://dvt-fixtures/orders.csv' }),
    ],
    ['unsupported load mode', withTarget({ loadMode: 'append' })],
    ['non-staging target', withTarget({ schema: 'public' })],
    ['invalid target identifier', withTarget({ relation: 'Orders Import' })],
    ['raw connection string', withTarget({ connectionString: 'postgres://user:secret@db/dvt' })],
    ['inline object bytes', withSource({ bytes: 'order_id,amount' })],
    ['inline credential', withSource({ credentialRef: 'secret-password' })],
    ['wrong source credential namespace', withSource({ credentialRef: 'postgres:het1-staging' })],
    [
      'wrong target credential namespace',
      withTarget({ credentialRef: 'object-store:het1-fixture' }),
    ],
    [
      'missing execution scope',
      (() => {
        const config = csvConfig();
        delete config.scope;
        return config;
      })(),
    ],
    ['unknown top-level field', { ...csvConfig(), sql: 'copy staging.orders_import' }],
    [
      'duplicate target mapping',
      {
        ...csvConfig(),
        columns: [
          { sourceField: 'order_id', targetColumn: 'id', dataType: 'bigint', nullable: false },
          { sourceField: 'legacy_id', targetColumn: 'id', dataType: 'bigint', nullable: false },
        ],
      },
    ],
  ])('rejects %s', (_label, config) => {
    expect(LoadObjectFileToPostgresStepTypeConfigSchema.safeParse(config).success).toBe(false);
  });
});

describe('LOAD_OBJECT_FILE_TO_POSTGRES registry profile', () => {
  const registry = createDefaultStepTypeRegistry();

  it('registers the canonical kind for Temporal with a dedicated executor capability', () => {
    expect(registry.isKnown(LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND)).toBe(true);
    expect(registry.getExecutionProfile?.(LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND)).toEqual({
      supportedAdapters: ['temporal'],
      requiredCapabilities: ['executor.object-file-postgres-load'],
    });
  });

  it('accepts matching plan ownership and rejects absent or cross-scope ownership', () => {
    expect(
      registry.validate(LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND, csvConfig(), {
        planOwnership: SCOPE,
      }).success
    ).toBe(true);
    expect(registry.validate(LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND, csvConfig()).success).toBe(
      false
    );
    expect(
      registry.validate(LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND, csvConfig(), {
        planOwnership: { ...SCOPE, projectId: 'project-b' },
      }).success
    ).toBe(false);
  });

  it('keeps DBT execution independent from the retired SQL-first profile', () => {
    expect(registry.getExecutionProfile?.('DBT_MODEL')?.requiredCapabilities).toEqual([
      'executor.dbt',
    ]);
    expect(registry.getExecutionProfile?.('POSTGRES_SQL_TRANSFORM')).toBeUndefined();
  });
});
