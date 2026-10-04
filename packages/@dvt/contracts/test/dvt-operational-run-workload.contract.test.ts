import { describe, expect, it } from 'vitest';

import * as contracts from '../src/index.js';
import {
  DVT_POSTGRES_JOIN_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DvtOperationalWorkloadContractV1,
  createDvtPostgresOutputSchemaDigestV1,
  type DvtOperationalRunWorkloadV1,
} from '../src/index.js';

const SEMANTIC_DIGEST = 'a'.repeat(64);

function buildWorkload(): DvtOperationalRunWorkloadV1 {
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
    schemaVersion: 'dvt-operational-workload.v1',
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

describe('DVT operational Run intent under the single V1 contract', () => {
  it('does not publish a second version or a compatibility contract', () => {
    for (const name of [
      'DvtOperationalWorkloadContractV2',
      'DvtOperationalWorkloadV2Schema',
      'DvtOperationalWorkloadContract',
    ]) {
      expect(contracts).not.toHaveProperty(name);
    }
  });

  it('binds one table result to its exact target and expected schema', () => {
    const workload = buildWorkload();
    const parsed = DvtOperationalWorkloadContractV1.schema.parse(workload);

    expect(parsed.executionIntent).toBe('run');
    expect(parsed.output).toEqual(workload.output);
    expect(parsed).toHaveProperty('publicationBoundaries', []);
  });

  it('normalizes the historical INNER profile while reading a Run workload', () => {
    const workload = buildWorkload();
    const parsed = DvtOperationalWorkloadContractV1.schema.parse({
      ...workload,
      graph: {
        ...workload.graph,
        selectedNodeIds: ['source-customers', 'source-orders', 'transform-a'],
        selectedEdgeIds: ['customers-transform', 'orders-transform'],
      },
      targetProjection: {
        ...workload.targetProjection,
        profileId: 'dvt.vtx2.postgres.inner-join.v1',
      },
    });

    expect(parsed.targetProjection.profileId).toBe(DVT_POSTGRES_JOIN_PROFILE_ID);
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
      (value: DvtOperationalRunWorkloadV1) => ({
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
      (value: DvtOperationalRunWorkloadV1) => ({
        ...value,
        publicationBoundaries: [{ kind: 'sink' }],
      }),
    ],
    [
      'a view disposition',
      (value: DvtOperationalRunWorkloadV1) => ({
        ...value,
        output: { ...value.output, disposition: 'view' },
      }),
    ],
    ['an unknown member', (value: DvtOperationalRunWorkloadV1) => ({ ...value, sql: 'select 1' })],
    [
      'the retired V2 wire format',
      (value: DvtOperationalRunWorkloadV1) => ({
        ...value,
        schemaVersion: 'dvt-operational-workload.v2',
      }),
    ],
    [
      'an absent intent',
      (value: DvtOperationalRunWorkloadV1) => ({ ...value, executionIntent: undefined }),
    ],
    [
      'a preview intent with a durable output',
      (value: DvtOperationalRunWorkloadV1) => ({ ...value, executionIntent: 'preview' }),
    ],
    [
      'a missing schema digest',
      (value: DvtOperationalRunWorkloadV1) => ({
        ...value,
        targetProjection: { ...value.targetProjection, schemaDigestSha256: undefined },
      }),
    ],
  ])('rejects %s', (_label, mutate) => {
    expect(DvtOperationalWorkloadContractV1.schema.safeParse(mutate(buildWorkload())).success).toBe(
      false
    );
  });
});
