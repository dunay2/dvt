import { describe, expect, it } from 'vitest';

import { inspectDvtSubstraitJoinDraft, ZERO_SHA256 } from '../src/index.js';
import type { DvtSubstraitJoinDraft } from '../src/substraitJoinReadModel.js';

import { joinDraft } from './fixtures/joinDraft.js';

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

  it.each(invalidIdentity)('rejects %s without repairing the document', (_, corrupt) => {
    const candidate = joinDraft();
    corrupt(candidate);
    candidate.sidecar.semanticPlanSha256 = ZERO_SHA256;
    const before = JSON.stringify(candidate);
    expect(inspectDvtSubstraitJoinDraft(candidate)).toEqual({ ok: false });
    expect(JSON.stringify(candidate)).toBe(before);
  });
});
