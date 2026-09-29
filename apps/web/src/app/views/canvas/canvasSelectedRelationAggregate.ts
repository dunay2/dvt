import { countFunction, sumFunction } from './canvasMeasureFunctions';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
/** Grouping is a local AggregateRel edit, independent of the operand's relation kind. */
import { clone, create } from '@bufbuild/protobuf';
import {
  RelSchema,
  AggregationPhase,
  AggregateFunction_AggregationInvocation,
  AggregateFunctionSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { cloneLocalRelation, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
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
  request: SelectedUnaryRequest &
    Readonly<{
      fieldId: string;
      alias: string;
      aggregateFunction?: 'count' | 'sum';
      measureFieldId?: string;
    }>
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
  const operand = schema.bindings.find(
    (field) => field.fieldId === request.measureFieldId && field.parentFieldId == null
  );
  if (request.aggregateFunction === 'sum' && operand == null)
    throw new SubstraitAnalysisError('invalid_binding', 'SUM requires an available input field.');
  const measure =
    request.aggregateFunction === 'sum'
      ? sumFunction.create(
          plan,
          dvtSubstraitExpression.field(operand!.outputOrdinal),
          schema.fields[operand!.outputOrdinal]!.type
        )
      : create(AggregateFunctionSchema, {
          functionReference: countFunction.ensure(plan),
          phase: AggregationPhase.INITIAL_TO_RESULT,
          invocation: AggregateFunction_AggregationInvocation.ALL,
          outputType: countFunction.resultType(),
        });
  const relation =
    request.intent === 'edit'
      ? cloneLocalRelation(target.relation, [input.relation])
      : create(RelSchema, {
          relType: {
            case: 'aggregate',
            value: {
              common: { relAnchor: binding.relAnchor },
              input: input.relation,
              groupingExpressions: [dvtSubstraitExpression.field(group.outputOrdinal)],
              groupings: [{ expressionReferences: [0] }],
              measures: [{ measure }],
            },
          },
        });
  if (relation.relType.case !== 'aggregate')
    throw new SubstraitAnalysisError('invalid_binding', 'Expected selected AggregateRel.');
  const aggregate = relation.relType.value;
  if (
    aggregate.groupingExpressions.length !== 1 ||
    aggregate.measures.length !== 1 ||
    (!countFunction.matches(plan, aggregate) && !sumFunction.matches(plan, aggregate))
  )
    throw new SubstraitAnalysisError(
      'unsupported_relation',
      'This grouping is outside the admitted aggregate form.',
      request.relationId
    );
  aggregate.groupingExpressions = [dvtSubstraitExpression.field(group.outputOrdinal)];
  aggregate.measures[0]!.measure = measure;
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
