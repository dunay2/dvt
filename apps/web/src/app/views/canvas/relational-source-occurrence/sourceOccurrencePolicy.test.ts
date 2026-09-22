/** Owned concern: prove occurrence commands preserve canonical identity and physical provenance. */
import { describe, expect, it } from 'vitest';
import { inspectDvtSubstraitJoinDraft } from '@dvt/postgres-projection';
import { occurrenceGraph, repeatedOccurrenceDraft } from './occurrence.test.fixtures';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from '../canvasDvtCompositionInputCatalog';
import { renameSourceOccurrence, sourceOccurrenceAppendRejection } from './sourceOccurrencePolicy';

describe('Read occurrence alias', () => {
  it('changes only the addressed binding, preserving plan bytes, fields, outputs and provenance', () => {
    const draft = repeatedOccurrenceDraft();
    const before = structuredClone(draft);
    const read = draft.sidecar.relations.filter((binding) => binding.sourceRef != null)[1]!;
    const result = renameSourceOccurrence(draft, read.relationId, 'Parents');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.reason);
    expect(result.draft.plan).toBe(draft.plan);
    expect(result.draft.sidecar.fields).toBe(draft.sidecar.fields);
    expect(result.draft.sidecar.relations).toEqual(
      draft.sidecar.relations.map((binding) =>
        binding === read ? { ...binding, displayName: 'Parents' } : binding
      )
    );
    expect(inspectDvtSubstraitJoinDraft(result.draft).ok).toBe(true);
    expect(draft).toEqual(before);
  });

  it.each(['', '   ', 'bad\0name', 'x'.repeat(257)])(
    'rejects invalid alias %j without mutation',
    (alias) => {
      const draft = repeatedOccurrenceDraft();
      const read = draft.sidecar.relations.find((binding) => binding.sourceRef != null)!;
      expect(renameSourceOccurrence(draft, read.relationId, alias)).toEqual({
        ok: false,
        reason: 'invalid_alias',
      });
    }
  );

  it('does not treat a missing or operation identity as a Read', () => {
    const draft = repeatedOccurrenceDraft();
    const operation = draft.sidecar.relations.find((binding) => binding.sourceRef == null)!;
    for (const id of ['missing', operation.relationId]) {
      expect(renameSourceOccurrence(draft, id, 'Parents')).toEqual({
        ok: false,
        reason: 'unsupported',
      });
    }
  });

  it('preserves the reference for an unchanged alias', () => {
    const draft = repeatedOccurrenceDraft();
    const read = draft.sidecar.relations.find((binding) => binding.sourceRef != null)!;
    expect(renameSourceOccurrence(draft, read.relationId, read.displayName!)).toEqual({
      ok: true,
      draft,
    });
  });
});

describe('explicit instance append admission', () => {
  function setup(): {
    draft: ReturnType<typeof repeatedOccurrenceDraft>;
    input: CanvasDvtCompositionInput;
    editable: boolean;
  } {
    const graph = occurrenceGraph();
    const [input] = resolveCanvasDvtCompositionInputs({
      nodes: graph.nodes,
      edges: graph.edges,
      targetNodeId: graph.targetNode.id,
    });
    return { draft: graph.draft, input: input!, editable: true };
  }
  it('admits an already participating physical source without cloning it', () => {
    expect(sourceOccurrenceAppendRejection(setup())).toBeNull();
  });
  it.each(['integer', 'numeric', 'date', 'jsonb'])(
    'admits a compatible key alongside an unsupported %s field',
    (type) => {
      const args = setup();
      const input = {
        ...args.input,
        fields: [
          ...args.input.fields,
          {
            ...args.input.fields[0]!,
            name: 'additional',
            type,
            joinDataType: null,
          },
        ],
      };
      expect(sourceOccurrenceAppendRejection({ ...args, input })).toBeNull();
    }
  );
  it('rejects read-only, absent input and unsupported composition explicitly', () => {
    const args = setup();
    expect(sourceOccurrenceAppendRejection({ ...args, editable: false })).toBe('read_only');
    expect(sourceOccurrenceAppendRejection({ ...args, input: undefined })).toBe('unavailable');
    expect(sourceOccurrenceAppendRejection({ ...args, draft: null })).toBe('unsupported');
  });
  it('rejects a different physical connection and incompatible predicate fields', () => {
    const args = setup();
    expect(
      sourceOccurrenceAppendRejection({
        ...args,
        input: {
          ...args.input,
          sourceRef: {
            ...args.input.sourceRef,
            connectionRef: { ...args.input.sourceRef.connectionRef, connectionId: 'elsewhere' },
          },
        },
      })
    ).toBe('unavailable');
    expect(
      sourceOccurrenceAppendRejection({
        ...args,
        input: {
          ...args.input,
          fields: args.input.fields.map((field) => ({ ...field, joinDataType: null })),
        },
      })
    ).toBe('incompatible');
  });
});
