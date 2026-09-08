import dagre from 'dagre';
import { Position, type Edge, type Node } from '@xyflow/react';
import type { Expression, Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';

import type { CanonicalNode } from '../types/canonical';
import { readDvtSubstraitFieldReferenceOrdinal } from '../views/canvas/canvasDvtSubstraitAggregation';
import { decodeDvtSubstraitSemanticDocument } from '../views/canvas/canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from '../views/canvas/canvasDvtTransformAuthoringAuthority';

export type SemanticWorkbenchNodeData = Readonly<{
  label: string;
  semanticKind: 'relation' | 'expression' | 'field' | 'literal';
}>;

export type SemanticWorkbenchGraph = Readonly<{
  nodes: readonly Node<SemanticWorkbenchNodeData>[];
  edges: readonly Edge[];
  relationCount: number;
  expressionCount: number;
  relationId: string;
}>;

const RELATION_STYLE = {
  width: 184,
  minHeight: 56,
  border: '1px solid #2f4368',
  borderRadius: 8,
  background: '#0b1425',
  color: '#f8fafc',
  fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'pre-line',
};

const EXPRESSION_STYLE = {
  width: 138,
  minHeight: 44,
  border: '1px solid #3b5b88',
  borderRadius: 8,
  background: '#10192d',
  color: '#e2e8f0',
  fontFamily: 'IBM Plex Mono, monospace',
  fontSize: 11,
  whiteSpace: 'pre-line',
};

const FIELD_STYLE = {
  ...EXPRESSION_STYLE,
  border: '1px solid #245f88',
  background: '#0a1829',
  color: '#7dd3fc',
};

const LITERAL_STYLE = {
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
    case 'project':
      return rel.relType.value.expressions;
    default:
      return [];
  }
}

function firstReadFieldNames(rel: Rel): readonly string[] {
  if (rel.relType.case === 'read') return rel.relType.value.baseSchema?.names ?? [];
  for (const input of relationInputs(rel)) {
    const names = firstReadFieldNames(input);
    if (names.length > 0) return names;
  }
  return [];
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
): readonly Node<SemanticWorkbenchNodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'LR', ranksep: 92, nodesep: 34, marginx: 24, marginy: 24 });
  for (const node of nodes) graph.setNode(node.id, { width: 184, height: 58 });
  for (const edge of edges) graph.setEdge(edge.source, edge.target);
  dagre.layout(graph);
  return nodes.map((node) => {
    const position = graph.node(node.id) as { x: number; y: number };
    return {
      ...node,
      position: { x: position.x - 92, y: position.y - 29 },
    };
  });
}

export function projectSemanticWorkbenchGraph(transformNode: CanonicalNode): SemanticWorkbenchGraph {
  const authority = readDvtTransformAuthoringAuthority(transformNode);
  if (authority == null) throw new Error('Semantic Workbench requires a DVT semantic authority.');
  const draft = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
  const root = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : undefined;
  if (root?.case !== 'root' || root.value.input == null) {
    throw new Error('Semantic Workbench requires one canonical Substrait root relation.');
  }

  const fieldNames = firstReadFieldNames(root.value.input);
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

  function addExpression(expression: Expression): string {
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
        data: { label, semanticKind: 'field' },
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
        data: { label: literalLabel(expression), semanticKind: 'literal' },
        style: LITERAL_STYLE,
      });
      return id;
    }
    if (expression.rexType.case === 'scalarFunction') {
      const scalar = expression.rexType.value;
      const functionName = namesByFunctionAnchor.get(scalar.functionReference) ?? `fn#${scalar.functionReference}`;
      const id = nextId('function');
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: operatorLabel(functionName), semanticKind: 'expression' },
        style: EXPRESSION_STYLE,
      });
      for (const argument of scalar.arguments) {
        if (argument.argType.case !== 'value') continue;
        const argumentId = addExpression(argument.argType.value);
        edges.push({ id: nextId('edge'), source: argumentId, target: id, type: 'smoothstep' });
      }
      return id;
    }
    if (expression.rexType.case === 'windowFunction') {
      const window = expression.rexType.value;
      const functionName = namesByFunctionAnchor.get(window.functionReference) ?? `fn#${window.functionReference}`;
      const id = nextId('window');
      nodes.push({
        id,
        position: { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { label: `WINDOW\n${functionName}`, semanticKind: 'expression' },
        style: EXPRESSION_STYLE,
      });
      for (const argument of window.arguments) {
        if (argument.argType.case !== 'value') continue;
        const argumentId = addExpression(argument.argType.value);
        edges.push({ id: nextId('edge'), source: argumentId, target: id, type: 'smoothstep' });
      }
      for (const partition of window.partitions) {
        const partitionId = addExpression(partition);
        edges.push({ id: nextId('edge'), source: partitionId, target: id, label: 'partition' });
      }
      for (const sort of window.sorts) {
        if (sort.expr == null) continue;
        const sortId = addExpression(sort.expr);
        edges.push({ id: nextId('edge'), source: sortId, target: id, label: 'order' });
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
        label: expression.rexType.case ?? 'expression',
        semanticKind: 'expression',
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
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { label: relationDisplayName(rel), semanticKind: 'relation' },
      style: RELATION_STYLE,
    });
    for (const input of relationInputs(rel)) {
      const inputId = addRelation(input);
      edges.push({
        id: nextId('edge'),
        source: inputId,
        target: id,
        type: 'smoothstep',
        style: { stroke: '#4f8cff', strokeWidth: 1.5 },
      });
    }
    for (const expression of expressionsOwnedByRelation(rel)) {
      const expressionId = addExpression(expression);
      edges.push({
        id: nextId('edge'),
        source: expressionId,
        target: id,
        type: 'smoothstep',
        style: { stroke: '#7dd3fc', strokeWidth: 1 },
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
