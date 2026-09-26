/** Naming stays a label policy, never a source identity or operator-specific rule. */
import { describe, expect, it } from 'vitest';
import { CanvasHumanNameV1Schema } from '@dvt/contracts';
import { createSourceCross } from '../canvasSourceCross';
import { createSourceSet } from '../canvasSourceSet';
import { createSourceJoin } from '../canvasSourceJoin';
import { occurrenceInput } from './occurrence.test.fixtures';
import { nextSourceOccurrenceAlias, sourceOccurrenceAliases } from './sourceOccurrenceAlias';

describe('source instance aliases', () => {
  it.each(['customers', 'customers 2', '客户', '📦'.repeat(256)])(
    'allocates distinct, valid suggestions (case %#) without changing occupied labels',
    (base) => {
      const occupied = new Set([base, `${base} 2`]);
      const original = [...occupied];
      const alias = nextSourceOccurrenceAlias(base, occupied);
      expect(occupied.has(alias)).toBe(false);
      expect(CanvasHumanNameV1Schema.safeParse(alias).success).toBe(true);
      expect([...occupied]).toEqual(original);
      expect(nextSourceOccurrenceAlias(base, occupied)).toBe(alias);
    }
  );

  it.each(['join', 'cross', 'set'] as const)(
    'assigns distinct aliases to initial %s inputs without changing physical provenance',
    (operation) => {
      const input = {
        ...occurrenceInput.source,
        fields: occurrenceInput.fields.map((name, ordinal) => ({
          name,
          type: occurrenceInput.fieldTypes![ordinal]!,
          dataType: 'bigint',
          joinDataType: occurrenceInput.fieldTypes![ordinal]!,
          nullable: occurrenceInput.fieldNullabilities![ordinal]!,
        })),
      };
      const document =
        operation === 'join'
          ? createSourceJoin({
              left: occurrenceInput,
              right: occurrenceInput,
              leftFieldName: 'id',
              rightFieldName: 'parent_id',
              targetNodeId: 'model',
            })
          : operation === 'cross'
            ? createSourceCross([input, input, input])
            : createSourceSet({ inputs: [input, input, input], targetNodeId: 'model' });
      const reads = document.sidecar.relations.filter((binding) => binding.sourceRef != null);
      expect(sourceOccurrenceAliases(reads).size).toBe(reads.length);
      expect(new Set(reads.map((binding) => binding.relationId)).size).toBe(reads.length);
      for (const read of reads) expect(read.sourceRef).toEqual(occurrenceInput.source.sourceRef);
      expect(sourceOccurrenceAliases(reads, reads[0]!.relationId).size).toBe(reads.length - 1);
    }
  );
});
