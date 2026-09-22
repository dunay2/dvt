/** Owns composition of the Set base reader with shared relational wrapper admission. */
import { inspectRelationalGroupedComposition } from './relationalGroupedComposition.js';
import { unsupportedProfile, type ProfileInspection } from './substrait-profile/inspection.js';
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
): ProfileInspection<DvtSubstraitSetComposition> {
  const direct = inspectDvtSubstraitSetDraft(draft);
  if (direct.ok)
    return {
      ok: true,
      value: { kind: 'set', projection: direct.projection, baseProjection: direct.projection },
    };
  const inspection = inspectRelationalGroupedComposition(draft, inspectDvtSubstraitSetDraft);
  if (!inspection.ok) return inspection;
  const wrapper = inspection.value;
  const base = inspectDvtSubstraitSetDraft(wrapper.baseDraft);
  if (!base.ok) return unsupportedProfile('unsupported-set-base');
  return {
    ok: true,
    value: {
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
    },
  };
}
