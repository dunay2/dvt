/** Owned concern: admit explicit occurrence edits without changing physical provenance. */
import { CanvasHumanNameV1Schema } from '@dvt/contracts';
import { hasSameConnectionRef, inspectDvtSubstraitJoinDraft } from '@dvt/postgres-projection';
import type { CanvasDvtCompositionInput } from '../canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtJoinFieldPair } from '../canvasDvtJoinTypeAdmission';
import {
  inspectDvtSubstraitJoinPredicateContext,
  type DvtSubstraitJoinDraft,
} from '../canvasDvtSubstraitJoinComposition';

export type SourceOccurrenceRejection =
  'read_only' | 'unsupported' | 'unavailable' | 'incompatible';

export function sourceOccurrenceAppendRejection(
  args: Readonly<{
    editable: boolean;
    draft: DvtSubstraitJoinDraft | null;
    input: CanvasDvtCompositionInput | undefined;
  }>
): SourceOccurrenceRejection | null {
  if (!args.editable) return 'read_only';
  if (args.input == null) return 'unavailable';
  const inspection = args.draft == null ? null : inspectDvtSubstraitJoinDraft(args.draft);
  if (!inspection?.ok) return 'unsupported';
  const connection = inspection.projection.inputs[0]?.sourceRef.connectionRef;
  if (connection == null || !hasSameConnectionRef(connection, args.input.sourceRef.connectionRef))
    return 'unavailable';
  const pair = resolveCanvasDvtJoinFieldPair(
    inspection.projection.outputs.map((output) => ({
      name: output.source.name,
      joinDataType: output.dataType,
    })),
    args.input.fields
  );
  return pair == null ? 'incompatible' : null;
}

export function renameSourceOccurrence(
  draft: DvtSubstraitJoinDraft,
  relationId: string,
  alias: string
):
  | { ok: true; draft: DvtSubstraitJoinDraft }
  | { ok: false; reason: 'invalid_alias' | 'unsupported' } {
  const name = CanvasHumanNameV1Schema.safeParse(alias);
  if (!name.success) return { ok: false, reason: 'invalid_alias' };
  const context = inspectDvtSubstraitJoinPredicateContext(draft);
  const read = draft.sidecar.relations.find((binding) => binding.relationId === relationId);
  if (
    read?.sourceRef == null ||
    !context?.inspection.projection.inputs.some((input) => input.relationId === relationId)
  )
    return { ok: false, reason: 'unsupported' };
  if (read.displayName === name.data) return { ok: true, draft };
  return {
    ok: true,
    draft: {
      ...draft,
      sidecar: {
        ...draft.sidecar,
        relations: draft.sidecar.relations.map((binding) =>
          binding === read ? { ...binding, displayName: name.data } : binding
        ),
      },
    },
  };
}
