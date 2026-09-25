import { rowNumberFunction } from './canvasMeasureFunctions';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
/** A window output is a ProjectRel over the selected input, not a JOIN-specific stage. */
import { clone, create } from '@bufbuild/protobuf';
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { cloneLocalRelation, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { buildDvtSubstraitCalculatedExpression } from './canvasDvtSubstraitCalculatedExpression';
import {
  prepareSelectedRelationUnary,
  commitSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';
import { relationOutputMapping } from './canvasRelationOutputBindings';

export async function applySelectedRelationWindow(
  session: CanvasRelationAnalysisSession,
  request: SelectedUnaryRequest &
    Readonly<{ fieldId: string; alias: string; partitionFieldIds?: readonly string[] }>
) {
  const prepared = await prepareSelectedRelationUnary(session, request, 'project');
  const { target, input, schema, binding } = prepared;
  const order = schema.bindings.find(
    (field) => field.fieldId === request.fieldId && field.parentFieldId == null
  );
  const alias = DvtSemanticFieldNameV1Schema.parse(request.alias.trim());
  if (order == null || schema.bindings.some((field) => field.displayName === alias))
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Window needs an input ordering field and a distinct output name.',
      request.relationId
    );
  const plan = clone(PlanSchema, { ...target.plan, relations: [] });
  const relation =
    request.intent === 'edit'
      ? cloneLocalRelation(target.relation, [input.relation])
      : create(RelSchema, {
          relType: {
            case: 'project',
            value: {
              common: { relAnchor: binding.relAnchor },
              input: input.relation,
              expressions: [
                buildDvtSubstraitCalculatedExpression(plan, {
                  kind: 'row-number',
                  orderSourceOrdinal: order.outputOrdinal,
                }),
              ],
            },
          },
        });
  if (relation.relType.case !== 'project')
    throw new SubstraitAnalysisError('invalid_binding', 'Expected selected ProjectRel.');
  const project = relation.relType.value;
  const window = project.expressions[0]?.rexType;
  if (
    project.expressions.length !== 1 ||
    window?.case !== 'windowFunction' ||
    !rowNumberFunction.matches(plan, window.value)
  )
    throw new SubstraitAnalysisError(
      'unsupported_relation',
      'This projection is not editable by the ROW_NUMBER form.',
      request.relationId
    );
  if (window.value.sorts.length !== 1)
    throw new SubstraitAnalysisError(
      'unsupported_relation',
      'This window needs a multi-key editor.',
      request.relationId
    );
  window.value.sorts[0]!.expr = dvtSubstraitExpression.field(order.outputOrdinal);
  if (request.partitionFieldIds != null) {
    if (new Set(request.partitionFieldIds).size !== request.partitionFieldIds.length)
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Window partition fields must be unique.',
        request.relationId
      );
    window.value.partitions = request.partitionFieldIds.map((fieldId) => {
      const field = schema.bindings.find(
        (candidate) => candidate.fieldId === fieldId && candidate.parentFieldId == null
      );
      if (field == null)
        throw new SubstraitAnalysisError(
          'invalid_binding',
          'Window partition field is not in the input.',
          request.relationId
        );
      return dvtSubstraitExpression.field(field.outputOrdinal);
    });
  }
  const mapping = relationOutputMapping(relation, schema.fields.length + 1);
  const fields =
    request.intent === 'edit'
      ? target.fields.map((field) =>
          field.parentFieldId == null && mapping[field.outputOrdinal] === schema.fields.length
            ? { ...field, displayName: alias }
            : field
        )
      : [
          ...prepared.fields,
          {
            fieldId: allocateDvtFieldId(),
            relationId: binding.relationId,
            outputOrdinal: schema.fields.length,
            displayName: alias,
          },
        ];
  return commitSelectedRelationUnary(session, { ...prepared, fields }, relation, plan);
}
