import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';

import {
  inspectDvtSubstraitJoinDraft,
  inspectDvtSubstraitAcceptedCrossDraft,
  inspectDvtSubstraitSetDraft,
  projectDvtJoinDraftToPostgresSql,
  projectDvtCrossDraftToPostgresSql,
  projectDvtSetDraftToPostgresSql,
} from '../src/index.js';

import {
  identityFixture,
  permuteAnchors,
  refreshDigest,
  relationAnchor,
  relationNodes,
  relationRoot,
  setRelationAnchor,
} from './relationIdentityFixtures.js';

const families = [
  {
    kind: 'join',
    inspect: inspectDvtSubstraitJoinDraft,
    project: projectDvtJoinDraftToPostgresSql,
  },
  {
    kind: 'cross',
    inspect: inspectDvtSubstraitAcceptedCrossDraft,
    project: projectDvtCrossDraftToPostgresSql,
  },
  {
    kind: 'mixed-cross',
    inspect: inspectDvtSubstraitAcceptedCrossDraft,
    project: projectDvtCrossDraftToPostgresSql,
  },
  { kind: 'set', inspect: inspectDvtSubstraitSetDraft, project: projectDvtSetDraftToPostgresSql },
] as const;

describe.each(families)('$kind canonical relation identity', ({ kind, inspect, project }) => {
  it('preserves SQL, schema and physical sources under sparse permuted anchors', async () => {
    const original = identityFixture(kind);
    const candidate = identityFixture(kind);
    permuteAnchors(candidate);
    const before = globalThis.structuredClone(candidate);
    const expected = await project(original);
    const actual = await project(candidate);
    expect(actual.sql).toBe(expected.sql);
    expect(actual.projection.inputs).toEqual(expected.projection.inputs);
    expect(actual.projection.outputs).toEqual(expected.projection.outputs);
    expect(candidate).toEqual(before);
  });

  it('selects each subtree without renumbering its anchors or changing field identities', () => {
    const draft = identityFixture(kind);
    permuteAnchors(draft);
    const before = globalThis.structuredClone(draft);
    for (const rel of relationNodes(relationRoot(draft))) {
      const binding = draft.sidecar.relations.find(
        (item) => item.relAnchor === relationAnchor(rel)
      )!;
      const selected = selectDvtSubstraitRelation(draft, binding.relationId);
      expect(relationRoot(selected)).toEqual(rel);
      const included = new Set(relationNodes(rel).map(relationAnchor));
      const bindings = draft.sidecar.relations.filter((item) => included.has(item.relAnchor));
      expect(selected.sidecar.relations).toEqual(bindings);
      expect(selected.sidecar.fields).toEqual(
        draft.sidecar.fields.filter((field) =>
          bindings.some((item) => item.relationId === field.relationId)
        )
      );
    }
    expect(draft).toEqual(before);
  });

  it.each([
    'duplicate plan anchor',
    'duplicate sidecar anchor',
    'missing binding',
    'foreign binding',
    'stale digest',
  ])('rejects %s without mutating the draft', (fault) => {
    const draft = identityFixture(kind);
    const nodes = relationNodes(relationRoot(draft));
    if (fault === 'duplicate plan anchor') setRelationAnchor(nodes[1]!, relationAnchor(nodes[0]!));
    if (fault === 'duplicate sidecar anchor')
      draft.sidecar.relations[1]!.relAnchor = draft.sidecar.relations[0]!.relAnchor;
    if (fault === 'missing binding') draft.sidecar.relations.pop();
    if (fault === 'foreign binding') draft.sidecar.relations[0]!.relAnchor = 999;
    refreshDigest(draft);
    if (fault === 'stale digest') draft.sidecar.semanticPlanSha256 = 'a'.repeat(64);
    const before = globalThis.structuredClone(draft);
    expect(inspect(draft).ok).toBe(false);
    expect(() =>
      selectDvtSubstraitRelation(draft, draft.sidecar.relations.at(-1)!.relationId)
    ).toThrow();
    expect(draft).toEqual(before);
  });
});
