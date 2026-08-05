import {
  ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  type ExecutionPlan,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import { verifyStepTypeConfigsOrThrow } from '../src/stepTypeConfig.js';

const OWNERSHIP = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;
const SHA256 = 'a'.repeat(64);
const STORAGE_URI = `s3://het2-artifacts/tenants/${OWNERSHIP.tenantId}/${SHA256}`;

function plan(loadStorageUri = STORAGE_URI): ExecutionPlan {
  return {
    metadata: {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-08-05T00:00:00.000Z',
      ownership: OWNERSHIP,
    },
    steps: [
      {
        stepId: 'acquire-orders',
        kind: ACQUIRE_HTTP_JSON_ARTIFACT_STEP_KIND,
        dependsOn: [],
        stepTypeConfig: {
          scope: OWNERSHIP,
          request: {
            method: 'GET',
            endpointRef: 'http-endpoint:orders-snapshot',
            headers: { accept: 'application/x-ndjson' },
          },
          response: {
            acceptedStatus: 200,
            format: 'jsonl',
            mediaType: 'application/x-ndjson',
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
            connectTimeoutMs: 1_000,
            requestTimeoutMs: 5_000,
            maxRedirects: 1,
          },
        },
      },
      {
        stepId: 'load-orders',
        kind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
        dependsOn: ['acquire-orders'],
        stepTypeConfig: {
          scope: OWNERSHIP,
          source: {
            storageUri: loadStorageUri,
            sha256: loadStorageUri.slice(-64),
            sizeBytes: 128,
            maxBytes: 1_000_000,
            format: 'jsonl',
            mediaType: 'application/x-ndjson',
            encoding: 'utf-8',
            credentialRef: 'object-store:het2-artifacts',
          },
          target: {
            dialect: 'postgres',
            schema: 'staging',
            relation: 'orders',
            loadMode: 'replace',
            credentialRef: 'postgres:het2-staging',
          },
          columns: [
            {
              sourceField: 'order_id',
              targetColumn: 'order_id',
              dataType: 'bigint',
              nullable: false,
            },
          ],
        },
      },
    ],
  };
}

describe('stored HTTP JSON artifact step admission', () => {
  it('accepts an exact handoff and rejects a different immutable identity', () => {
    expect(() => verifyStepTypeConfigsOrThrow({ plan: plan() })).not.toThrow();

    const otherSha256 = 'b'.repeat(64);
    expect(() =>
      verifyStepTypeConfigsOrThrow({
        plan: plan(`s3://het2-artifacts/tenants/${OWNERSHIP.tenantId}/${otherSha256}`),
      })
    ).toThrow(/handoff/i);
  });
});
