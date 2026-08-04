import {
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

function plan(scope = OWNERSHIP): ExecutionPlan {
  return {
    metadata: {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-08-04T00:00:00.000Z',
      ownership: OWNERSHIP,
    },
    steps: [
      {
        stepId: 'load-orders',
        kind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
        dependsOn: [],
        stepTypeConfig: {
          scope,
          source: {
            storageUri: `s3://dvt-fixtures/tenants/${OWNERSHIP.tenantId}/${SHA256}`,
            sha256: SHA256,
            sizeBytes: 128,
            maxBytes: 1_000_000,
            format: 'jsonl',
            mediaType: 'application/x-ndjson',
            encoding: 'utf-8',
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
          ],
        },
      },
    ],
  };
}

describe('stored object-file-to-Postgres step admission', () => {
  it('accepts a valid scoped plan and rejects a cross-scope stored plan', () => {
    expect(() => verifyStepTypeConfigsOrThrow({ plan: plan() })).not.toThrow();
    expect(() =>
      verifyStepTypeConfigsOrThrow({
        plan: plan({ ...OWNERSHIP, environmentId: 'prod' }),
      })
    ).toThrow(/scope/i);
  });

  it('rejects the scoped step when plan ownership is absent', () => {
    const planWithoutOwnership = plan();
    delete planWithoutOwnership.metadata.ownership;

    expect(() => verifyStepTypeConfigsOrThrow({ plan: planWithoutOwnership })).toThrow(
      /ownership/i
    );
  });
});
