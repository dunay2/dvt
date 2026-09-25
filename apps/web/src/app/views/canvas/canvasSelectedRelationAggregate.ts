/** COUNT grouping is a local AggregateRel edit, independent of the operand's relation kind. */
import { clone, create } from '@bufbuild/protobuf';
import {
  RelSchema,
  AggregationPhase,
  AggregateFunction_AggregationInvocation,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { cloneLocalRelation, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  createDvtSubstraitFieldReference,
  createDvtSubstraitRequiredI64Type,
  ensureDvtSubstraitCountFunction,
  isDvtSubstraitCountFunction,
} from './canvasDvtSubstraitAggregation';
import {
  prepareSelectedRelationUnary,
  commitSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';
import { createRelationPassthroughFields } from './canvasRelationPassthroughFields';
import { retainCompositionOutputs } from './canvasCompositionOutputs';
import { bindRelationOutputs, relationOutputMapping } from './canvasRelationOutputBindings';

export async function applySelectedRelationAggregate(
  session: CanvasRelationAnalysisSession,
  request: SelectedUnaryRequest & Readonly<{ fieldId: string; alias: string }>
) {
  const prepared = await prepareSelectedRelationUnary(session, request, 'aggregate');
  const { target, input, binding, schema } = prepared;
  const group = schema.bindings.find(
    (field) => field.fieldId === request.fieldId && field.parentFieldId == null
  );
  const alias = DvtSemanticFieldNameV1Schema.parse(request.alias.trim());
  if (group == null || alias === group.displayName)
    throw new SubstraitAnalysisError(
      'invalid_binding',
      'Grouping needs an input field and a distinct measure name.',
      request.relationId
    );
  const plan = clone(PlanSchema, { ...target.plan, relations: [] });
  const functionReference = ensureDvtSubstraitCountFunction(plan);
  const relation =
    request.intent === 'edit'
      ? cloneLocalRelation(target.relation, [input.relation])
      : create(RelSchema, {
          relType: {
            case: 'aggregate',
            value: {
              common: { relAnchor: binding.relAnchor },
              input: input.relation,
              groupingExpressions: [createDvtSubstraitFieldReference(group.outputOrdinal)],
              groupings: [{ expressionReferences: [0] }],
              measures: [
                {
                  measure: {
                    functionReference,
                    phase: AggregationPhase.INITIAL_TO_RESULT,
                    invocation: AggregateFunction_AggregationInvocation.ALL,
                    outputType: createDvtSubstraitRequiredI64Type(),
                  },
                },
              ],
            },
          },
        });
  if (relation.relType.case !== 'aggregate')
    throw new SubstraitAnalysisError('invalid_binding', 'Expected selected AggregateRel.');
  const aggregate = relation.relType.value;
  if (
    aggregate.groupingExpressions.length !== 1 ||
    aggregate.measures.length !== 1 ||
    !isDvtSubstraitCountFunction(plan, aggregate)
  )
    throw new SubstraitAnalysisError(
      'unsupported_relation',
      'This grouping is not editable by the COUNT form.',
      request.relationId
    );
  aggregate.groupingExpressions = [createDvtSubstraitFieldReference(group.outputOrdinal)];
  const natural = [
    ...retainCompositionOutputs(
      createRelationPassthroughFields(binding.relationId, schema.bindings),
      [group.outputOrdinal]
    ),
    {
      fieldId: allocateDvtFieldId(),
      relationId: binding.relationId,
      outputOrdinal: 1,
      displayName: alias,
    },
  ];
  const fields = bindRelationOutputs(
    binding.relationId,
    natural,
    relationOutputMapping(relation, 2),
    request.intent === 'edit' ? target.fields : []
  );
  return commitSelectedRelationUnary(session, { ...prepared, fields }, relation, plan);
}
