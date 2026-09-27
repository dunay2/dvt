/** Add one scalar-derived field at an exact selected relation. */
import { clone, create } from '@bufbuild/protobuf';
import {
  RelSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { cloneLocalRelation } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { buildDvtSubstraitCalculatedExpression } from './canvasDvtSubstraitCalculatedExpression';
import {
  rootFields,
  derivedOutputDataType,
  resolveOperandExpression,
  reject,
  buildScalarChain,
  referencedInputField,
  type DvtSubstraitOutputExpressionCandidate,
} from './canvasDerivedOutputExpression';
import {
  commitSelectedRelationUnary,
  prepareSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';

export type SelectedRelationDerivedOutputRequest = SelectedUnaryRequest &
  Readonly<{
    alias: string;
  }> &
  (
    | Readonly<{
        capabilityIds: readonly [string, ...string[]];
        operandFieldIds: readonly [string, ...string[]];
      }>
    | Readonly<{
        expression: Exclude<DvtSubstraitOutputExpressionCandidate, { kind: 'scalar-function' }>;
      }>
  );

export async function applySelectedRelationDerivedOutput(
  session: CanvasRelationAnalysisSession,
  request: SelectedRelationDerivedOutputRequest
) {
  const alias = DvtSemanticFieldNameV1Schema.parse(request.alias.trim());
  const prepared = await prepareSelectedRelationUnary(session, request, 'project');
  const available =
    request.intent === 'edit'
      ? await session.query(request.relationId, request.signal)
      : prepared.schema;
  const operandIds =
    'operandFieldIds' in request
      ? request.operandFieldIds
      : request.expression.kind === 'field-ref'
        ? [request.expression.inputFieldId]
        : request.expression.kind === 'row-number'
          ? [request.expression.orderFieldId]
          : [];
  const operands = new Map(
    [prepared.schema, available].flatMap((schema) =>
      rootFields(schema.bindings)
        .filter((field) => session.allowsInputSchema(schema.fields[field.outputOrdinal]!))
        .map(
          (field) =>
            [field.fieldId, { field, type: schema.fields[field.outputOrdinal]!.type }] as const
        )
    )
  );
  if (
    rootFields(available.bindings).some((field) => field.displayName === alias) ||
    operandIds.some((fieldId) => !operands.has(fieldId))
  )
    reject('Derived-output alias or operand is unavailable.', request.relationId);

  const expressions = operandIds.map((fieldId) => resolveOperandExpression(prepared, fieldId));
  const dataTypes = operandIds.map((fieldId) => derivedOutputDataType(operands.get(fieldId)!.type));
  if (
    expressions.some((expression) => expression == null) ||
    dataTypes.some((type) => type == null)
  )
    reject('Derived-output operand cannot be projected.', request.relationId);

  const plan = clone(PlanSchema, { ...prepared.target.plan, relations: [] });
  const expression =
    'capabilityIds' in request
      ? buildScalarChain({
          plan,
          capabilityIds: request.capabilityIds,
          dataTypes: dataTypes.filter((type): type is string => type != null),
          operands: expressions.filter((item): item is Expression => item != null),
          provider: session.executionProvider(request.expectedRevision),
        })
      : request.expression.kind === 'field-ref'
        ? expressions[0]!
        : buildDvtSubstraitCalculatedExpression(
            plan,
            request.expression.kind === 'row-number'
              ? {
                  kind: 'row-number',
                  orderSourceOrdinal:
                    dvtSubstraitExpression.fieldOrdinal(expressions[0]!) ??
                    reject('Window order requires an input field.', request.relationId),
                }
              : request.expression
          );
  if (expression == null) reject('Derived-output capability is unavailable.', request.relationId);

  const relation =
    request.intent === 'edit'
      ? cloneLocalRelation(prepared.target.relation, [prepared.input.relation])
      : create(RelSchema, {
          relType: {
            case: 'project',
            value: {
              common: { relAnchor: prepared.binding.relAnchor },
              input: prepared.input.relation,
            },
          },
        });
  if (relation.relType.case !== 'project')
    reject('Expected selected ProjectRel.', request.relationId);
  const project = relation.relType.value;
  project.expressions.push(expression);
  if (project.common?.emitKind.case === 'emit') {
    project.common.emitKind.value.outputMapping.push(
      rootFields(prepared.schema.bindings).length + project.expressions.length - 1
    );
  }
  const dependencies = [...new Set(operandIds)];
  const referencedInput =
    dependencies.length === 1
      ? referencedInputField(expressions[0]!, prepared.schema.bindings)
      : undefined;
  const fields = [
    ...prepared.fields,
    {
      fieldId: allocateDvtFieldId(),
      relationId: prepared.binding.relationId,
      outputOrdinal: available.fields.length,
      displayName: alias,
      ...(dependencies.length > 1
        ? { operandFieldIds: dependencies }
        : referencedInput == null
          ? {}
          : { sourceFieldId: referencedInput }),
    },
  ];
  return commitSelectedRelationUnary(session, { ...prepared, fields }, relation, plan);
}
