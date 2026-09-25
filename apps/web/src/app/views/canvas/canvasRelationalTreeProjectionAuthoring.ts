/** Create a typed pass-through projection for a physical source occurrence. */
import { create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { allocateDvtFieldId, allocateDvtRelationId } from '@dvt/contracts';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceRelation, toSourceRelationInput } from './canvasSourceRelation';
import { createSourceDocument } from './canvasSourceDocument';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

export function createCanvasRelationalTreeProjectionDraft(
  args: Readonly<{ input: CanvasDvtCompositionInput; targetNodeId: string }>
) {
  const read = createSourceRelation(toSourceRelationInput(args.input), 1);
  const relationId = allocateDvtRelationId();
  const fields = read.fields.map((field) => ({
    ...field,
    fieldId: allocateDvtFieldId(),
    relationId,
    sourceFieldId: field.fieldId,
  }));
  const relation = create(RelSchema, {
    relType: {
      case: 'project',
      value: {
        common: {
          relAnchor: 2,
          emitKind: {
            case: 'emit',
            value: {
              outputMapping: fields.map((_, ordinal) => fields.length + ordinal),
            },
          },
        },
        input: read.relation,
        expressions: fields.map((_, ordinal) => dvtSubstraitExpression.field(ordinal)),
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
