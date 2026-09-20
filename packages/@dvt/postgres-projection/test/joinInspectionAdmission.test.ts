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

const invalidIdentity: readonly [string, (draft: DvtSubstraitJoinDraft) => void][] = [
  [
    'duplicate relation ID',
    (d) => {
      d.sidecar.relations[1]!.relationId = d.sidecar.relations[0]!.relationId;
    },
  ],
  [
    'duplicate anchor',
    (d) => {
      d.sidecar.relations[1]!.relAnchor = d.sidecar.relations[0]!.relAnchor;
    },
  ],
  [
    'duplicate field ID',
    (d) => {
      d.sidecar.fields[1]!.fieldId = d.sidecar.fields[0]!.fieldId;
    },
  ],
  [
    'missing relation binding',
    (d) => {
      d.sidecar.relations.pop();
    },
  ],
  [
    'missing input field',
    (d) => {
      d.sidecar.fields.shift();
    },
  ],
  [
    'wrong field ordinal',
    (d) => {
      d.sidecar.fields[0]!.outputOrdinal = 99;
    },
  ],
  [
    'wrong input display name',
    (d) => {
      d.sidecar.relations[0]!.displayName = 'another_table';
    },
  ],
  [
    'wrong source provenance',
    (d) => {
      d.sidecar.relations[1]!.sourceRef!.connectionRef.connectionId = 'another-connection';
    },
  ],
  [
    'unsupported provider',
    (d) => {
      d.sidecar.relations[0]!.sourceRef!.connectionRef.provider = 'snowflake';
    },
  ],
  [
    'missing source binding',
    (d) => {
      delete d.sidecar.relations[0]!.sourceRef;
    },
  ],
  [
    'duplicate physical source',
    (d) => {
      d.sidecar.relations[1]!.sourceRef = d.sidecar.relations[0]!.sourceRef;
    },
  ],
  [
    'wrong stage lineage',
    (d) => {
      d.sidecar.fields.at(-1)!.sourceFieldId = 'unknown-field';
    },
  ],
  [
    'wrong stage display name',
    (d) => {
      d.sidecar.relations.at(-1)!.displayName = 'another-join';
    },
  ],
];

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

describe('JOIN inspection admission boundary', () => {
  it.each(['two', 'three'] as const)(
    'preserves exact field lineage and identities for %s inputs',
    (size) => {
      const candidate = joinDraft(size);
      const before = JSON.stringify(candidate);
      const inspection = inspectDvtSubstraitJoinDraft(candidate);
      expect(inspection.ok).toBe(true);
      if (!inspection.ok) throw new Error('Canonical fixture must be admitted');
      const { projection } = inspection;
      expect(projection.inputs.map((input) => input.relationId)).toEqual(
        candidate.sidecar.relations
          .filter((relation) => relation.sourceRef != null)
          .map((relation) => relation.relationId)
      );
      expect(
        projection.outputs.map((output) => ({
          fieldId: output.fieldId,
          sourceFieldId: output.source.fieldId,
          displayName: output.name,
          outputOrdinal: output.outputOrdinal,
        }))
      ).toEqual(
        candidate.sidecar.fields
          .filter((field) => field.relationId === projection.joinRelations.at(-1)!.relationId)
          .map(({ fieldId, sourceFieldId, displayName, outputOrdinal }) => ({
            fieldId,
            sourceFieldId,
            displayName,
            outputOrdinal,
          }))
      );
      for (const output of projection.outputs) {
        expect(projection.inputs[output.source.inputIndex]!.fields).toContainEqual({
          fieldId: output.source.fieldId,
          name: output.source.name,
          dataType: output.dataType,
          nullable: output.nullable,
        });
      }
      expect(JSON.stringify(candidate)).toBe(before);
    }
  );

  it.each([...invalidIdentity, ...invalidInputs])(
    'rejects %s without repairing the document',
    (_, corrupt) => {
      const candidate = joinDraft();
      corrupt(candidate);
      candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
      const before = JSON.stringify(candidate);
      expect(inspectDvtSubstraitJoinDraft(candidate)).toEqual({ ok: false });
      expect(JSON.stringify(candidate)).toBe(before);
    }
  );
});
