import { describe, expect, it } from 'vitest';

import {
  ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES,
  ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
  ArtifactAcquisitionEvidenceSchema,
  HttpJsonArtifactStepTypeConfigSchema,
  createDefaultStepTypeRegistry,
  validateHttpJsonObjectFileHandoff,
} from '../src/index.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;
const SHA256 = 'a'.repeat(64);
const STORAGE_URI = `s3://dvt-fixtures/tenants/${SCOPE.tenantId}/${SHA256}`;

function config(format: 'json' | 'jsonl' = 'jsonl'): Record<string, unknown> {
  return {
    scope: SCOPE,
    request: {
      method: 'GET',
      endpointRef: 'http-endpoint:orders-snapshot',
      headers: {
        accept: format === 'json' ? 'application/json' : 'application/x-ndjson',
      },
      authCredentialRef: 'http-auth:orders-snapshot',
    },
    response: {
      acceptedStatus: 200,
      format,
      mediaType: format === 'json' ? 'application/json' : 'application/x-ndjson',
      encoding: 'utf-8',
      expectedSha256: SHA256,
      expectedSizeBytes: 128,
      maxBytes: 1_000_000,
    },
    artifact: {
      storageUri: STORAGE_URI,
      credentialRef: 'object-store:het2-artifacts',
    },
    limits: {
      connectTimeoutMs: 2_000,
      requestTimeoutMs: 10_000,
      maxRedirects: 2,
    },
  };
}

function withRequest(patch: Record<string, unknown>): Record<string, unknown> {
  const value = config();
  return { ...value, request: { ...(value.request as Record<string, unknown>), ...patch } };
}

function withResponse(patch: Record<string, unknown>): Record<string, unknown> {
  const value = config();
  return { ...value, response: { ...(value.response as Record<string, unknown>), ...patch } };
}

function withArtifact(patch: Record<string, unknown>): Record<string, unknown> {
  const value = config();
  return { ...value, artifact: { ...(value.artifact as Record<string, unknown>), ...patch } };
}

describe('HttpJsonArtifactStepTypeConfigSchema', () => {
  it.each([
    ['JSON', config('json')],
    ['JSON Lines', config('jsonl')],
  ])('accepts one bounded %s acquisition', (_label, value) => {
    expect(HttpJsonArtifactStepTypeConfigSchema.safeParse(value).success).toBe(true);
  });

  it.each([
    ['arbitrary URL', withRequest({ url: 'https://example.test/orders' })],
    ['HTTP scheme encoded in endpoint ref', withRequest({ endpointRef: 'http://example.test' })],
    ['wrong method', withRequest({ method: 'POST' })],
    ['inline body', withRequest({ body: '{}' })],
    ['inline authorization', withRequest({ authorization: 'Bearer secret' })],
    ['secret header', withRequest({ headers: { authorization: 'Bearer secret' } })],
    ['cookie header', withRequest({ headers: { cookie: 'session=secret' } })],
    ['host header', withRequest({ headers: { host: 'metadata.internal' } })],
    ['raw credential', withRequest({ authCredentialRef: 'secret-token' })],
    ['wrong credential namespace', withRequest({ authCredentialRef: 'object-store:source' })],
    ['unexpected status', withResponse({ acceptedStatus: 201 })],
    ['unsupported media type', withResponse({ mediaType: 'text/plain' })],
    ['format/media mismatch', withResponse({ format: 'json', mediaType: 'application/x-ndjson' })],
    ['content above declared limit', withResponse({ expectedSizeBytes: 2_000_000 })],
    [
      'content above contract limit',
      withResponse({
        expectedSizeBytes: ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES + 1,
        maxBytes: ACQUIRE_HTTP_JSON_ARTIFACT_MAX_BYTES + 1,
      }),
    ],
    ['malformed digest', withResponse({ expectedSha256: 'not-a-digest' })],
    ['non-content-addressed key', withArtifact({ storageUri: 's3://dvt-fixtures/orders.jsonl' })],
    [
      'cross-tenant key',
      withArtifact({ storageUri: `s3://dvt-fixtures/tenants/tenant-b/${SHA256}` }),
    ],
    ['wrong artifact credential namespace', withArtifact({ credentialRef: 'http-auth:orders' })],
    [
      'unbounded redirects',
      {
        ...config(),
        limits: { connectTimeoutMs: 2_000, requestTimeoutMs: 10_000, maxRedirects: 20 },
      },
    ],
    [
      'request shorter than connect timeout',
      {
        ...config(),
        limits: { connectTimeoutMs: 10_000, requestTimeoutMs: 2_000, maxRedirects: 2 },
      },
    ],
    ['unknown top-level field', { ...config(), responseBody: '{}' }],
  ])('rejects %s', (_label, value) => {
    expect(HttpJsonArtifactStepTypeConfigSchema.safeParse(value).success).toBe(false);
  });
});

