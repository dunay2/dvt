import { Position, type Edge, type Node, type SmoothStepPathOptions } from '@xyflow/react';
import type { Expression, Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { CSSProperties } from 'react';

import type { CanonicalNode } from '../../types/canonical';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { createSemanticExpressionProjector } from './semanticExpressionGraphProjection';
import { layoutSemanticExpressionGraph } from './semanticExpressionGraphLayout';
import { semanticExpressionStyles } from './semanticExpressionGraphLayout';
import { createSemanticExpressionDescription } from './semanticExpressionDescription';
import { getLayoutedElements } from './canvasGraphUtils';
import { childInputs, relationAnchor } from './canvasRelationalTraversal';

export type SemanticWorkbenchGroup = 'source' | 'condition' | 'transformation';

export type SemanticWorkbenchNodeData = Readonly<{
  label: string;
  semanticKind: 'group' | 'relation' | 'expression' | 'field' | 'literal';
  semanticGroup: SemanticWorkbenchGroup;
  relationKind?: 'read' | 'filter' | 'project' | 'join' | 'aggregate' | 'set' | 'unknown';
  detail: string;
  expression?: string;
  inputSummary?: string;
  outputSummary?: string;
  joinOperand?: Readonly<{
    joinRelationId: string;
    operand: 'left' | 'right';
  }>;
  joinConditionIndex?: number;
  fieldReference?: Readonly<{ fieldId: string; relationId: string; sourceFieldId?: string }>;
}>;

type SemanticWorkbenchEdgeData = Readonly<{
  semanticEdgeKind: 'relation' | 'expression';
}>;

type SemanticWorkbenchEdge = Edge<SemanticWorkbenchEdgeData, 'smoothstep'> & {
  pathOptions?: SmoothStepPathOptions;
};

export type SemanticWorkbenchGraph = Readonly<{
  nodes: Node<SemanticWorkbenchNodeData>[];
  edges: SemanticWorkbenchEdge[];
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
      return 'JOIN · INNER';
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

function relationInputs(rel: Rel): readonly Rel[] {
  return childInputs(rel).map(({ rel: input }) => input);
}

function relationSourceCount(rel: Rel): number {
  if (rel.relType.case === 'read') return 1;
  return relationInputs(rel).reduce((count, input) => count + relationSourceCount(input), 0);
}

function expressionsOwnedByRelation(rel: Rel): readonly Expression[] {
  switch (rel.relType.case) {
    case 'filter':
      return rel.relType.value.condition == null ? [] : [rel.relType.value.condition];
    case 'join':
      return rel.relType.value.expression == null ? [] : [rel.relType.value.expression];
    case 'project':
      return rel.relType.value.expressions;
    case 'aggregate':
      return rel.relType.value.groupingExpressions;
    default:
      return [];
  }
}

function relationFieldNames(
  rel: Rel,
  qualifyReadFields = false,
  bindingNames?: ReadonlyMap<number, readonly string[]>
): readonly string[] {
  if (rel.relType.case === 'read') {
    const names = rel.relType.value.baseSchema?.names ?? [];
    const readType = rel.relType.value.readType;
    const relationName = readType.case === 'namedTable' ? readType.value.names.join('.') : null;
    return qualifyReadFields && relationName
      ? names.map((name) => `${relationName}.${name}`)
      : names;
  }

  const boundNames = bindingNames?.get(relationAnchor(rel) ?? -1);
  if (!qualifyReadFields && boundNames != null && boundNames.length > 0) return boundNames;

  const inputs = relationInputs(rel);
  const inputNames =
    rel.relType.case === 'join'
      ? inputs.flatMap((input) => relationFieldNames(input, qualifyReadFields, bindingNames))
      : inputs.flatMap((input) => relationFieldNames(input, false, bindingNames));
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

function routeEdgesByTransition(
  nodes: readonly Node<SemanticWorkbenchNodeData>[],
  edges: readonly SemanticWorkbenchEdge[]
): SemanticWorkbenchEdge[] {
  const semanticGroupByNodeId = new Map(
    nodes.map((node) => [node.id, node.data.semanticGroup] as const)
  );
  const transitionKey = (edge: SemanticWorkbenchEdge) =>
    `${edge.data?.semanticEdgeKind ?? 'unknown'}:${semanticGroupByNodeId.get(edge.source) ?? 'unknown'}->${semanticGroupByNodeId.get(edge.target) ?? 'unknown'}`;
  const laneCountByTransition = new Map<string, number>();
  edges.forEach((edge) => {
    const key = transitionKey(edge);
    laneCountByTransition.set(key, (laneCountByTransition.get(key) ?? 0) + 1);
  });
  const laneIndexByTransition = new Map<string, number>();

  return edges.map((edge) => {
    const key = transitionKey(edge);
    const laneIndex = laneIndexByTransition.get(key) ?? 0;
    const laneCount = laneCountByTransition.get(key) ?? 1;
    laneIndexByTransition.set(key, laneIndex + 1);
    return {
      ...edge,
      pathOptions: {
        ...edge.pathOptions,
        stepPosition: (laneIndex + 1) / (laneCount + 1),
      },
    };
  });
}

function layoutGraph(
  nodes: readonly Node<SemanticWorkbenchNodeData>[],
  edges: readonly SemanticWorkbenchEdge[],
  transformationRankdir: 'LR' | 'TB' = 'TB'
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
    const groupNodeId = `semantic-group-${group.id}`;

    const memberIds = new Set(members.map((node) => node.id));
    const memberEdges = edges.filter(
      (edge) => memberIds.has(edge.source) && memberIds.has(edge.target)
    );
    const layouted = getLayoutedElements([...members], memberEdges, {
      rankdir: group.id === 'transformation' ? transformationRankdir : 'LR',
      ranksep: 68,
      nodesep: 30,
      marginx: 0,
      marginy: 0,
      nodeSize: { width: 206, height: 56 },
    }).nodes;

    const bounds = layouted.map((node) => {
      const width = typeof node.style?.width === 'number' ? node.style.width : 184;
      const height = typeof node.style?.minHeight === 'number' ? node.style.minHeight : 56;
      return {
        node,
        left: node.position.x,
        top: node.position.y,
        right: node.position.x + width,
        bottom: node.position.y + height,
      };
    });
    const contentLeft = Math.min(...bounds.map((bound) => bound.left));
    const contentTop = Math.min(...bounds.map((bound) => bound.top));
    const contentRight = Math.max(...bounds.map((bound) => bound.right));
    const contentBottom = Math.max(...bounds.map((bound) => bound.bottom));
    const frameWidth = contentRight - contentLeft + 48;
    const frameHeight = contentBottom - contentTop + 76;

    frames.push({
      id: groupNodeId,
      type: 'group',
      position: { x: groupLeft, y: 24 },
      data: {
        label: group.label,
        semanticKind: 'group',
        semanticGroup: group.id,
        detail: group.label,
      },
      selectable: false,
      draggable: true,
      connectable: false,
      focusable: false,
      zIndex: 0,
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
        cursor: 'grab',
      },
    });
    positionedNodes.push(
      ...bounds.map(({ node, left, top }) => ({
        ...node,
        parentId: groupNodeId,
        extent: 'parent' as const,
        draggable: false,
        zIndex: 1,
        position: {
          x: 24 + left - contentLeft,
          y: 44 + top - contentTop,
        },
      }))
    );
    groupLeft += frameWidth + 72;
  }

  return [...frames, ...positionedNodes];
}

export function projectSemanticWorkbenchGraph(
  transformNode: CanonicalNode,
  options: Readonly<{
    view?: 'complete' | 'relations' | 'relation-expressions';
    expressionRelationId?: string;
  }> = {}
): SemanticWorkbenchGraph {
  const authority = readDvtTransformAuthoringAuthority(transformNode);
  if (authority == null) throw new Error('Semantic Workbench requires a DVT semantic authority.');
  const draft = decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
  const root = draft.plan.relations.length === 1 ? draft.plan.relations[0]?.relType : undefined;
  if (root?.case !== 'root' || root.value.input == null) {
    throw new Error('Semantic Workbench requires one canonical Substrait root relation.');
  }

  const bindingNames = new Map(
    draft.sidecar.relations.map(
      (binding) =>
        [
          binding.relAnchor,
          draft.sidecar.fields
            .filter((field) => field.relationId === binding.relationId)
            .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
            .map((field) => field.displayName ?? field.fieldId),
        ] as const
    )
  );
  const relationIdByAnchor = new Map(
    draft.sidecar.relations.map((binding) => [binding.relAnchor, binding.relationId] as const)
  );
  const nodes: Node<SemanticWorkbenchNodeData>[] = [];
  const edges: SemanticWorkbenchEdge[] = [];
  let sequence = 0;
  let relationCount = 0;
  let aggregateCount = 0;
  const { functionName } = createSemanticExpressionDescription(draft.plan);
  const expressionProjector = createSemanticExpressionProjector({
    plan: draft.plan,
    nodes,
    edges,
    nextId,
  });
  const { addExpression, describeExpression } = expressionProjector;

  function nextId(prefix: string): string {
    sequence += 1;
    return `${prefix}-${sequence}`;
  }

  function addRelation(rel: Rel): string {
    relationCount += 1;
    const anchor = relationAnchor(rel);
    const relationId = anchor == null ? null : relationIdByAnchor.get(anchor);
    const id = relationId ?? nextId('relation');
    const inputs = relationInputs(rel);
    const outputFields = relationFieldNames(rel, false, bindingNames);
    const expressionFields =
      rel.relType.case === 'join'
        ? inputs.flatMap((input) => relationFieldNames(input, true, bindingNames))
        : inputs.flatMap((input) => relationFieldNames(input, false, bindingNames));
    const ownedExpressions = expressionsOwnedByRelation(rel);
    const expression =
      ownedExpressions[0] == null
        ? undefined
        : describeExpression(ownedExpressions[0], expressionFields);
    const displayName = relationDisplayName(rel);
    const relationKind =
      rel.relType.case === 'read' ||
      rel.relType.case === 'filter' ||
      rel.relType.case === 'project' ||
      rel.relType.case === 'join' ||
      rel.relType.case === 'aggregate' ||
      rel.relType.case === 'set'
        ? rel.relType.case
        : 'unknown';
    nodes.push({
      id,
      type: 'semanticRelation',
      position: { x: 0, y: 0 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label:
          rel.relType.case === 'join' && expression != null
            ? `${displayName}\n${expression}`
            : displayName,
        semanticKind: 'relation',
        relationKind,
        semanticGroup: rel.relType.case === 'read' ? 'source' : 'transformation',
        detail: `${[displayName.replaceAll('\n', ' · '), expression]
          .filter((value) => value != null)
          .join(' · ')} · ${outputFields.length} columnas`,
        ...(expression == null ? {} : { expression }),
        ...(inputs.length === 0
          ? {}
          : {
              inputSummary:
                rel.relType.case === 'join'
                  ? `${relationSourceCount(rel)} fuentes`
                  : `${inputs.length} entradas`,
            }),
        outputSummary: `${outputFields.length} columnas`,
      },
      style:
        rel.relType.case === 'join'
          ? { ...RELATION_STYLE, width: 250, minHeight: 76 }
          : RELATION_STYLE,
    });
    for (const [inputIndex, input] of relationInputs(rel).entries()) {
      const inputId = addRelation(input);
      edges.push({
        id: nextId('edge'),
        source: inputId,
        target: id,
        sourceHandle: 'out',
        targetHandle: rel.relType.case === 'join' ? (inputIndex === 0 ? 'left' : 'right') : 'in',
        type: 'smoothstep',
        data: { semanticEdgeKind: 'relation' },
        style: { stroke: '#4f8cff', strokeWidth: 1.5 },
      });
    }
    for (const ownedExpression of ownedExpressions) {
      const expressionId = addExpression(
        ownedExpression,
        expressionFields,
        rel.relType.case === 'join' ? { joinRelationId: id } : undefined
      );
      edges.push({
        id: nextId('edge'),
        source: expressionId,
        target: id,
        type: 'smoothstep',
        data: { semanticEdgeKind: 'expression' },
        style: { stroke: '#10b981', strokeWidth: 1.4 },
      });
    }
    if (rel.relType.case === 'aggregate') {
      for (const { measure } of rel.relType.value.measures) {
        if (measure == null) continue;
        const measureId = nextId('aggregate-expression');
        aggregateCount += 1;
        const name = functionName(measure.functionReference);
        nodes.push({
          id: measureId,
          type: 'default',
          position: { x: 0, y: 0 },
          data: {
            label: `${name.toUpperCase()}\n${measure.arguments.length === 0 ? '(*)' : name}`,
            semanticKind: 'expression',
            semanticGroup: 'condition',
            detail: name,
          },
          style: semanticExpressionStyles.expression,
        });
        edges.push({
          id: nextId('edge'),
          source: measureId,
          target: id,
          data: { semanticEdgeKind: 'expression' },
        });
        for (const argument of measure.arguments) {
          if (argument.argType.case !== 'value') continue;
          const argumentId = addExpression(argument.argType.value, expressionFields);
          edges.push({
            id: nextId('edge'),
            source: argumentId,
            target: measureId,
            data: { semanticEdgeKind: 'expression' },
          });
        }
      }
    }
    return id;
  }

  addRelation(root.value.input);
  const rootRelationAnchor = relationAnchor(root.value.input);
  const relationId =
    rootRelationAnchor == null
      ? transformNode.id
      : (relationIdByAnchor.get(rootRelationAnchor) ?? transformNode.id);
  const routedEdges = routeEdgesByTransition(nodes, edges);

  if (options.view === 'relations') {
    const relationNodes = nodes.filter((node) => node.data.semanticKind === 'relation');
    const relationEdges = routedEdges.filter((edge) => edge.data?.semanticEdgeKind === 'relation');
    return {
      nodes: layoutGraph(relationNodes, relationEdges, 'LR'),
      edges: relationEdges,
      relationCount,
      expressionCount: expressionProjector.count,
      relationId,
    };
  }

  if (options.view === 'relation-expressions') {
    if (options.expressionRelationId == null) {
      throw new Error('Expression view requires a selected relation identity.');
    }
    const includedNodeIds = new Set<string>();
    const pendingNodeIds = edges.flatMap((edge) =>
      edge.data?.semanticEdgeKind === 'expression' && edge.target === options.expressionRelationId
        ? [edge.source]
        : []
    );
    while (pendingNodeIds.length > 0) {
      const nodeId = pendingNodeIds.pop();
      if (nodeId == null || includedNodeIds.has(nodeId)) continue;
      includedNodeIds.add(nodeId);
      pendingNodeIds.push(
        ...edges.flatMap((edge) =>
          edge.data?.semanticEdgeKind === 'expression' && edge.target === nodeId
            ? [edge.source]
            : []
        )
      );
    }
    if (includedNodeIds.size === 0) {
      throw new Error('Selected relation does not own a projected scalar expression.');
    }
    const expressionNodes = nodes
      .filter((node) => includedNodeIds.has(node.id))
      .map((node) => ({
        ...node,
        sourcePosition: Position.Top,
        targetPosition: Position.Bottom,
      }));
    const expressionEdges = edges
      .filter(
        (edge) =>
          edge.data?.semanticEdgeKind === 'expression' &&
          includedNodeIds.has(edge.source) &&
          includedNodeIds.has(edge.target)
      )
      .map((edge) => ({
        ...edge,
        pathOptions: { borderRadius: 8, offset: 16, stepPosition: 0.5 },
      }));
    return layoutSemanticExpressionGraph({
      nodes: expressionNodes,
      edges: expressionEdges,
      relationCount: 0,
      expressionCount: expressionNodes.length,
      relationId: options.expressionRelationId,
    });
  }

  return {
    nodes: layoutGraph(nodes, routedEdges),
    edges: routedEdges,
    relationCount,
    expressionCount: expressionProjector.count + aggregateCount,
    relationId,
  };
}
