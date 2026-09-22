/** Project canonical expressions into the graph shared by both inspectors. */
import { Position } from '@xyflow/react';
import type {
  Expression,
  FunctionArgument,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS } from './canvasDvtSubstraitJoinComposition';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import type {
  SemanticWorkbenchGraph,
  SemanticWorkbenchNodeData,
} from './semanticWorkbenchProjection';
import { createSemanticExpressionDescription, literalLabel } from './semanticExpressionDescription';
import { semanticExpressionStyles } from './semanticExpressionGraphLayout';

type JoinContext = Readonly<{
  joinRelationId: string;
  operand?: 'left' | 'right';
  conditionIndex?: number;
}>;
type InputField = NonNullable<SemanticWorkbenchNodeData['fieldReference']>;

export function createSemanticExpressionProjector({
  plan,
  nodes,
  edges,
  nextId,
  showArgumentOrder = false,
  inputFields,
}: {
  plan: Plan;
  nodes: SemanticWorkbenchGraph['nodes'];
  edges: SemanticWorkbenchGraph['edges'];
  nextId: (prefix: string) => string;
  showArgumentOrder?: boolean;
  inputFields?: readonly InputField[];
}) {
  const description = createSemanticExpressionDescription(plan);
  const { describeExpression, functionName, operatorLabel } = description;
  const conditionIndexes = new Map<string, number>();
  let count = 0;

  function addNode(
    kind: 'field' | 'literal' | 'expression',
    label: string,
    detail: string,
    context?: JoinContext,
    extra?: Partial<SemanticWorkbenchNodeData>
  ): string {
    count += 1;
    const id = nextId(kind);
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label,
        semanticKind: kind,
        semanticGroup: 'condition',
        detail,
        ...extra,
        joinConditionIndex: context?.conditionIndex,
        ...(context?.operand == null
          ? {}
          : { joinOperand: { joinRelationId: context.joinRelationId, operand: context.operand } }),
      },
      style: semanticExpressionStyles[kind],
    });
    return id;
  }

  function connect(source: string, target: string, label?: string): void {
    edges.push({
      id: nextId('edge'),
      source,
      target,
      type: 'smoothstep',
      ...(label == null ? {} : { label }),
      data: { semanticEdgeKind: 'expression' },
      style: { stroke: '#10b981', strokeWidth: 1.4 },
    });
  }

  function addArguments(
    args: readonly FunctionArgument[],
    parent: string,
    fields: readonly string[],
    context?: JoinContext,
    comparison = false
  ): void {
    for (const [index, argument] of args.entries()) {
      const argumentContext =
        context == null
          ? undefined
          : {
              ...context,
              ...(comparison && args.length === 2
                ? { operand: index === 0 ? ('left' as const) : ('right' as const) }
                : {}),
            };
      const label = showArgumentOrder ? String(index + 1) : undefined;
      switch (argument.argType.case) {
        case 'enum':
          connect(
            addNode(
              'literal',
              `ENUM\n${argument.argType.value}`,
              `ENUM: ${argument.argType.value}`
            ),
            parent,
            label
          );
          break;
        case 'value':
          connect(addExpression(argument.argType.value, fields, argumentContext), parent, label);
          break;
      }
    }
  }

  function addExpression(
    expression: Expression,
    fields: readonly string[],
    context?: JoinContext
  ): string {
    switch (expression.rexType.case) {
      case 'selection': {
        const ordinal = dvtSubstraitExpression.fieldOrdinal(expression);
        const label = ordinal == null ? 'field' : (fields[ordinal] ?? `field[${ordinal}]`);
        const reference = ordinal == null ? undefined : inputFields?.[ordinal];
        return addNode(
          'field',
          `FIELD\n${label}`,
          label,
          context,
          reference == null ? undefined : { fieldReference: reference }
        );
      }
      case 'literal':
        return addNode(
          'literal',
          `VALUE\n${literalLabel(expression)}`,
          `${expression.rexType.value.literalType.case}: ${dvtSubstraitExpression.literalValue(expression)?.value ?? literalLabel(expression)}`,
          context
        );
      case 'scalarFunction': {
        const scalar = expression.rexType.value;
        const name = functionName(scalar.functionReference);
        const comparison =
          DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS.some((operator) => operator === name) ||
          name === 'is_null' ||
          name === 'is_not_null';
        if (context != null && comparison) {
          const conditionIndex = conditionIndexes.get(context.joinRelationId) ?? 0;
          conditionIndexes.set(context.joinRelationId, conditionIndex + 1);
          context = { ...context, conditionIndex };
        }
        const detail = describeExpression(expression, fields);
        const id = addNode(
          'expression',
          `${name.toUpperCase()}\n${operatorLabel(name)}`,
          [
            detail,
            ...scalar.options.map((option) => `${option.name}: ${option.preference.join(', ')}`),
          ].join('\n'),
          context,
          { expression: detail }
        );
        addArguments(scalar.arguments, id, fields, context, comparison);
        return id;
      }
      case 'windowFunction': {
        const window = expression.rexType.value;
        const name = functionName(window.functionReference);
        const id = addNode('expression', `WINDOW\n${name}`, `Window function: ${name}`);
        addArguments(window.arguments, id, fields);
        for (const partition of window.partitions)
          connect(addExpression(partition, fields), id, 'partition');
        for (const sort of window.sorts)
          if (sort.expr != null) connect(addExpression(sort.expr, fields), id, 'order');
        return id;
      }
      default:
        return addNode(
          'expression',
          `EXPRESSION\n${expression.rexType.case ?? 'unknown'}`,
          describeExpression(expression, fields)
        );
    }
  }

  return {
    addExpression,
    describeExpression,
    get count() {
      return count;
    },
  };
}
