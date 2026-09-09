import dagre from 'dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type { Expression, Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { CSSProperties } from 'react';

import type { CanonicalNode } from '../types/canonical';
import { readDvtSubstraitFieldReferenceOrdinal } from '../views/canvas/canvasDvtSubstraitAggregation';
import { decodeDvtSubstraitSemanticDocument } from '../views/canvas/canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from '../views/canvas/canvasDvtTransformAuthoringAuthority';

export type SemanticWorkbenchGroup = 'source' | 'condition' | 'transformation';

export type SemanticWorkbenchNodeData = Readonly<{
  label: string;
  semanticKind: 'group' | 'relation' | 'expression' | 'field' | 'literal';
  semanticGroup: SemanticWorkbenchGroup;
  detail: string;
  expression?: string;
  inputSummary?: string;
  outputSummary?: string;
}>;

export type SemanticWorkbenchGraph = Readonly<{
  nodes: Node<SemanticWorkbenchNodeData>[];
  edges: Edge[];
  relationCount: number;
  expressionCount: number;
  relationId: string;
}>;

const RELATION_STYLE: CSSProperties = {
  width: 184,
  minHeight: 56,
  padding: 0,
  border: '1px solid #2f4368',
  borderRadius: 8,
  background: '#0b1425',
  color: '#f8fafc',
  fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  textAlign: 'left',
};

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

function relationDisplayName(rel: Rel): string {
  switch (rel.relType.case) {
    case 'read': {
      const readType = rel.relType.value.readType;
      const objectName =
        readType.case === 'namedTable' ? readType.value.names.join('.') : readType.case || 'source';
      return `SOURCE\n${objectName}`;
    }
    case 'filter':
      return 'FILTER\nFilterRel';
    case 'project':
      return 'PROJECT\nProjectRel';
    case 'join':
      return 'JOIN\nJoinRel';
    case 'aggregate':
      return 'GROUP\nAggregateRel';
    case 'set':
      return 'SET\nSetRel';
    case undefined:
      return 'RELATION\nunknown';
    default:
      return `${rel.relType.case.toUpperCase()}\n${rel.relType.case}`;
  }
}

function relationAnchor(rel: Rel): number | null {
  switch (rel.relType.case) {
    case 'read':
    case 'filter':
    case 'project':
    case 'join':
    case 'aggregate':
    case 'set':
      return rel.relType.value.common?.relAnchor ?? null;
    default:
      return null;
  }
}

function relationInputs(rel: Rel): readonly Rel[] {
  switch (rel.relType.case) {
    case 'filter':
    case 'project':
    case 'aggregate':
      return rel.relType.value.input == null ? [] : [rel.relType.value.input];
    case 'join':
      return [rel.relType.value.left, rel.relType.value.right].filter(
        (candidate): candidate is Rel => candidate != null
      );
    case 'set':
      return rel.relType.value.inputs;
    default:
      return [];
  }
}

function expressionsOwnedByRelation(rel: Rel): readonly Expression[] {
  switch (rel.relType.case) {
    case 'filter':
      return rel.relType.value.condition == null ? [] : [rel.relType.value.condition];
    case 'join':
      return rel.relType.value.expression == null ? [] : [rel.relType.value.expression];
    case 'project':
      return rel.relType.value.expressions;
    default:
      return [];
  }
}

function relationFieldNames(rel: Rel, qualifyReadFields = false): readonly string[] {
  if (rel.relType.case === 'read') {
    const names = rel.relType.value.baseSchema?.names ?? [];
    const readType = rel.relType.value.readType;
    const relationName = readType.case === 'namedTable' ? readType.value.names.join('.') : null;
    return qualifyReadFields && relationName
      ? names.map((name) => `${relationName}.${name}`)
      : names;
  }

  const inputs = relationInputs(rel);
  const inputNames =
    rel.relType.case === 'join'
      ? inputs.flatMap((input) => relationFieldNames(input, qualifyReadFields))
      : inputs.flatMap((input) => relationFieldNames(input, false));
  const common =
    rel.relType.case === 'filter' ||
    rel.relType.case === 'project' ||
    rel.relType.case === 'join' ||
    rel.relType.case === 'aggregate' ||
    rel.relType.case === 'set'
      ? rel.relType.value.common
      : undefined;
  return common?.emitKind.case === 'emit'
    ? common.emitKind.value.outputMapping.flatMap((ordinal) =>
        inputNames[ordinal] == null ? [] : [inputNames[ordinal]]
      )
    : inputNames;
}

