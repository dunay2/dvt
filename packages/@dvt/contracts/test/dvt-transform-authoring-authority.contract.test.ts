import { describe, expect, it } from 'vitest';

import { DvtTransformAuthoringAuthorityV1Schema } from '../src/index.js';

import { buildDvtSubstraitSemanticDocumentFixture } from './fixtures/dvtSubstraitSemanticDocument.js';

describe('DvtTransformAuthoringAuthorityV1 contract', () => {
  it('accepts canonical Substrait authority and rejects retired authoring modes', () => {
    const semanticDocument = buildDvtSubstraitSemanticDocumentFixture();
    expect(
      DvtTransformAuthoringAuthorityV1Schema.parse({
        version: 'v1',
        mode: 'substrait',
        semanticDocument,
      })
    ).toEqual({ version: 'v1', mode: 'substrait', semanticDocument });

    for (const authority of [
      { version: 'v1', mode: 'sql' },
      { version: 'v1', mode: 'visual', recipe: { version: 'v1', outputs: [], filters: [] } },
      { version: 'v1', mode: 'substrait', semanticDocument, sql: 'select 1' },
    ]) {
      expect(DvtTransformAuthoringAuthorityV1Schema.safeParse(authority).success).toBe(false);
    }
  });
});
