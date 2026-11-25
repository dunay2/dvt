import { describe, expect, it } from 'vitest';

import { TransformDataSampleResponseSchema } from '../src/contracts/canvas/TransformDataSample.v1.js';
import { TransformSqlProjectionResponseSchema } from '../src/contracts/canvas/TransformSqlProjection.v1.js';

const identity = {
  canvasId: 'canvas',
  transformNodeId: 'literal-model',
  draftRevision: 'r1',
  semanticPlanSha256: 'a'.repeat(64),
};
const connectionRef = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse',
  provider: 'postgres',
};
const literalModel = { connectionRef, semanticPlanSha256: identity.semanticPlanSha256 };
const provenance = { sourceRefs: [], literalModel };
const samples = [
  {
    kind: 'rows',
    schema: TransformDataSampleResponseSchema,
    value: {
      ...identity,
      contractVersion: 1,
      columns: [{ name: 'comprobacion_editor_sql', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      provenance: {
        ...provenance,
        mode: 'live',
        queriedAt: '2026-11-25T00:00:00.000Z',
        limit: 20,
        navigation: 'bounded-first-page',
      },
    },
  },
  {
    kind: 'sql',
    schema: TransformSqlProjectionResponseSchema,
    value: {
      ...identity,
      schemaVersion: 'canvas-transform-sql-projection.v1',
      sql: 'SELECT 1 AS comprobacion_editor_sql',
      provenance,
    },
  },
];

describe.each(samples)('literal Model $kind provenance', ({ schema, value }) => {
  it('admits the exact connection and semantic digest without claiming a physical source', () => {
    expect(schema.parse(value).provenance).toMatchObject(provenance);
  });

  it.each([
    { literalModel: undefined },
    { literalModel: { ...literalModel, semanticPlanSha256: 'b'.repeat(64) } },
    {
      literalModel: { ...literalModel, connectionRef: { ...connectionRef, provider: 'snowflake' } },
    },
    {
      sourceRefs: [
        { schemaVersion: 'connected-source-ref.v1', connectionRef, sourceObjectId: 'raw.orders' },
      ],
    },
    {
      modelRefs: [
        {
          canvasId: 'files',
          uniqueId: 'model.project.orders',
          contentSetSha256: 'b'.repeat(64),
          analysisSha256: 'c'.repeat(64),
        },
      ],
    },
  ])('refuses missing, contradictory or stale authority: %j', (change) => {
    expect(
      schema.safeParse({ ...value, provenance: { ...value.provenance, ...change } }).success
    ).toBe(false);
  });
});
