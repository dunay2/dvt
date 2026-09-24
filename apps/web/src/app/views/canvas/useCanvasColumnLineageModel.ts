import { useCallback, useMemo, useState } from 'react';
import type { Node, Edge, EdgeChange } from '@xyflow/react';
import type { CanonicalNode, CanonicalEdge } from '../../types/canonical';
import {
  projectCanvasColumnLineage,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import type { InteractiveCanvasColumnLineageEdgeData } from './CanvasColumnLineageEdge';
import { isCanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';

type Args = {
  semanticGraphNodes: Node[];
  visibleScope: { canonicalNodes: CanonicalNode[]; canonicalEdges: CanonicalEdge[] };
  edges: Edge[];
  onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  onRemoveColumnMapping?: (mapping: CanvasColumnLineageEdgeData) => void;
};
export function useCanvasColumnLineageModel({
  semanticGraphNodes,
  visibleScope,
  edges,
  onEdgesChange,
  onRemoveColumnMapping,
}: Args) {
  const [selectedColumnLineageEdgeId, setSelectedColumnLineageEdgeId] = useState<string | null>(
    null
  );
  const projectedColumnLineage = useMemo(() => {
    const expandedNodeIds = new Set(
      semanticGraphNodes
        .filter((node) => node.data.columnDisclosureExpanded === true)
        .map((node) => node.id)
    );
    return projectCanvasColumnLineage({
      nodes: visibleScope.canonicalNodes,
      edges: visibleScope.canonicalEdges,
      expandedNodeIds,
      presentations: new Map(
        semanticGraphNodes.flatMap((node) =>
          isCanvasNodePresentationTruth(node.data.presentationTruth)
            ? [[node.id, node.data.presentationTruth] as const]
            : []
        )
      ),
    });
  }, [semanticGraphNodes, visibleScope.canonicalEdges, visibleScope.canonicalNodes]);
  const readOnlyColumnLineageNodeIds = useMemo(
    () =>
      new Set(
        projectedColumnLineage
          .filter((edge) => edge.data?.removable !== true)
          .flatMap((edge) => [edge.source, edge.target])
      ),
    [projectedColumnLineage]
  );

  const edgesWithImpact = useMemo(() => {
    const lineageEdges = projectedColumnLineage.map((edge) => ({
      ...edge,
      selected: edge.id === selectedColumnLineageEdgeId,
      ariaLabel: `${edge.data?.sourceColumnName ?? ''} → ${edge.data?.targetColumnName ?? ''}`,
      data: {
        ...(edge.data as CanvasColumnLineageEdgeData),
        onRemove:
          edge.data?.removable === true && onRemoveColumnMapping != null
            ? () => onRemoveColumnMapping(edge.data as CanvasColumnLineageEdgeData)
            : undefined,
      } satisfies InteractiveCanvasColumnLineageEdgeData,
    }));
    return [...edges, ...lineageEdges];
  }, [onRemoveColumnMapping, edges, projectedColumnLineage, selectedColumnLineageEdgeId]);

  const columnLineageEdgesById = useMemo(
    () =>
      new Map(
        edgesWithImpact
          .filter((edge) => edge.type === 'columnLineage')
          .map((edge) => [edge.id, edge] as const)
      ),
    [edgesWithImpact]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      const baseEdgeChanges: EdgeChange<Edge>[] = [];

      for (const change of changes) {
        if (change.type === 'add' || change.type === 'replace') {
          baseEdgeChanges.push(change);
          continue;
        }
        const lineageEdge = columnLineageEdgesById.get(change.id);
        if (lineageEdge == null) {
          baseEdgeChanges.push(change);
          continue;
        }

        if (change.type === 'select') {
          setSelectedColumnLineageEdgeId((currentId) =>
            change.selected ? change.id : currentId === change.id ? null : currentId
          );
          continue;
        }

        if (change.type === 'remove') {
          const data = lineageEdge.data as InteractiveCanvasColumnLineageEdgeData | undefined;
          if (data?.removable === true) {
            data.onRemove?.();
          }
          setSelectedColumnLineageEdgeId((currentId) =>
            currentId === change.id ? null : currentId
          );
        }
      }

      if (baseEdgeChanges.length > 0) {
        onEdgesChange(baseEdgeChanges);
      }
    },
    [columnLineageEdgesById, onEdgesChange]
  );

  return { edgesWithImpact, handleEdgesChange, readOnlyColumnLineageNodeIds };
}