describe('ACQUIRE_HTTP_JSON_ARTIFACT registry profile', () => {
  const registry = createDefaultStepTypeRegistry();

  it('registers the canonical kind with an independent Temporal capability', () => {
    expect(registry.isKnown(ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND)).toBe(true);
    expect(registry.getExecutionProfile?.(ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND)).toEqual({
      supportedAdapters: ['temporal'],
      requiredCapabilities: ['executor.http-json-acquisition'],
    });
  });

  it('requires exact plan ownership without changing HET1 or DBT profiles', () => {
    expect(
      registry.validate(ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND, config(), {
        planOwnership: SCOPE,
      }).success
    ).toBe(true);
    expect(registry.validate(ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND, config()).success).toBe(false);
    expect(
      registry.validate(ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND, config(), {
        planOwnership: { ...SCOPE, environmentId: 'prod' },
      }).success
    ).toBe(false);
    expect(
      registry.getExecutionProfile?.('LOAD_OBJECT_FILE_TO_POSTGRES')?.requiredCapabilities
    ).toEqual(['executor.object-file-postgres-load']);
    expect(registry.getExecutionProfile?.('DBT_MODEL')?.requiredCapabilities).toEqual([
      'executor.dbt',
    ]);
  });
});

describe('HTTP JSON to HET1 artifact handoff', () => {
  const loadConfig = {
    scope: SCOPE,
    source: {
      storageUri: STORAGE_URI,
      sha256: SHA256,
      sizeBytes: 128,
      maxBytes: 1_000_000,
      format: 'jsonl' as const,
      mediaType: 'application/x-ndjson' as const,
      encoding: 'utf-8' as const,
      credentialRef: 'object-store:het2-artifacts',
    },
    target: {
      dialect: 'postgres' as const,
      schema: 'staging' as const,
      relation: 'orders',
      loadMode: 'replace' as const,
      credentialRef: 'postgres:het2-staging',
    },
    columns: [
      {
        sourceField: 'order_id',
        targetColumn: 'order_id',
        dataType: 'bigint' as const,
        nullable: false,
      },
    ],
  };

  it('accepts only an exact JSON Lines artifact identity', () => {
    expect(validateHttpJsonObjectFileHandoff(config(), loadConfig)).toBeUndefined();
    const otherSha256 = 'b'.repeat(64);
    expect(
      validateHttpJsonObjectFileHandoff(
        {
          ...withResponse({ expectedSha256: otherSha256 }),
          artifact: {
            ...config().artifact,
            storageUri: `s3://het2-artifacts/tenants/${SCOPE.tenantId}/${otherSha256}`,
          },
        },
        loadConfig
      )
    ).toMatch(/storageUri/i);
    expect(validateHttpJsonObjectFileHandoff(config('json'), loadConfig)).toMatch(/JSON Lines/i);
  });
});

describe('ArtifactAcquisitionEvidenceSchema', () => {
  it('accepts receipt metadata and rejects response bytes or endpoint URLs', () => {
    const receipt = {
      evidenceType: 'artifact-acquisition',
      environmentId: SCOPE.environmentId,
      endpointRef: 'http-endpoint:orders-snapshot',
      artifact: {
        storageUri: STORAGE_URI,
        sha256: SHA256,
        sizeBytes: 128,
        mediaType: 'application/x-ndjson',
      },
      publicationOutcome: 'created',
      statusCode: 200,
      redirectCount: 0,
      startedAt: '2026-08-05T00:00:00.000Z',
      completedAt: '2026-08-05T00:00:00.100Z',
      durationMs: 100,
    };

    expect(ArtifactAcquisitionEvidenceSchema.safeParse(receipt).success).toBe(true);
    expect(
      ArtifactAcquisitionEvidenceSchema.safeParse({ ...receipt, responseBody: '{"secret":true}' })
        .success
    ).toBe(false);
    expect(
      ArtifactAcquisitionEvidenceSchema.safeParse({
        ...receipt,
        endpointUrl: 'https://example.test/orders',
      }).success
    ).toBe(false);
  });
});
