import { describe, expect, it } from 'vitest';

import { DvtTransformAuthoringAuthorityV1Schema } from '../src/index.js';

const PLAN_SHA256 = '14b79e6263d90848e17e90613d5e5bf2dacdbd08eb6508847b197e7351342ecc';
const SEMANTIC_DOCUMENT = {
  schemaVersion: 'dvt-substrait-semantic-document.v1',
  profile: {
    schemaVersion: 'dvt-substrait-profile.v1',
    profileId: 'dvt.vtx2.substrait.v1',
    specVersion: '0.101.0',
    specCommitSha: '2653e55516c8c07529cde9bc81c64e4ae3537515',
  },
  semanticPlan: {
    encoding: 'substrait-plan-protobuf-base64',
    bytesBase64:
      'MkQQZSIoMjY1M2U1NTUxNmM4YzA3NTI5Y2RlOWJjODFjNjRlNGFlMzUzNzUxNSoWZHZ0LXZ0eDItY29udHJhY3QtdGVzdFICCAE=',
    sha256: PLAN_SHA256,
  },
  sidecar: {
    schemaVersion: 'dvt-substrait-authoring-sidecar.v1',
    semanticPlanSha256: PLAN_SHA256,
    relations: [{ relationId: 'rel-result', relAnchor: 1 }],
    fields: [],
  },
} as const;

describe('DvtTransformAuthoringAuthorityV1 contract', () => {
  it('accepts canonical Substrait authority and rejects retired authoring modes', () => {
    expect(
      DvtTransformAuthoringAuthorityV1Schema.parse({
        version: 'v1',
        mode: 'substrait',
        semanticDocument: SEMANTIC_DOCUMENT,
      })
    ).toEqual({ version: 'v1', mode: 'substrait', semanticDocument: SEMANTIC_DOCUMENT });

    for (const authority of [
      { version: 'v1', mode: 'sql' },
      { version: 'v1', mode: 'visual', recipe: { version: 'v1', outputs: [], filters: [] } },
      { version: 'v1', mode: 'substrait', semanticDocument: SEMANTIC_DOCUMENT, sql: 'select 1' },
    ]) {
      expect(DvtTransformAuthoringAuthorityV1Schema.safeParse(authority).success).toBe(false);
    }
  });
});
