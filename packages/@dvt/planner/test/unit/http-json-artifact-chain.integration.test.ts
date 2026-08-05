import {
  ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
  GENERIC_GRAPH_SOURCE_KIND,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  type PlannerInputEnvelopeV1,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { Planner } from '../../src/domain/Planner.js';

const OWNERSHIP = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;
const SHA256 = 'a'.repeat(64);
const STORAGE_URI = `s3://het2-artifacts/tenants/${OWNERSHIP.tenantId}/${SHA256}`;

function acquisitionConfig() {
  return {
    scope: OWNERSHIP,
    request: {
      method: 'GET' as const,
      endpointRef: 'http-endpoint:orders-snapshot',
      headers: { accept: 'application/x-ndjson' as const },
      authCredentialRef: 'http-auth:orders-snapshot',
    },
    response: {
      acceptedStatus: 200 as const,
      format: 'jsonl' as const,
      mediaType: 'application/x-ndjson' as const,
      encoding: 'utf-8' as const,
      expectedSha256: SHA256,
      expectedSizeBytes: 128,
      maxBytes: 1_000_000,
    },
    artifact: {
      storageUri: STORAGE_URI,
      credentialRef: 'object-store:het2-artifacts',
    },
    limits: {
      connectTimeoutMs: 1_000,
      requestTimeoutMs: 5_000,
      maxRedirects: 1,
    },
  };
}

function loadConfig(storageUri = STORAGE_URI) {
  return {
    scope: OWNERSHIP,
    source: {
      storageUri,
      sha256: storageUri.slice(-64),
      sizeBytes: 128,
      maxBytes: 1_000_000,
      format: 'jsonl' as const,
      mediaType: 'application/x-ndjson' as const,
      encoding: 'utf-8' as const,
      credentialRef: 'object-store:het2-artifacts',
    },
    target: {
      dialect: 'postgres' as const,
      schema: 'staging',
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
}

function input(loadStorageUri = STORAGE_URI): PlannerInputEnvelopeV1 {
  return {
    graphSource: {
      kind: GENERIC_GRAPH_SOURCE_KIND,
      sourceFamily: 'het2-public-rest-artifact-dbt',
      sourceVersion: '1.0.0',
      nodes: [
        {
          nodeId: 'acquire-orders',
          stepKind: ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
          dependsOn: [],
          stepTypeConfig: acquisitionConfig(),
        },
        {
          nodeId: 'load-orders',
          stepKind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
          dependsOn: ['acquire-orders'],
          stepTypeConfig: loadConfig(loadStorageUri),
        },
        {
          nodeId: 'model-orders',
          stepKind: 'DBT_MODEL',
          dependsOn: ['load-orders'],
          stepTypeConfig: {},
        },
        {
          nodeId: 'test-orders',
          stepKind: 'DBT_TEST',
          dependsOn: ['model-orders'],
          stepTypeConfig: {},
        },
      ],
    },
    selection: { selectedNodeIds: ['test-orders'] },
    ownership: OWNERSHIP,
  };
}

describe('Planner HET2 acquisition-to-dbt admission', () => {
  it('admits the exact four-step chain and projects independently composed capabilities', async () => {
    const result = await new Planner().buildPlan(input());

    expect(result.plan.steps.map((step) => step.kind)).toEqual([
      ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
      LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
      'DBT_MODEL',
      'DBT_TEST',
    ]);
    expect(result.executionPolicy.requiresCapabilities).toEqual([
      'executor.dbt',
      'executor.http-json-acquisition',
      'executor.object-file-postgres-load',
    ]);
  });

  it('rejects a direct handoff whose immutable artifact identity differs', async () => {
    const otherSha256 = 'b'.repeat(64);
    const otherStorageUri = `s3://het2-artifacts/tenants/${OWNERSHIP.tenantId}/${otherSha256}`;

    await expect(new Planner().buildPlan(input(otherStorageUri))).rejects.toMatchObject({
      code: 'INVALID_STEP_CONFIG',
      message: expect.stringContaining('handoff'),
    });
  });
});
