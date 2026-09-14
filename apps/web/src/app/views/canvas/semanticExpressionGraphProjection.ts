/** Owned concern: project canonical expressions into reusable semantic graph nodes. */
import { Position } from '@xyflow/react';
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { CSSProperties } from 'react';
import { readDvtSubstraitFieldReferenceOrdinal } from './canvasDvtSubstraitAggregation';
import { DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS } from './canvasDvtSubstraitJoinComposition';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { getLayoutedElements } from './canvasGraphUtils';

const EXPRESSION_STYLE: CSSProperties = {
  width: 138,
  minHeight: 44,
  padding: 0,
  border: '1px solid #3b5b88',
  borderRadius: 8,
  background: '#10192d',
  color: '#e2e8f0',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 11,
  textAlign: 'left',
};

const FIELD_STYLE: CSSProperties = {
  ...EXPRESSION_STYLE,
  width: 206,
  border: '1px solid #245f88',
  background: '#0a1829',
  color: '#7dd3fc',
};

const LITERAL_STYLE: CSSProperties = {
  ...EXPRESSION_STYLE,
  border: '1px solid #67552d',
  background: '#211b0d',
  color: '#f3d58a',
};

function functionNames(plan: Plan): ReadonlyMap<number, string> {
  return new Map(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [
            [
              entry.mappingType.value.functionAnchor,
              entry.mappingType.value.name.split(':', 1)[0]!,
            ] as const,
          ]
        : []
    )
  );
}

function operatorLabel(name: string): string {
  const aliases: Readonly<Record<string, string>> = {
    equal: '=',
    not_equal: '!=',
    is_null: 'IS NULL',
    is_not_null: 'IS NOT NULL',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    add: '+',
    subtract: '-',
    multiply: '*',
    divide: '/',
    and: 'AND',
    or: 'OR',
    not: 'NOT',
  };
  return aliases[name] ?? name;
}

function literalLabel(expression: Expression): string {
  if (expression.rexType.case !== 'literal') return 'literal';
  const value = dvtSubstraitExpression.literalValue(expression);
  if (value?.dataType === 'precisionTimestampTz') return value.value;
  const literal = expression.rexType.value.literalType;
  if (literal.case === 'string') return `'${literal.value.replaceAll("'", "''")}'`;
  if (literal.case === undefined) return 'NULL';
  return String(literal.value);
}

