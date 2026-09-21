import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  createDvtSubstraitSortDraft,
  projectDvtSetDraftToPostgresSql,
  removeDvtSubstraitSortFetchRelation,
  selectDvtSubstraitRelation,
} from '../src/index.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/set-documents.json', import.meta.url), 'utf8')
);

describe('selected wrapped Set projection', () => {
  it.each(['unionDistinctAggregate', 'unionDistinctWindow'])(
    'preserves admitted anchors, fields and SQL for %s',
    async (name) => {
      const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents[name]);
      const original = { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
      const before = globalThis.structuredClone(original);
      const root = original.sidecar.relations.reduce((left, right) =>
        left.relAnchor > right.relAnchor ? left : right
      );
      const fields = original.sidecar.fields.filter(
        (field) => field.relationId === root.relationId
      );
      const sorted = createDvtSubstraitSortDraft(original, {
        relationId: 'sort:selected',
        outputFieldIds: fields.map((_, index) => `sort:field:${index}`),
        keys: [{ fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST }],
      });
      const expected = await projectDvtSetDraftToPostgresSql(original);
      const selected = selectDvtSubstraitRelation(sorted, root.relationId);
      expect((await projectDvtSetDraftToPostgresSql(selected)).sql).toBe(expected.sql);
      const selectedSort = selectDvtSubstraitRelation(sorted, 'sort:selected');
      const unwrapped = removeDvtSubstraitSortFetchRelation(selectedSort, 'sort:selected');
      expect((await projectDvtSetDraftToPostgresSql(unwrapped)).sql).toBe(expected.sql);
      expect(selected.sidecar.fields).toEqual(original.sidecar.fields);
      expect(original).toEqual(before);
    }
  );
});
