import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  decodeDvtSubstraitPlanV1,
  DvtSubstraitSemanticDocumentV1Schema,
  encodeDvtSubstraitPlanV1,
} from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import {
  projectDvtJoinDraftToPostgresSql,
  projectDvtSetDraftToPostgresSql,
  type DvtSubstraitJoinDraft,
} from '../src/index.js';

function fixture(base: 'join' | 'set', wrapper: 'aggregate' | 'window'): DvtSubstraitJoinDraft {
  const file =
    base === 'set'
      ? 'set-documents'
      : `${wrapper === 'aggregate' ? 'grouped' : 'windowed'}-left-join-document`;
  const json = JSON.parse(
    readFileSync(new URL(`./fixtures/${file}.json`, import.meta.url), 'utf8')
  );
  const document = DvtSubstraitSemanticDocumentV1Schema.parse(
    base === 'set'
      ? json[wrapper === 'aggregate' ? 'unionDistinctAggregate' : 'unionDistinctWindow']
      : json
  );
  return { plan: decodeDvtSubstraitPlanV1(document), sidecar: document.sidecar };
}

function invalidateGrouping(draft: DvtSubstraitJoinDraft): void {
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root') throw new Error('Expected canonical root');
  const relation = root.value.input?.relType;
  const aggregate = relation?.case === 'project' ? relation.value.input?.relType : relation;
  if (aggregate?.case !== 'aggregate') throw new Error('Expected canonical aggregate');
  aggregate.value.groupings[0]!.expressionReferences = [1];
  draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
}

describe.each(['join', 'set'] as const)('shared %s wrapper admission', (base) => {
  const project =
    base === 'join' ? projectDvtJoinDraftToPostgresSql : projectDvtSetDraftToPostgresSql;

  it.each(['aggregate', 'window'] as const)(
    'projects %s without mutating canonical identity',
    async (wrapper) => {
      const draft = fixture(base, wrapper);
      const before = globalThis.structuredClone(draft);
      const result = await project(draft);
      expect(result.sql).toContain('count(*)');
      expect(result.projection.outputs).toHaveLength(wrapper === 'window' ? 3 : 2);
      expect(draft).toEqual(before);
    }
  );

  it.each(['aggregate', 'window'] as const)(
    'rejects invalid %s grouping with a current hash',
    async (wrapper) => {
      const draft = fixture(base, wrapper);
      invalidateGrouping(draft);
      await expect(project(draft)).rejects.toMatchObject({ code: 'unsupported_shape' });
    }
  );

  it('rejects a window ordering outside the bounded profile', async () => {
    const draft = fixture(base, 'window');
    const root = draft.plan.relations[0]?.relType;
    const relation = root?.case === 'root' ? root.value.input?.relType : undefined;
    const expression =
      relation?.case === 'project' ? relation.value.expressions[0]?.rexType : undefined;
    if (expression?.case !== 'windowFunction') throw new Error('Expected canonical window');
    expression.value.sorts[0]!.sortKind = {
      case: 'direction',
      value: SortField_SortDirection.ASC_NULLS_FIRST,
    };
    draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
    await expect(project(draft)).rejects.toMatchObject({ code: 'unsupported_shape' });
  });
});
