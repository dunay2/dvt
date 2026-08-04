import { createHash } from 'node:crypto';

import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
  parseExecutionPlan,
  type ExecutionPlan,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';

export interface ObjectFilePostgresPlanFixtureInput {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly storageUri: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly relation: string;
}

export function createObjectFilePostgresExecutionPlan(
  input: ObjectFilePostgresPlanFixtureInput
): ExecutionPlan {
  const steps = [
    {
      stepId: 'load-orders',
      kind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
      dependsOn: [],
      stepTypeConfig: {
        scope: {
          tenantId: input.tenantId,
          projectId: input.projectId,
          environmentId: input.environmentId,
        },
        source: {
          storageUri: input.storageUri,
          sha256: input.sha256,
          sizeBytes: input.sizeBytes,
          maxBytes: 1_000_000,
          format: 'csv',
          mediaType: 'text/csv',
          encoding: 'utf-8',
          header: true,
          delimiter: ',',
          credentialRef: 'object-store:het1-source',
        },
        target: {
          dialect: 'postgres',
          schema: 'staging',
          relation: input.relation,
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
          {
            sourceField: 'active',
            targetColumn: 'active',
            dataType: 'boolean',
            nullable: false,
          },
        ],
        stepTimeoutMs: 30_000,
        concurrency: { maxInFlight: 1 },
      },
    },
  ];
  const inputHashSha256 = sha256Hex(`object-file-postgres:${input.sha256}:${input.relation}`);
  const planId = sha256Hex(
    jcsCanonicalize({
      metadata: { planVersion: CURRENT_EXECUTION_PLAN_VERSION, inputHashSha256 },
      steps,
    })
  );

  return parseExecutionPlan({
    metadata: {
      planId,
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256,
      createdAtIso: '2026-08-04T00:00:00.000Z',
      ownership: {
        tenantId: input.tenantId,
        projectId: input.projectId,
        environmentId: input.environmentId,
      },
    },
    steps,
  });
}

export function sha256Hex(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}
