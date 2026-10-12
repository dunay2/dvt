import type { JoinRel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import { inspectDvtSubstraitJoinDraft, ZERO_SHA256 } from '../src/index.js';
import type { DvtSubstraitJoinDraft } from '../src/substraitJoinReadModel.js';

import { joinDraft } from './fixtures/joinDraft.js';

function terminalJoin(candidate: DvtSubstraitJoinDraft): JoinRel {
  const root = candidate.plan.relations[0]?.relType;
  if (root?.case !== 'root' || root.value.input?.relType.case !== 'join') {
    throw new Error('Fixture must contain a JOIN root');
  }
  return root.value.input.relType.value;
}

const invalidInputs: readonly [string, (draft: DvtSubstraitJoinDraft) => void][] = [
  [
    'wrong JOIN anchor',
    (d) => {
      terminalJoin(d).common!.relAnchor = 99;
    },
  ],
  [
    'missing predicate',
    (d) => {
      delete terminalJoin(d).expression;
    },
  ],
  [
    'missing operand',
    (d) => {
      delete terminalJoin(d).right;
    },
  ],
  [
    'unsupported transformed branch',
    (d) => {
      terminalJoin(d).right = terminalJoin(d).left;
    },
  ],
  [
    'out-of-range emit',
    (d) => {
      const emit = terminalJoin(d).common!.emitKind;
      if (emit.case !== 'emit') throw new Error('Fixture must use emit');
      emit.value.outputMapping[0] = 99;
    },
  ],
  [
    'duplicate emit',
    (d) => {
      const emit = terminalJoin(d).common!.emitKind;
      if (emit.case !== 'emit') throw new Error('Fixture must use emit');
      emit.value.outputMapping[1] = emit.value.outputMapping[0]!;
    },
  ],
  [
    'Read filter must not be dropped',
    (d) => {
      const read = terminalJoin(d).right!.relType;
      if (read.case !== 'read') throw new Error('Fixture must contain a Read');
      read.value.filter = terminalJoin(d).expression;
    },
  ],
  [
    'unsupported input type',
    (d) => {
      const read = terminalJoin(d).right!.relType;
      if (read.case !== 'read') throw new Error('Fixture must contain a Read');
      read.value.baseSchema!.struct!.types[0]!.kind = { case: undefined };
    },
  ],
];

describe('JOIN structural admission', () => {
  it.each(invalidInputs)('rejects %s without repairing the document', (_, corrupt) => {
    const candidate = joinDraft();
    corrupt(candidate);
    candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
    const before = JSON.stringify(candidate);
    expect(inspectDvtSubstraitJoinDraft(candidate)).toEqual({ ok: false });
    expect(JSON.stringify(candidate)).toBe(before);
  });
});
