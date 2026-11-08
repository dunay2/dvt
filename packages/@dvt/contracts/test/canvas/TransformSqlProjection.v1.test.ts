import { describe, expect, it } from 'vitest';

import {
  TransformSqlProjectionRequestSchema,
  TransformSqlProjectionResponseSchema,
} from '../../src/contracts/canvas/TransformSqlProjection.v1.js';

const request = {
  canvasId: 'canvas',
  transformNodeId: 'model',
  semanticPlanSha256: 'a'.repeat(64),
};
const response = {
  schemaVersion: 'canvas-transform-sql-projection.v1',
  ...request,
  draftRevision: 'draft-revision',
  sql: 'select amount from raw.orders',
  provenance: {
    sourceRefs: [],
    modelRefs: [
      {
        canvasId: 'files',
        uniqueId: 'model.demo.orders',
        contentSetSha256: 'b'.repeat(64),
        analysisSha256: 'c'.repeat(64),
      },
    ],
  },
};

describe('Transform SQL inspection contract', () => {
  it('carries authorized projection identity without accepting executable client input', () => {
    expect(TransformSqlProjectionRequestSchema.parse(request)).toEqual(request);
    expect(TransformSqlProjectionResponseSchema.parse(response)).toEqual(response);
    expect(
      TransformSqlProjectionRequestSchema.safeParse({ ...request, sql: 'select 1' }).success
    ).toBe(false);
    expect(TransformSqlProjectionResponseSchema.safeParse({ ...response, rows: [] }).success).toBe(
      false
    );
    expect(
      TransformSqlProjectionResponseSchema.safeParse({ ...response, credentialRef: 'private' })
        .success
    ).toBe(false);
  });

  it.each([undefined, '', 'not-a-digest', 'A'.repeat(64)])(
    'rejects absent or malformed expected revision %s',
    (semanticPlanSha256) => {
      expect(
        TransformSqlProjectionRequestSchema.safeParse({ ...request, semanticPlanSha256 }).success
      ).toBe(false);
    }
  );

  it('requires nonblank SQL, a draft revision and real source or model provenance', () => {
    expect(TransformSqlProjectionResponseSchema.safeParse({ ...response, sql: '  ' }).success).toBe(
      false
    );
    expect(
      TransformSqlProjectionResponseSchema.safeParse({ ...response, draftRevision: '' }).success
    ).toBe(false);
    expect(
      TransformSqlProjectionResponseSchema.safeParse({
        ...response,
        provenance: { sourceRefs: [] },
      }).success
    ).toBe(false);
  });
});
