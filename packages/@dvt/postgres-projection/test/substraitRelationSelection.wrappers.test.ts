import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
} from '@dvt/contracts';
import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import { createDvtSubstraitSortDraft, removeDvtSubstraitSortFetchRelation } from '../src/index.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/set-documents.json', import.meta.url), 'utf8')
);

describe('canonical selected wrapped Set document', () => {
  it.each(['unionDistinctAggregate', 'unionDistinctWindow'])(
    'preserves complete Substrait and field identity for %s',
    (name) => {
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
      const selected = selectDvtSubstraitRelation(sorted, root.relationId);
      expect(selected.plan).toEqual(original.plan);
      const selectedSort = selectDvtSubstraitRelation(sorted, 'sort:selected');
      const unwrapped = removeDvtSubstraitSortFetchRelation(selectedSort, 'sort:selected');
      expect(unwrapped.plan).toEqual(original.plan);
      for (const candidate of [selected, unwrapped]) {
        expect(candidate.sidecar.relations).toEqual(original.sidecar.relations);
        expect(candidate.sidecar.fields).toEqual(original.sidecar.fields);
        const semanticPlan = encodeDvtSubstraitPlanV1(candidate.plan);
        expect(semanticPlan.bytesBase64).toBe(document.semanticPlan.bytesBase64);
        expect(decodeDvtSubstraitPlanV1({ ...document, semanticPlan })).toEqual(candidate.plan);
      }
      expect(original).toEqual(before);
    }
  );
});