function functionNames(plan: Plan): ReadonlyMap<number, string> {
  return new Map(
    plan.extensions.flatMap((entry) =>
      entry.mappingType.case === 'extensionFunction'
        ? [[entry.mappingType.value.functionAnchor, entry.mappingType.value.name] as const]
        : []
    )
  );
}

function operatorLabel(name: string): string {
  const aliases: Readonly<Record<string, string>> = {
    equal: '=',
    not_equal: '!=',
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
  const literal = expression.rexType.value.literalType;
  if (literal.case === 'string') return `'${literal.value}'`;
  if (literal.case === undefined) return 'NULL';
  return `${literal.case}: ${String(literal.value)}`;
}

function layoutGraph(
  nodes: readonly Node<SemanticWorkbenchNodeData>[],
  edges: readonly Edge[]
): Node<SemanticWorkbenchNodeData>[] {
  const groups = [
    { id: 'source', label: 'FUENTES', color: '#3b82f6' },
    { id: 'condition', label: 'CONDICIÓN DEL JOIN', color: '#10b981' },
    { id: 'transformation', label: 'TRANSFORMACIÓN', color: '#06b6d4' },
  ] as const;
  const frames: Node<SemanticWorkbenchNodeData>[] = [];
  const positionedNodes: Node<SemanticWorkbenchNodeData>[] = [];
  let groupLeft = 24;

  for (const group of groups) {
    const members = nodes.filter((node) => node.data.semanticGroup === group.id);
    if (members.length === 0) continue;

    const memberIds = new Set(members.map((node) => node.id));
    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: 'LR', ranksep: 68, nodesep: 30, marginx: 0, marginy: 0 });
    for (const node of members) {
      graph.setNode(node.id, {
        width: typeof node.style?.width === 'number' ? node.style.width : 184,
        height: typeof node.style?.minHeight === 'number' ? node.style.minHeight : 56,
      });
    }
    for (const edge of edges) {
      if (memberIds.has(edge.source) && memberIds.has(edge.target)) {
        graph.setEdge(edge.source, edge.target);
      }
    }
    dagre.layout(graph);

    const bounds = members.map((node) => {
      const position = graph.node(node.id) as { x: number; y: number };
      const width = typeof node.style?.width === 'number' ? node.style.width : 184;
      const height = typeof node.style?.minHeight === 'number' ? node.style.minHeight : 56;
      return {
        node,
        left: position.x - width / 2,
        top: position.y - height / 2,
        right: position.x + width / 2,
        bottom: position.y + height / 2,
      };
    });
    const contentLeft = Math.min(...bounds.map((bound) => bound.left));
    const contentTop = Math.min(...bounds.map((bound) => bound.top));
    const contentRight = Math.max(...bounds.map((bound) => bound.right));
    const contentBottom = Math.max(...bounds.map((bound) => bound.bottom));
    const frameWidth = contentRight - contentLeft + 48;
    const frameHeight = contentBottom - contentTop + 76;

    frames.push({
      id: `semantic-group-${group.id}`,
      position: { x: groupLeft, y: 24 },
      data: {
        label: group.label,
        semanticKind: 'group',
        semanticGroup: group.id,
        detail: group.label,
      },
      selectable: false,
      draggable: false,
      connectable: false,
      focusable: false,
      zIndex: -1,
      style: {
        width: frameWidth,
        height: frameHeight,
        padding: '10px 12px',
        border: `1px dashed ${group.color}`,
        borderRadius: 10,
        background: `${group.color}0a`,
        color: group.color,
        boxSizing: 'border-box',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.07em',
        textAlign: 'left',
        pointerEvents: 'none',
      },
    });
    positionedNodes.push(
      ...bounds.map(({ node, left, top }) => ({
        ...node,
        position: {
          x: groupLeft + 24 + left - contentLeft,
          y: 68 + top - contentTop,
        },
      }))
    );
    groupLeft += frameWidth + 72;
  }

  return [...frames, ...positionedNodes];
}

