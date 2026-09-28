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
import {
  buildDvtSubstraitCalculatedExpression,
  type DvtSubstraitCalculatedExpression,
} from './canvasDvtSubstraitCalculatedExpression';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { inspectProjectionDataType } from './canvasDvtSubstraitProjectionStructure';
import { buildDvtSubstraitScalarFunction } from './canvasDvtSubstraitScalarFunction';
import { relationOutputMapping } from './canvasRelationOutputBindings';
import {
  commitSelectedRelationUnary,
  prepareSelectedRelationUnary,
  type SelectedUnaryRequest,
} from './canvasSelectedRelationUnary';

type SelectedRelationLiteral = Extract<
  DvtSubstraitCalculatedExpression,
  { kind: 'string-literal' | 'timestamp-literal' }
>;

export type SelectedRelationDerivedExpression =
  | Readonly<{ kind: 'field'; fieldId: string }>
  | SelectedRelationLiteral
  | Readonly<{
      kind: 'function';
      capabilityId: string;
      arguments: readonly [
        SelectedRelationDerivedExpression,
        ...SelectedRelationDerivedExpression[],
      ];
    }>;

export type SelectedRelationDerivedOutputRequest = SelectedUnaryRequest &
  Readonly<{
    alias: string;
    expression: SelectedRelationDerivedExpression;
  }>;

type PreparedUnary = Awaited<ReturnType<typeof prepareSelectedRelationUnary>>;
type RelationSchema = Awaited<ReturnType<CanvasRelationAnalysisSession['query']>>;
type BuiltExpression = Readonly<{
  expression: Expression;
  dataType: string;
  dependencies: readonly string[];
}>;

function rootFields<T extends Readonly<{ parentFieldId?: string; outputOrdinal: number }>>(
  fields: readonly T[]
): readonly T[] {
  return fields
    .filter((field) => field.parentFieldId == null)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

function resolveOperandExpression(prepared: PreparedUnary, fieldId: string): Expression | null {
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

function buildExpressionNode(args: Readonly<{
  node: SelectedRelationDerivedExpression;
  prepared: PreparedUnary;
  available: RelationSchema;
  plan: Plan;
  provider: string;
}>): BuiltExpression | null {
  if (args.node.kind === 'field') {
    const binding = rootFields(args.available.bindings).find(
      (field) => field.fieldId === args.node.fieldId
    );
    if (binding == null) return null;
    const expression = resolveOperandExpression(args.prepared, args.node.fieldId);
    const type = inspectProjectionDataType(args.available.fields[binding.outputOrdinal]!.type);
    return expression == null || type == null
      ? null
      : {
          expression,
          dataType: type,
          dependencies: [args.node.fieldId],
        };
  }

  if (args.node.kind === 'string-literal' || args.node.kind === 'timestamp-literal') {
    try {
      return {
        expression: buildDvtSubstraitCalculatedExpression(args.plan, args.node),
        dataType: args.node.kind === 'string-literal' ? 'string' : 'timestamp with time zone',
        dependencies: [],
      };
    } catch {
      return null;
    }
  }

  const children = args.node.arguments.map((node) =>
    buildExpressionNode({ ...args, node })
  );
  if (children.some((child) => child == null)) return null;
  const builtChildren = children.filter((child): child is BuiltExpression => child != null);
  const expression = buildDvtSubstraitScalarFunction({
    plan: args.plan,
    capabilityId: args.node.capabilityId,
    dataTypes: builtChildren.map((child) => child.dataType),
    operands: builtChildren.map((child) => child.expression),
    provider: args.provider,
  });
  if (expression?.rexType.case !== 'scalarFunction') return null;
  const outputType = expression.rexType.value.outputType;
  if (outputType == null) return null;
  const dataType = inspectProjectionDataType(outputType);
  if (dataType == null) return null;
  return {
    expression,
    dataType,
    dependencies: [...new Set(builtChildren.flatMap((child) => child.dependencies))],
  };
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
  if (rootFields(available.bindings).some((field) => field.displayName === alias))
    reject('Derived-output alias is unavailable.', request.relationId);

  const plan = clone(PlanSchema, { ...prepared.target.plan, relations: [] });
  const built = buildExpressionNode({
    node: request.expression,
    prepared,
    available,
    plan,
    provider: session.executionProvider(request.expectedRevision),
  });
  if (built == null) reject('Derived-output expression is unavailable.', request.relationId);

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
  project.expressions.push(built.expression);
  if (project.common?.emitKind.case === 'emit') {
    project.common.emitKind.value.outputMapping.push(
      rootFields(prepared.schema.bindings).length + project.expressions.length - 1
    );
  }

  const dependencies = [...new Set(built.dependencies)];
  const fields = [
    ...prepared.fields,
    {
      fieldId: allocateDvtFieldId(),
      relationId: prepared.binding.relationId,
      outputOrdinal: available.fields.length,
      displayName: alias,
      ...(dependencies.length === 1
        ? { sourceFieldId: dependencies[0] }
        : dependencies.length > 1
          ? { operandFieldIds: dependencies }
          : {}),
    },
  ];
  return commitSelectedRelationUnary(session, { ...prepared, fields }, relation, plan);
}
