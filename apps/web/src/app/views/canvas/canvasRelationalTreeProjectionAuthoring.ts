/** Create a typed pass-through projection for a physical source occurrence. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createCanvasInputRead } from './canvasSourceRelation';
import { createSourceDocument } from './canvasSourceDocument';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { selectedCanvasInputOrdinals } from './canvasInputComposition';

export function createCanvasRelationalTreeProjectionDraft(
  args: Readonly<{
    input: CanvasDvtCompositionInput;
    targetNodeId: string;
    occurrence?: ReturnType<typeof createCanvasInputRead>;
  }>
) {
  const read = args.occurrence ?? createCanvasInputRead(args.input, 1);
  const relationId = allocateDvtRelationId();
  const ordinals = selectedCanvasInputOrdinals(args.input);
  const inputFields = read.fields
    .filter((field) => field.parentFieldId == null)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
  const copyField = (
    field: (typeof read.fields)[number],
    outputOrdinal: number,
    parentFieldId?: string
  ): typeof read.fields => {
    const fieldId = allocateDvtFieldId();
    return [
      {
        ...field,
        fieldId,
        relationId,
        outputOrdinal,
        sourceFieldId: field.fieldId,
        ...(parentFieldId == null ? {} : { parentFieldId }),
      },
      ...read.fields
        .filter((child) => child.parentFieldId === field.fieldId)
        .flatMap((child) => copyField(child, child.outputOrdinal, fieldId)),
    ];
  };
  const fields = ordinals.flatMap((ordinal, outputOrdinal) =>
    copyField(inputFields[ordinal]!, outputOrdinal)
  );
  const relation = create(RelSchema, {
    relType: {
      case: 'project',
      value: {
        common: {
          relAnchor: 2,
          emitKind: {
            case: 'emit',
            value: {
              outputMapping: ordinals.map((_, ordinal) => inputFields.length + ordinal),
            },
          },
        },
        input: read.relation,
        expressions: ordinals.map((ordinal) => dvtSubstraitExpression.field(ordinal)),
      },
    },
  });
  const project = {
    relation,
    fields,
    binding: { relationId, relAnchor: 2, displayName: args.targetNodeId },
  };
  return createSourceDocument([read, project], project);
}
