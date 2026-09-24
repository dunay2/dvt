/** Remove an identity-preserving unary operator without losing output mapping or lineage. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SubstraitAnalysisError, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  reconnectSelectedRelation,
  rebindSelectedFieldReferences,
} from './canvasSelectedRelationChange';

export async function removeSelectedRelationPassthrough(
  session: CanvasRelationAnalysisSession,
  relationId: string,
  expectedRevision: number,
  signal?: AbortSignal
): Promise<SubstraitDocument> {
  const selected = session.locate(relationId, expectedRevision);
  if (
    selected.relation.relType.case !== 'filter' &&
    selected.relation.relType.case !== 'sort' &&
    selected.relation.relType.case !== 'fetch'
  )
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'The selected relation is not an editable passthrough.',
      relationId
    );
  const inputId = selected.inputs[0]!;
  const schema = await session.query(inputId, signal);
  signal?.throwIfAborted();
  const input = session.locate(inputId, expectedRevision);
  const message = selected.relation.relType.value;
  if (message.advancedExtension != null || message.common?.advancedExtension != null)
    throw new SubstraitAnalysisError(
      'invalid_structure',
      'Cannot remove unknown passthrough extensions.',
      relationId
    );
  const emit = message.common?.emitKind;
  if (
    emit?.case === 'emit' &&
    (emit.value.outputMapping.length !== schema.fields.length ||
      emit.value.outputMapping.some((ordinal, position) => ordinal !== position))
  ) {
    const relation = create(RelSchema, {
      relType: {
        case: 'project',
        value: {
          common: message.common,
          input: input.relation,
        },
      },
    });
    return session.apply({
      expectedRevision,
      removed: [],
      upserts: [
        {
          relation,
          binding: { ...selected.binding, displayName: 'project' },
          fields: selected.fields,
        },
      ],
    });
  }
  const reconnected = reconnectSelectedRelation(
    session,
    relationId,
    input.relation,
    inputId,
    expectedRevision
  );
  const replacements = new Map(
    selected.fields.map((field) => {
      const replacement =
        field.sourceFieldId ??
        input.fields.find((source) => source.outputOrdinal === field.outputOrdinal)?.fieldId;
      if (replacement == null)
        throw new SubstraitAnalysisError(
          'invalid_binding',
          'Passthrough output has no input identity.',
          relationId
        );
      return [field.fieldId, replacement];
    })
  );
  return session.apply({
    expectedRevision,
    removed: [relationId],
    ...reconnected,
    upserts: rebindSelectedFieldReferences(
      session,
      replacements,
      reconnected.upserts,
      expectedRevision
    ),
  });
}
