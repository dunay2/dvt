/** Owns persisted Substrait assertions, independently of generated SQL or rows. */
import {
  JoinRel_JoinType,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  canonicalizeDvtSubstraitSemanticDocumentV1,
  WorkspaceGraphDraftReadSuccessSchema,
  type DvtSubstraitSemanticDocumentV1,
} from '@dvt/contracts';

import { decodeDvtSubstraitSemanticDocument } from '../../../src/app/views/canvas/canvasDvtSubstraitSemanticDocument';
import { readLiveGraphDraft } from '../liveProtectedRuntime';

import { modelId } from './fixture';

export function readPersistedDocument(): Cypress.Chainable<DvtSubstraitSemanticDocumentV1> {
  return readLiveGraphDraft().then((response) => {
    expect(response.status).to.equal(200);
    const record = WorkspaceGraphDraftReadSuccessSchema.parse(response.body).record;
    const model = record.draft.nodes.find((node) => node.id === modelId);
    const authoring = model?.metadata?.transformAuthoring as
      { semanticDocument?: unknown } | undefined;
    return canonicalizeDvtSubstraitSemanticDocumentV1(authoring?.semanticDocument);
  });
}

export function expectCanonicalOrdering(
  document: DvtSubstraitSemanticDocumentV1,
  sortId: string,
  fetchId: string
): void {
  const draft = decodeDvtSubstraitSemanticDocument(document);
  const root = draft.plan.relations[0]?.relType;
  if (root?.case !== 'root') throw new Error('Expected canonical RelRoot');
  const fetch = root.value.input?.relType;
  expect(fetch?.case).to.equal('fetch');
  if (fetch?.case !== 'fetch') throw new Error('Expected canonical FetchRel');
  const count = fetch.value.countExpr?.rexType;
  if (count?.case !== 'literal') throw new Error('Expected canonical Fetch count literal');
  expect(count.value.literalType).to.deep.equal({ case: 'i64', value: 2n });
  const sort = fetch.value.input?.relType;
  expect(sort?.case).to.equal('sort');
  if (sort?.case !== 'sort') throw new Error('Expected canonical SortRel');
  expect(sort.value.sorts[0]?.sortKind).to.deep.equal({
    case: 'direction',
    value: SortField_SortDirection.DESC_NULLS_LAST,
  });
  const join = sort.value.input?.relType;
  expect(join?.case).to.equal('join');
  if (join?.case !== 'join') throw new Error('Expected canonical JoinRel');
  expect(join.value.type).to.equal(JoinRel_JoinType.LEFT);
  expect(draft.sidecar.relations.find((r) => r.relationId === sortId)?.relAnchor).to.equal(
    sort.value.common?.relAnchor
  );
  expect(draft.sidecar.relations.find((r) => r.relationId === fetchId)?.relAnchor).to.equal(
    fetch.value.common?.relAnchor
  );
  expect(document.sidecar.semanticPlanSha256).to.equal(document.semanticPlan.sha256);
}