export function createSemanticExpressionProjector({
  plan,
  nodes,
  edges,
  nextId,
  showArgumentOrder = false,
}: {
  plan: Plan;
  nodes: SemanticWorkbenchGraph['nodes'];
  edges: SemanticWorkbenchGraph['edges'];
  nextId: (prefix: string) => string;
  showArgumentOrder?: boolean;
}) {
  const namesByFunctionAnchor = functionNames(plan);
  let expressionCount = 0;
  function describeExpression(
    expression: Expression,
    fieldNames: readonly string[],
    nested = false
  ): string {
    if (expression.rexType.case === 'selection') {
      const ordinal = readDvtSubstraitFieldReferenceOrdinal(expression);
      return ordinal == null ? 'field' : (fieldNames[ordinal] ?? `field[${ordinal}]`);
    }
    if (expression.rexType.case === 'literal') return literalLabel(expression);
    if (expression.rexType.case === 'scalarFunction') {
      const scalar = expression.rexType.value;
      const functionName =
        namesByFunctionAnchor.get(scalar.functionReference) ?? `fn#${scalar.functionReference}`;
      const operator = operatorLabel(functionName);
      const argumentsList = scalar.arguments.flatMap((argument) =>
        argument.argType.case === 'value'
          ? [describeExpression(argument.argType.value, fieldNames, true)]
          : argument.argType.case === 'enum'
            ? [argument.argType.value]
            : []
      );
      const detail =
        argumentsList.length === 1 && (functionName === 'is_null' || functionName === 'is_not_null')
          ? `${argumentsList[0]} ${operator}`
          : argumentsList.length === 2 && operator !== functionName
            ? `${argumentsList[0]} ${operator} ${argumentsList[1]}`
            : `${operator}(${argumentsList.join(', ')})`;
      return nested && (functionName === 'and' || functionName === 'or') ? `(${detail})` : detail;
    }
    return expression.rexType.case ?? 'expression';
  }

  function addExpression(
    expression: Expression,
    fieldNames: readonly string[],
    joinContext?: Readonly<{
      joinRelationId: string;
      operand?: 'left' | 'right';
    }>
  ): string {
    expressionCount += 1;
    if (expression.rexType.case === 'selection') {
      const ordinal = readDvtSubstraitFieldReferenceOrdinal(expression);
      const label = ordinal == null ? 'field' : (fieldNames[ordinal] ?? `field[${ordinal}]`);
      const id = nextId('field');
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: `FIELD\n${label}`,
          semanticKind: 'field',
          semanticGroup: 'condition',
          detail: `Campo de entrada: ${label}`,
          ...(joinContext?.operand == null
            ? {}
            : {
                joinOperand: {
                  joinRelationId: joinContext.joinRelationId,
                  operand: joinContext.operand,
                },
              }),
        },
        style: FIELD_STYLE,
      });
      return id;
    }
    if (expression.rexType.case === 'literal') {
      const id = nextId('literal');
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: `VALUE\n${literalLabel(expression)}`,
          semanticKind: 'literal',
          semanticGroup: 'condition',
          detail: `Valor literal (${expression.rexType.value.literalType.case}): ${dvtSubstraitExpression.literalValue(expression)?.value ?? literalLabel(expression)}`,
        },
        style: LITERAL_STYLE,
      });
      return id;
    }
    if (expression.rexType.case === 'scalarFunction') {
      const scalar = expression.rexType.value;
      const functionName =
        namesByFunctionAnchor.get(scalar.functionReference) ?? `fn#${scalar.functionReference}`;
      const id = nextId('function');
      const expressionDetail = describeExpression(expression, fieldNames);
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: `${functionName.toUpperCase()}\n${operatorLabel(functionName)}`,
          semanticKind: 'expression',
          semanticGroup: 'condition',
          detail: [
            expressionDetail,
            ...scalar.options.map((option) => `${option.name}: ${option.preference.join(', ')}`),
          ].join('\n'),
          expression: expressionDetail,
        },
        style: EXPRESSION_STYLE,
      });
      const isJoinComparison = DVT_SUBSTRAIT_JOIN_COMPARISON_OPERATORS.some(
        (operator) => operator === functionName
      );
      for (const [argumentIndex, argument] of scalar.arguments.entries()) {
        if (argument.argType.case === 'enum') {
          const argumentId = nextId('enum');
          expressionCount += 1;
          nodes.push({
            id: argumentId,
            position: { x: 0, y: 0 },
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            data: {
              label: `ENUM\n${argument.argType.value}`,
              semanticKind: 'literal',
              semanticGroup: 'condition',
              detail: `ENUM: ${argument.argType.value}`,
            },
            style: LITERAL_STYLE,
          });
          edges.push({
            id: nextId('edge'),
            source: argumentId,
            target: id,
            type: 'smoothstep',
            ...(showArgumentOrder ? { label: String(argumentIndex + 1) } : {}),
            data: { semanticEdgeKind: 'expression' },
            style: { stroke: '#10b981', strokeWidth: 1.4 },
          });
          continue;
        }
        if (argument.argType.case !== 'value') continue;
        const argumentId = addExpression(
          argument.argType.value,
          fieldNames,
          joinContext == null
            ? undefined
            : {
                ...joinContext,
                ...(isJoinComparison && scalar.arguments.length === 2
                  ? { operand: argumentIndex === 0 ? 'left' : 'right' }
                  : {}),
              }
        );
        edges.push({
          id: nextId('edge'),
          source: argumentId,
          target: id,
          ...(showArgumentOrder ? { label: String(argumentIndex + 1) } : {}),
          type: 'smoothstep',
          data: { semanticEdgeKind: 'expression' },
          style: { stroke: '#10b981', strokeWidth: 1.4 },
        });
      }
      return id;
    }
    if (expression.rexType.case === 'windowFunction') {
      const window = expression.rexType.value;
      const functionName =
        namesByFunctionAnchor.get(window.functionReference) ?? `fn#${window.functionReference}`;
      const id = nextId('window');
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: `WINDOW\n${functionName}`,
          semanticKind: 'expression',
          semanticGroup: 'condition',
          detail: `Window function: ${functionName}`,
        },
        style: EXPRESSION_STYLE,
      });
      for (const argument of window.arguments) {
        if (argument.argType.case !== 'value') continue;
        const argumentId = addExpression(argument.argType.value, fieldNames);
        edges.push({
          id: nextId('edge'),
          source: argumentId,
          target: id,
          type: 'smoothstep',
          data: { semanticEdgeKind: 'expression' },
          style: { stroke: '#10b981', strokeWidth: 1.4 },
        });
      }
      for (const partition of window.partitions) {
        const partitionId = addExpression(partition, fieldNames);
        edges.push({
          id: nextId('edge'),
          source: partitionId,
          target: id,
          label: 'partition',
          data: { semanticEdgeKind: 'expression' },
        });
      }
      for (const sort of window.sorts) {
        if (sort.expr == null) continue;
        const sortId = addExpression(sort.expr, fieldNames);
        edges.push({
          id: nextId('edge'),
          source: sortId,
          target: id,
          label: 'order',
          data: { semanticEdgeKind: 'expression' },
        });
      }
      return id;
    }

    const id = nextId('expression');
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: `EXPRESSION\n${expression.rexType.case ?? 'unknown'}`,
        semanticKind: 'expression',
        semanticGroup: 'condition',
        detail: describeExpression(expression, fieldNames),
      },
      style: EXPRESSION_STYLE,
    });
    return id;
  }

  return {
    addExpression,
    describeExpression,
    get count() {
      return expressionCount;
    },
  };
}

export function layoutSemanticExpressionGraph(
  graph: SemanticWorkbenchGraph
): SemanticWorkbenchGraph {
  const nodes = graph.nodes.map((node) => ({
    ...node,
    sourcePosition: Position.Top,
    targetPosition: Position.Bottom,
  }));
  return {
    ...graph,
    nodes: getLayoutedElements(nodes, graph.edges, {
      rankdir: 'BT',
      ranksep: 64,
      nodesep: 28,
      marginx: 24,
      marginy: 24,
      nodeSize: { width: 206, height: 56 },
    }).nodes,
    edges: graph.edges.map((edge) => ({
      ...edge,
      pathOptions: { borderRadius: 8, offset: 16, stepPosition: 0.5 },
    })),
  };
}
