/** Owns composition of the Set base reader with shared relational wrapper admission. */
import { inspectRelationalGroupedComposition } from './relationalGroupedComposition.js';
import { inspectDvtSubstraitSetDraft } from './substraitSetReader.js';
import type { DvtSubstraitSetDraft, DvtSubstraitSetProjection } from './substraitSetReadModel.js';

export type DvtSubstraitSetComposition = Readonly<{
  kind: 'set' | 'aggregate' | 'window';
  projection: DvtSubstraitSetProjection;
  baseProjection: DvtSubstraitSetProjection;
  groupFieldName?: string;
  measureName?: string;
  windowName?: string;
}>;

export function inspectDvtSubstraitSetComposition(
  draft: DvtSubstraitSetDraft
): DvtSubstraitSetComposition | null {
  const direct = inspectDvtSubstraitSetDraft(draft);
  if (direct.ok)
    return { kind: 'set', projection: direct.projection, baseProjection: direct.projection };
  const wrapper = inspectRelationalGroupedComposition(draft, inspectDvtSubstraitSetDraft);
  if (wrapper == null) return null;
  const base = inspectDvtSubstraitSetDraft(wrapper.baseDraft);
  if (!base.ok) return null;
  return {
    ...wrapper,
    baseProjection: base.projection,
    projection: {
      operation: base.projection.operation,
      inputs: base.projection.inputs,
      resultRelationId: wrapper.resultRelationId,
      outputs: wrapper.outputs.map((output) => ({
        ...output,
        fieldKey:
          base.projection.outputs.find((field) => field.fieldId === output.fieldId)?.fieldKey ??
          output.name,
      })),
    },
  };
}
