/** Build the flat canonical relation/expression graph; layout belongs to its consumer. */
import { Position, type Node } from '@xyflow/react';
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type {
  SemanticWorkbenchGraph,
  SemanticWorkbenchNodeData,
} from './semanticWorkbenchProjection';
import { createSemanticExpressionProjector } from './semanticExpressionGraphProjection';
import { relationAnchor } from './canvasRelationalTraversal';
import { createCanvasSemanticFieldNames } from './canvasSemanticFieldNames';
import {
  RELATION_STYLE,
  relationDisplayName,
  relationInputs,
  relationSourceCount,
  expressionsOwnedByRelation,
} from './semanticWorkbenchRelationMetadata';
import { projectSemanticRelationDetails } from './semanticRelationDetailProjection';

export function projectSemanticWorkbenchRelations(
  draft: SubstraitDocument,
  root: Rel,
  transformNodeId: string
): SemanticWorkbenchGraph {
  const relationFieldNames = createCanvasSemanticFieldNames(draft);
  const relationIdByAnchor = new Map(
    draft.sidecar.relations.map((binding) => [binding.relAnchor, binding.relationId] as const)
  );
  const nodes: Node<SemanticWorkbenchNodeData>[] = [];
  const edges: SemanticWorkbenchGraph['edges'] = [];
  let sequence = 0;
  let relationCount = 0;
  let detailCount = 0;
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
    detailCount += projectSemanticRelationDetails({
      relation: rel,
      relationId: id,
      fields: expressionFields,
      plan: draft.plan,
      nodes,
      edges,
      nextId,
      addExpression,
    });
    return id;
  }

  addRelation(root);
  const rootRelationAnchor = relationAnchor(root);
  const relationId =
    rootRelationAnchor == null
      ? transformNodeId
      : (relationIdByAnchor.get(rootRelationAnchor) ?? transformNodeId);
  return {
    nodes,
    edges,
    relationCount,
    expressionCount: expressionProjector.count + detailCount,
    relationId,
  };
}
