import { describe, expect, it } from 'vitest';

import {
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DvtOperationalWorkloadContract,
  DvtOperationalWorkloadContractV2,
  createDvtPostgresOutputSchemaDigestV1,
  type DvtOperationalWorkloadV2,
} from '../src/index.js';

const SEMANTIC_DIGEST = 'a'.repeat(64);

function buildWorkload(): DvtOperationalWorkloadV2 {
  const schemaDigestSha256 = createDvtPostgresOutputSchemaDigestV1({
    schemaVersion: 'dvt-postgres-output-schema.v1',
    columns: [
      {
        ordinal: 0,
        name: 'order_id',
        postgresType: 'bigint',
        nullable: true,
        defaultExpression: null,
        generatedExpression: null,
        collation: null,
      },
    ],
    constraints: [],
    indexes: [],
  });

  return {
    schemaVersion: 'dvt-operational-workload.v2',
    executionIntent: 'run',
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    graph: {
      draftRevision: 'revision-7',
      canvasId: 'canvas-a',
      selectedNodeIds: ['source-a', 'transform-a'],
      selectedEdgeIds: ['source-transform'],
    },
    semantics: [
      {
        transformNodeId: 'transform-a',
        semanticPlanSha256: SEMANTIC_DIGEST,
        profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
      },
    ],
    targetProjection: {
      profileId: DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
      toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
      semanticPlanSha256: SEMANTIC_DIGEST,
      schemaDigestSha256,
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: 'b'.repeat(64),
        storageUri: `s3://dvt-artifacts/tenants/tenant-a/${'b'.repeat(64)}`,
        sizeBytes: 128,
        encoding: 'utf-8',
      },
    },
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-a',
      provider: 'postgres',
    },
    output: {
      kind: 'transform-result',
      nodeId: 'transform-a',
      disposition: 'table',
      target: {
        schemaVersion: 'dvt-transform-result-target.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        schema: 'analytics',
        relation: 'orders_result',
      },
      publicationPolicy: 'postgres-stable-table-publication.v1',
    },
    publicationBoundaries: [],
  };
}

describe('DVT operational Run workload v2', () => {
  it('binds one table result to its exact target and expected schema', () => {
    const workload = buildWorkload();
    const parsed = DvtOperationalWorkloadContractV2.schema.parse(workload);

    expect(parsed.executionIntent).toBe('run');
    expect(parsed.output).toEqual(workload.output);
    expect(parsed.publicationBoundaries).toEqual([]);
    expect(DvtOperationalWorkloadContract.schema.parse(workload)).toEqual(parsed);
  });

  it('keeps the output-schema digest deterministic and order-sensitive', () => {
    const schema = {
      schemaVersion: 'dvt-postgres-output-schema.v1' as const,
      columns: [
        {
          ordinal: 0,
          name: 'order_id',
          postgresType: 'bigint' as const,
          nullable: true,
          defaultExpression: null,
          generatedExpression: null,
          collation: null,
        },
        {
          ordinal: 1,
          name: 'country',
          postgresType: 'text' as const,
          nullable: true,
          defaultExpression: null,
          generatedExpression: null,
          collation: null,
        },
      ],
      constraints: [] as [],
      indexes: [] as [],
    };

    expect(createDvtPostgresOutputSchemaDigestV1(schema)).toBe(
      createDvtPostgresOutputSchemaDigestV1({
        ...schema,
        columns: schema.columns.map((column) => ({ ...column })),
      })
    );
    expect(
      createDvtPostgresOutputSchemaDigestV1({
        ...schema,
        columns: schema.columns
          .slice()
          .reverse()
          .map((column, ordinal) => ({ ...column, ordinal })),
      })
    ).not.toBe(createDvtPostgresOutputSchemaDigestV1(schema));
  });

  it.each([
    [
      'a target on another connection',
      (value: DvtOperationalWorkloadV2) => ({
        ...value,
        output: {
          ...value.output,
          target: {
            ...value.output.target,
            connectionRef: { ...value.output.target.connectionRef, connectionId: 'warehouse-b' },
          },
        },
      }),
    ],
    [
      'a non-empty publication boundary',
      (value: DvtOperationalWorkloadV2) => ({
        ...value,
        publicationBoundaries: [{ kind: 'sink' }],
      }),
    ],
    [
      'a view disposition',
      (value: DvtOperationalWorkloadV2) => ({
        ...value,
        output: { ...value.output, disposition: 'view' },
      }),
    ],
    ['an unknown member', (value: DvtOperationalWorkloadV2) => ({ ...value, sql: 'select 1' })],
  ])('rejects %s', (_label, mutate) => {
    expect(DvtOperationalWorkloadContractV2.schema.safeParse(mutate(buildWorkload())).success).toBe(
      false
    );
  });
});
