import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { DvtSubstraitSemanticDocumentV1Schema, decodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { DvtSubstraitJoinDraft } from '../src/substraitJoinReadModel.js';
import {
  createDvtSubstraitFetchDraft,
  createDvtSubstraitSortDraft,
  inspectDvtSubstraitSortFetchRoot,
} from '../src/substraitSortFetch.js';

const documents = JSON.parse(
  readFileSync(new URL('./fixtures/set-documents.json', import.meta.url), 'utf8')
) as Record<string, unknown>;

function baseDraft(): DvtSubstraitJoinDraft {
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(documents['unionDistinct']);
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

function ids(prefix: string): Readonly<{ relationId: string; outputFieldIds: readonly string[] }> {
  return {
    relationId: `dvt_rel_01a0ba77-367f-7abc-8abc-${prefix.padEnd(12, '0')}`,
    outputFieldIds: [
      `dvt_fld_01a0ba77-367f-7abc-8abc-${prefix.padEnd(11, '0')}1`,
      `dvt_fld_01a0ba77-367f-7abc-8abc-${prefix.padEnd(11, '0')}2`,
    ],
  };
}

describe('Substrait SortRel and FetchRel bounded profile', () => {
  it('authors and inspects ordered stable FieldId keys without using aliases as identity', () => {
    const base = baseDraft();
    const root = base.plan.relations[0]?.relType;
    expect(root?.case).toBe('root');
    if (root?.case !== 'root' || root.value.input == null) throw new Error('fixture root missing');
    const binding = base.sidecar.relations.find(
      (candidate) => candidate.relAnchor === root.value.input?.relType.value.common?.relAnchor
    );
    const fields = base.sidecar.fields
      .filter((field) => field.relationId === binding?.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal);

    const draft = createDvtSubstraitSortDraft(base, {
      ...ids('sort'),
      keys: [
        { fieldId: fields[1]!.fieldId, direction: SortField_SortDirection.DESC_NULLS_LAST },
        { fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_FIRST },
      ],
    });

    expect(inspectDvtSubstraitSortFetchRoot(draft)).toMatchObject({
      ok: true,
      operation: 'sort',
      keys: [
        { fieldId: fields[1]!.fieldId, direction: SortField_SortDirection.DESC_NULLS_LAST },
        { fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_FIRST },
      ],
    });
  });

  it('keeps offset and count exact beyond JavaScript safe integer precision', () => {
    const draft = createDvtSubstraitFetchDraft(baseDraft(), {
      ...ids('fetch'),
      offset: 9_007_199_254_740_993n,
      count: 9_223_372_036_854_775_807n,
    });
    expect(inspectDvtSubstraitSortFetchRoot(draft)).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: 9_007_199_254_740_993n,
      count: 9_223_372_036_854_775_807n,
    });
  });

  it('distinguishes an absent count from count zero', () => {
    const unlimited = createDvtSubstraitFetchDraft(baseDraft(), {
      ...ids('empty'),
      offset: 0n,
    });
    const empty = createDvtSubstraitFetchDraft(baseDraft(), {
      ...ids('zero'),
      count: 0n,
    });
    expect(inspectDvtSubstraitSortFetchRoot(unlimited)).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: 0n,
      count: null,
    });
    expect(inspectDvtSubstraitSortFetchRoot(empty)).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: null,
      count: 0n,
    });
  });

  it('rejects empty Sort, clustered direction, negative Fetch, and stale FieldIds', () => {
    expect(() => createDvtSubstraitSortDraft(baseDraft(), { ...ids('none'), keys: [] })).toThrow();
    const base = baseDraft();
    const inputRelation = base.sidecar.relations.at(-1)!;
    const inputField = base.sidecar.fields.find(
      (field) => field.relationId === inputRelation.relationId
    )!;
    expect(() =>
      createDvtSubstraitSortDraft(base, {
        ...ids('bad'),
        keys: [{ fieldId: inputField.fieldId, direction: SortField_SortDirection.CLUSTERED }],
      })
    ).toThrow();
    expect(() =>
      createDvtSubstraitSortDraft(baseDraft(), {
        ...ids('lost'),
        keys: [
          {
            fieldId: 'dvt_fld_01a0ba77-367f-7abc-8abc-000000000000',
            direction: SortField_SortDirection.ASC_NULLS_LAST,
          },
        ],
      })
    ).toThrow();
    expect(() =>
      createDvtSubstraitFetchDraft(baseDraft(), { ...ids('neg'), offset: -1n })
    ).toThrow();
  });
});
