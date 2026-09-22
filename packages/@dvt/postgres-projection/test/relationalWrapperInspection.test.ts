import {
  ExpressionSchema,
  RelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import { encodeDvtSubstraitPlanV1 } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { inspectRelationalGroupedComposition } from '../src/relationalGroupedComposition.js';
import { inspectDvtSubstraitJoinDraft } from '../src/substraitJoinReader.js';
import { inspectDvtSubstraitSetDraft } from '../src/substraitSetReader.js';

import { wrapperFixture } from './relationalWrapperFixtures.js';

describe.each(['join', 'set'] as const)('%s canonical wrapper inspection', (base) => {
  const inspectBase = base === 'join' ? inspectDvtSubstraitJoinDraft : inspectDvtSubstraitSetDraft;

  it.each(['aggregate', 'window'] as const)(
    'inspects %s without an SQL oracle or canonical mutation',
    (wrapper) => {
      const draft = wrapperFixture(base, wrapper);
      const before = globalThis.structuredClone(draft);
      const result = inspectRelationalGroupedComposition(draft, inspectBase);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      expect(result.value.kind).toBe(wrapper);
      const root = draft.plan.relations[0]!.relType;
      if (root.case !== 'root') throw new Error('Expected root');
      expect(result.value.outputs.map((field) => field.name)).toEqual(root.value.names);
      expect(result.value.outputs.map((field) => field.fieldId)).toEqual(
        draft.sidecar.fields
          .filter((field) => field.relationId === result.value.resultRelationId)
          .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
          .map((field) => field.fieldId)
      );
      expect(inspectBase(result.value.baseDraft).ok).toBe(true);
      expect(draft).toEqual(before);
      expect(encodeDvtSubstraitPlanV1(draft.plan)).toEqual(encodeDvtSubstraitPlanV1(before.plan));
    }
  );

  it('preserves an invocation rejection instead of trying another wrapper', () => {
    const draft = wrapperFixture(base, 'aggregate');
    const root = draft.plan.relations[0]!.relType;
    const relation = root.case === 'root' ? root.value.input?.relType : undefined;
    if (relation?.case !== 'aggregate') throw new Error('Expected aggregate');
    relation.value.measures[0]!.measure!.phase = 0;
    draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
    const unusedBase = vi.fn(inspectBase);
    expect(inspectRelationalGroupedComposition(draft, unusedBase)).toEqual({
      ok: false,
      reason: 'unsupported-aggregation-phase',
    });
    expect(unusedBase).not.toHaveBeenCalled();
  });

  it('does not admit a filtered aggregate while extracting invocation validation', () => {
    const draft = wrapperFixture(base, 'aggregate');
    const root = draft.plan.relations[0]!.relType;
    const relation = root.case === 'root' ? root.value.input?.relType : undefined;
    if (relation?.case !== 'aggregate') throw new Error('Expected aggregate');
    relation.value.measures[0]!.filter = create(ExpressionSchema, {
      rexType: { case: 'literal', value: { literalType: { case: 'boolean', value: true } } },
    });
    draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
    expect(inspectRelationalGroupedComposition(draft, inspectBase)).toEqual({
      ok: false,
      reason: 'unsupported-aggregate-shape',
    });
  });
});

it('rejects unregistered canonical relations before inspecting their inputs', () => {
  const draft = wrapperFixture('join', 'window');
  const root = draft.plan.relations[0]!.relType;
  if (root.case !== 'root') throw new Error('Expected root');
  root.value.input = create(RelSchema, {
    relType: { case: 'fetch', value: { input: root.value.input } },
  });
  draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
  const inspectBase = vi.fn(inspectDvtSubstraitJoinDraft);
  expect(inspectRelationalGroupedComposition(draft, inspectBase)).toEqual({
    ok: false,
    reason: 'unsupported-wrapper-kind',
  });
  expect(inspectBase).not.toHaveBeenCalled();
});

it('rejects stale semantic identity before dispatch', () => {
  const draft = wrapperFixture('join', 'window');
  draft.sidecar.semanticPlanSha256 = 'f'.repeat(64);
  expect(inspectRelationalGroupedComposition(draft, inspectDvtSubstraitJoinDraft)).toEqual({
    ok: false,
    reason: 'stale-semantic-hash',
  });
});

it('rejects multiple roots rather than ignoring a second plan relation', () => {
  const draft = wrapperFixture('set', 'aggregate');
  draft.plan.relations.push(globalThis.structuredClone(draft.plan.relations[0]!));
  draft.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(draft.plan).sha256;
  expect(inspectRelationalGroupedComposition(draft, inspectDvtSubstraitSetDraft)).toEqual({
    ok: false,
    reason: 'unsupported-plan-root',
  });
});
