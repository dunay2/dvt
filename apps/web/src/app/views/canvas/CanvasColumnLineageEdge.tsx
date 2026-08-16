/** Owned concern: render derived column lineage without owning semantic mapping state. */
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import { type ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import type { CanvasColumnLineageEdgeData } from './canvasColumnLineageProjection';

export type InteractiveCanvasColumnLineageEdgeData = CanvasColumnLineageEdgeData &
  Readonly<{ onRemove?: () => void }>;

type CanvasColumnLineageFlowEdge = Edge<InteractiveCanvasColumnLineageEdgeData>;

export function CanvasColumnLineageEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data,
}: EdgeProps<CanvasColumnLineageFlowEdge>): ReactElement {
  const language = useApplicationLanguageStore((state) => state.language);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.32,
  });
  const removeLabel =
    language === 'es'
      ? `Eliminar asignación ${data?.sourceColumnName ?? ''} a ${data?.targetColumnName ?? ''}`
      : `Remove mapping ${data?.sourceColumnName ?? ''} to ${data?.targetColumnName ?? ''}`;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={18}
        data-slot="canvas-column-lineage-edge"
        style={{
          stroke: selected ? 'var(--status-info)' : 'var(--canvas-node-port-model-ring)',
          strokeDasharray: '4 3',
          strokeWidth: selected ? 2.25 : 1.5,
        }}
      />
      {selected && data?.removable === true && data.onRemove != null ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            data-slot="canvas-column-lineage-remove"
            {...canvasNodeEmbeddedControlProps}
            aria-label={removeLabel}
            title={removeLabel}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              data.onRemove?.();
            }}
            className="pointer-events-auto absolute z-50 rounded border border-purple-400/70 bg-slate-950 px-2 py-1 text-[10px] font-semibold text-purple-100 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {language === 'es' ? 'Eliminar' : 'Remove'}
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
