/** Owned concern: render one directed Canvas dependency without owning graph semantics. */
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from '@xyflow/react';
import { useId, type ReactElement } from 'react';

import { createGraphFlowEdgeStyle, graphFlowPalette } from '../../plugins/graph/graphVisualTokens';
import {
  readCanvasDependencyEdgeData,
  type CanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';

export function CanvasDependencyEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  interactionWidth,
  selected,
  data,
}: EdgeProps<Edge<CanvasDependencyEdgeData>>): ReactElement {
  const markerId = useId().replaceAll(':', '');
  const dependency = readCanvasDependencyEdgeData(data);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });
  const execution = dependency?.execution;
  const closed = execution?.gateState === 'closed';
  const resolvedStyle = {
    ...(style ?? createGraphFlowEdgeStyle()),
    ...(closed
      ? {
          strokeDasharray: graphFlowPalette.closedEdgeDashArray,
          opacity: graphFlowPalette.closedEdgeOpacity,
        }
      : {}),
    ...(selected
      ? {
          strokeWidth: graphFlowPalette.selectedEdgeStrokeWidth,
        }
      : {}),
  };
  const stroke =
    typeof resolvedStyle.stroke === 'string' ? resolvedStyle.stroke : graphFlowPalette.edgeStroke;
  return (
    <>
      <defs>
        <marker
          id={markerId}
          data-slot="canvas-dependency-direction-cue"
          viewBox="0 0 8 8"
          markerWidth="8"
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          refX="8"
          refY="4"
          orient="auto"
          aria-hidden="true"
          pointerEvents="none"
        >
          <path d="M0,0 L8,4 L0,8 Z" fill={stroke} opacity={resolvedStyle.opacity} />
        </marker>
      </defs>
      <BaseEdge
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={resolvedStyle}
        interactionWidth={interactionWidth ?? graphFlowPalette.edgeInteractionWidth}
      />
      {closed ? (
        <g
          data-slot="canvas-dependency-closed-gate"
          data-state="closed"
          aria-hidden="true"
          pointerEvents="none"
          transform={`translate(${labelX} ${labelY})`}
          stroke={stroke}
          strokeWidth={graphFlowPalette.gateGlyphStrokeWidth}
        >
          <circle r={graphFlowPalette.gateGlyphRadius} fill="var(--canvas-surface)" />
          <line x1="-4" y1="-4" x2="4" y2="4" />
          <line x1="4" y1="-4" x2="-4" y2="4" />
        </g>
      ) : null}
    </>
  );
}
