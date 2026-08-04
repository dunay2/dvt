import {
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

function config(reverseInsertionOrder = false): Record<string, unknown> {
  const entries: Array<readonly [string, unknown]> = [
    ['scope', OWNERSHIP],
    [
      'source',
      {
        storageUri: `s3://dvt-fixtures/tenants/${OWNERSHIP.tenantId}/${SHA256}`,
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
    ],
    [
      'target',
      {
        dialect: 'postgres',
        schema: 'staging',
        relation: 'orders_import',
        loadMode: 'replace',
        credentialRef: 'postgres:het1-staging',
      },
    ],
    [
      'columns',
      [
        {
          sourceField: 'order_id',
          targetColumn: 'order_id',
          dataType: 'bigint',
          nullable: false,
        },
      ],
    ],
  ];
  return Object.fromEntries(reverseInsertionOrder ? entries.reverse() : entries);
}

function input(stepTypeConfig: Record<string, unknown>): PlannerInputEnvelopeV1 {
  return {
    graphSource: {
      kind: GENERIC_GRAPH_SOURCE_KIND,
      sourceFamily: 'het-object-file',
      sourceVersion: '1.0.0',
      nodes: [
        {
          nodeId: 'load-orders',
          stepKind: LOAD_OBJECT_FILE_TO_POSTGRES_STEP_KIND,
          dependsOn: [],
          stepTypeConfig,
        },
      ],
    },
    selection: { selectedNodeIds: ['load-orders'] },
    ownership: OWNERSHIP,
  };
}

describe('Planner object-file-to-Postgres admission', () => {
  it('projects the executor capability and keeps canonical identity stable', async () => {
    const planner = new Planner();
    const first = await planner.buildPlan(input(config()));
    const reordered = await planner.buildPlan(input(config(true)));

    expect(first.executionPolicy.requiresCapabilities).toEqual([
      'executor.object-file-postgres-load',
    ]);
    expect(first.plan.metadata.planId).toBe(reordered.plan.metadata.planId);
    expect(first.canonicalPlanCoreJson).toBe(reordered.canonicalPlanCoreJson);
  });

  it('rejects a step whose target scope differs from plan ownership', async () => {
    const crossScopeConfig = config();
    crossScopeConfig.scope = { ...OWNERSHIP, environmentId: 'prod' };

    await expect(new Planner().buildPlan(input(crossScopeConfig))).rejects.toMatchObject({
      code: 'INVALID_STEP_CONFIG',
      message: expect.stringContaining('scope'),
    });
  });
});
