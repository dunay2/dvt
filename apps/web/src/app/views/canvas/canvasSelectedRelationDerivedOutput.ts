/** Add one scalar-derived field at an exact selected relation. */
import { clone, create } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  RelSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { allocateDvtFieldId, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import { cloneLocalRelation, SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { inspectProjectionDataType } from './canvasDvtSubstraitProjectionStructure';
import { buildDvtSubstraitScalarFunction } from './canvasDvtSubstraitScalarFunction';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { relationOutputMapping } from './canvasRelationOutputBindings';
import {
  commitSelectedRelationUnary,
  prepareSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';

export type SelectedRelationDerivedOutputRequest = SelectedUnaryRequest &
  Readonly<{
    alias: string;
    capabilityIds: readonly [string, ...string[]];
    operandFieldIds: readonly [string, ...string[]];
  }>;

function rootFields<T extends Readonly<{ parentFieldId?: string; outputOrdinal: number }>>(
  fields: readonly T[]
): readonly T[] {
  return fields
    .filter((field) => field.parentFieldId == null)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

function resolveOperandExpression(
  prepared: Awaited<ReturnType<typeof prepareSelectedRelationUnary>>,
  fieldId: string
): Expression | null {
  const inputs = rootFields(prepared.schema.bindings);
  const inputOrdinal = inputs.findIndex((field) => field.fieldId === fieldId);
  if (inputOrdinal >= 0) return dvtSubstraitExpression.field(inputOrdinal);
  if (prepared.request.intent !== 'edit' || prepared.target.relation.relType.case !== 'project')
    return null;
  const output = rootFields(prepared.target.fields).find((field) => field.fieldId === fieldId);
  if (output == null) return null;
  const project = prepared.target.relation.relType.value;
  const mapping = relationOutputMapping(
    prepared.target.relation,
    inputs.length + project.expressions.length
  )[output.outputOrdinal];
  if (mapping == null) return null;
  if (mapping < inputs.length) return dvtSubstraitExpression.field(mapping);
  const expression = project.expressions[mapping - inputs.length];
  return expression == null ? null : clone(ExpressionSchema, expression);
}

function reject(message: string, relationId: string): never {
  throw new SubstraitAnalysisError('invalid_binding', message, relationId);
}

function buildScalarChain(
  args: Readonly<{
    plan: Plan;
    capabilityIds: readonly [string, ...string[]];
    dataTypes: readonly string[];
    operands: readonly Expression[];
    provider: string;
  }>
): Expression | null {
  let dataTypes = args.dataTypes;
  let operands = args.operands;
  let expression: Expression | null = null;
  for (const capabilityId of args.capabilityIds) {
    expression = buildDvtSubstraitScalarFunction({
      plan: args.plan,
      capabilityId,
      dataTypes,
      operands,
      provider: args.provider,
    });
    if (expression?.rexType.case !== 'scalarFunction') return null;
    const outputType = expression.rexType.value.outputType;
    if (outputType == null) return null;
    const outputDataType = inspectProjectionDataType(outputType);
    if (outputDataType == null) return null;
    dataTypes = [outputDataType];
    operands = [expression];
  }
  return expression;
}

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
  if (
    rootFields(available.bindings).some((field) => field.displayName === alias) ||
    request.operandFieldIds.some(
      (fieldId) => !rootFields(available.bindings).some((field) => field.fieldId === fieldId)
    )
  )
    reject('Derived-output alias or operand is unavailable.', request.relationId);

  const expressions = request.operandFieldIds.map((fieldId) =>
    resolveOperandExpression(prepared, fieldId)
  );
  const dataTypes = request.operandFieldIds.map((fieldId) => {
    const binding = rootFields(available.bindings).find((field) => field.fieldId === fieldId);
    return binding == null
      ? null
      : inspectProjectionDataType(available.fields[binding.outputOrdinal]!.type);
  });
  if (
    expressions.some((expression) => expression == null) ||
    dataTypes.some((type) => type == null)
  )
    reject('Derived-output operand cannot be projected.', request.relationId);

  const plan = clone(PlanSchema, { ...prepared.target.plan, relations: [] });
  const expression = buildScalarChain({
    plan,
    capabilityIds: request.capabilityIds,
    dataTypes: dataTypes.filter((type): type is string => type != null),
    operands: expressions.filter((item): item is Expression => item != null),
    provider: session.executionProvider(request.expectedRevision),
  });
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
  const dependencies = [...new Set(request.operandFieldIds)];
  const fields = [
    ...prepared.fields,
    {
      fieldId: allocateDvtFieldId(),
      relationId: prepared.binding.relationId,
      outputOrdinal: available.fields.length,
      displayName: alias,
      ...(dependencies.length === 1
        ? { sourceFieldId: dependencies[0] }
        : { operandFieldIds: dependencies }),
    },
  ];
  return commitSelectedRelationUnary(session, { ...prepared, fields }, relation, plan);
}
