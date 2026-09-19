import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  projectDvtJoinDraftToPostgresSql,
  selectDvtSubstraitRelation,
  type DvtSubstraitJoinDraft,
} from '../src/index.js';

const fixtures = JSON.parse(
  readFileSync(new URL('./fixtures/inner-join-documents.json', import.meta.url), 'utf8')
);
function fixture(): DvtSubstraitJoinDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(fixtures.three);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

describe('selected relation query projection', () => {
  it('projects the intermediate JOIN with only its own inputs and outputs without mutating authoring', async () => {
    const original = fixture();
    const before = globalThis.structuredClone(original);
    const joins = original.sidecar.relations.filter((relation) => relation.sourceRef == null);
    const selected = selectDvtSubstraitRelation(original, joins[0]!.relationId);
    const result = await projectDvtJoinDraftToPostgresSql(selected);
    expect(result.projection.inputs).toHaveLength(2);
    expect(result.sql.match(/\bJOIN\b/g)).toHaveLength(1);
    expect(result.sql).not.toContain('raw.order_details');
    expect(result.projection.outputs.map((output) => output.name)).toEqual([
      'order_id',
      'client_id',
      'client_client_id',
      'country',
    ]);
    expect(selected.sidecar.relations.map((relation) => relation.relationId)).toContain(
      joins[0]!.relationId
    );
    expect(original).toEqual(before);
    const final = await projectDvtJoinDraftToPostgresSql(
      selectDvtSubstraitRelation(original, joins[1]!.relationId)
    );
    expect(final.projection.inputs).toHaveLength(3);
    expect(final.sql.match(/\bJOIN\b/g)).toHaveLength(2);
  });

  it.each(['foreign relation', 'stale plan', 'duplicate anchor'])(
    'fails closed for %s',
    (reason) => {
      const candidate = fixture();
      const id = candidate.sidecar.relations.find(
        (relation) => relation.sourceRef == null
      )!.relationId;
      if (reason === 'stale plan') candidate.sidecar.semanticPlanSha256 = 'a'.repeat(64);
      if (reason === 'duplicate anchor')
        candidate.sidecar.relations[1]!.relAnchor = candidate.sidecar.relations[0]!.relAnchor;
      expect(() =>
        selectDvtSubstraitRelation(candidate, reason === 'foreign relation' ? 'foreign' : id)
      ).toThrow();
    }
  );
});