export function projectSemanticWorkbenchGraph(
  transformNode: CanonicalNode
): SemanticWorkbenchGraph {
  const authority = readDvtTransformAuthoringAuthority(transformNode);
  if (authority == null) throw new Error('Semantic Workbench requires a DVT semantic authority.');
  const draft = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
  const root = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : undefined;
  if (root?.case !== 'root' || root.value.input == null) {
    throw new Error('Semantic Workbench requires one canonical Substrait root relation.');
  }

  const namesByFunctionAnchor = functionNames(draft.plan);
  const relationIdByAnchor = new Map(
    draft.sidecar.relations.map((binding) => [binding.relAnchor, binding.relationId] as const)
  );
  const nodes: Node<SemanticWorkbenchNodeData>[] = [];
  const edges: Edge[] = [];
  let sequence = 0;
  let relationCount = 0;
  let expressionCount = 0;

  function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}-${sequence}`;
  }

  function describeExpression(expression: Expression, fieldNames: readonly string[]): string {
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
          ? [describeExpression(argument.argType.value, fieldNames)]
          : []
      );
      return argumentsList.length === 2
        ? `${argumentsList[0]} ${operator} ${argumentsList[1]}`
        : `${operator}(${argumentsList.join(', ')})`;
    }
    return expression.rexType.case ?? 'expression';
  }

  function addExpression(expression: Expression, fieldNames: readonly string[]): string {
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
          detail: `Valor literal: ${literalLabel(expression)}`,
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
          detail: expressionDetail,
          expression: expressionDetail,
        },
        style: EXPRESSION_STYLE,
      });
      for (const argument of scalar.arguments) {
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

  function addRelation(rel: Rel): string {
    relationCount += 1;
    const anchor = relationAnchor(rel);
    const relationId = anchor == null ? null : relationIdByAnchor.get(anchor);
    const id = relationId ?? nextId('relation');
    const inputs = relationInputs(rel);
    const outputFields = relationFieldNames(rel);
    const expressionFields =
      rel.relType.case === 'join'
        ? inputs.flatMap((input) => relationFieldNames(input, true))
        : inputs.flatMap((input) => relationFieldNames(input));
    const ownedExpressions = expressionsOwnedByRelation(rel);
    const expression =
      ownedExpressions[0] == null
        ? undefined
        : describeExpression(ownedExpressions[0], expressionFields);
    const displayName = relationDisplayName(rel);
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: displayName,
        semanticKind: 'relation',
        semanticGroup: rel.relType.case === 'read' ? 'source' : 'transformation',
        detail: `${displayName.replace('\n', ' · ')} · ${outputFields.length} columnas`,
        ...(expression == null ? {} : { expression }),
        ...(inputs.length === 0
          ? {}
          : {
              inputSummary:
                rel.relType.case === 'join'
                  ? `${inputs.length} fuentes`
                  : `${inputs.length} entradas`,
            }),
        outputSummary: `${outputFields.length} columnas`,
      },
      style: RELATION_STYLE,
    });
    for (const input of relationInputs(rel)) {
      const inputId = addRelation(input);
      edges.push({
        id: nextId('edge'),
        source: inputId,
        target: id,
        type: 'smoothstep',
        data: { semanticEdgeKind: 'relation' },
        style: { stroke: '#4f8cff', strokeWidth: 1.5 },
      });
    }
    for (const ownedExpression of ownedExpressions) {
      const expressionId = addExpression(ownedExpression, expressionFields);
      edges.push({
        id: nextId('edge'),
        source: expressionId,
        target: id,
        type: 'smoothstep',
        data: { semanticEdgeKind: 'expression' },
        style: { stroke: '#10b981', strokeWidth: 1.4 },
      });
    }
    return id;
  }

  addRelation(root.value.input);
  const rootRelationAnchor = relationAnchor(root.value.input);
  const relationId =
    rootRelationAnchor == null
      ? transformNode.id
      : (relationIdByAnchor.get(rootRelationAnchor) ?? transformNode.id);

  return {
    nodes: layoutGraph(nodes, edges),
    edges,
    relationCount,
    expressionCount,
    relationId,
  };
}
