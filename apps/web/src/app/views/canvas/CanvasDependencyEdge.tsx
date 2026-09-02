/** Owned concern: render one directed Canvas dependency without owning graph semantics. */
import { BaseEdge, getSmoothStepPath, Position, type Edge, type EdgeProps } from '@xyflow/react';
import { type ReactElement } from 'react';

import { createGraphFlowEdgeStyle, graphFlowPalette } from '../../plugins/graph/graphVisualTokens';
import {
  readCanvasDependencyEdgeData,
  type CanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';

type CanvasDependencyFlowEdge = Edge<CanvasDependencyEdgeData>;

function resolveIncomingDirection(targetPosition: Position): Readonly<{ x: number; y: number }> {
  switch (targetPosition) {
    case Position.Right:
      return { x: -1, y: 0 };
    case Position.Top:
      return { x: 0, y: 1 };
    case Position.Bottom:
      return { x: 0, y: -1 };
    case Position.Left:
    default:
      return { x: 1, y: 0 };
  }
}

export function resolveCanvasDependencyArrowPoints(
  targetX: number,
  targetY: number,
  targetPosition: Position
): string {
  const direction = resolveIncomingDirection(targetPosition);
  const tipX = targetX - direction.x * graphFlowPalette.directionCueTargetClearance;
  const tipY = targetY - direction.y * graphFlowPalette.directionCueTargetClearance;
  const baseX = tipX - direction.x * graphFlowPalette.directionCueLength;
  const baseY = tipY - direction.y * graphFlowPalette.directionCueLength;
  const perpendicularX = direction.y;
  const perpendicularY = -direction.x;
  const halfWidth = graphFlowPalette.directionCueHalfWidth;

  return [
    `${tipX},${tipY}`,
    `${baseX + perpendicularX * halfWidth},${baseY + perpendicularY * halfWidth}`,
    `${baseX - perpendicularX * halfWidth},${baseY - perpendicularY * halfWidth}`,
  ].join(' ');
}

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
}: EdgeProps<CanvasDependencyFlowEdge>): ReactElement {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const execution = readCanvasDependencyEdgeData(data)?.execution;
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
          stroke: 'var(--status-info)',
        }
      : {}),
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
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
          stroke={
            typeof resolvedStyle.stroke === 'string'
              ? resolvedStyle.stroke
              : graphFlowPalette.edgeStroke
          }
          strokeWidth={graphFlowPalette.gateGlyphStrokeWidth}
        >
          <circle r={graphFlowPalette.gateGlyphRadius} fill="var(--canvas-surface)" />
          <line x1="-4" y1="-4" x2="4" y2="4" />
          <line x1="4" y1="-4" x2="-4" y2="4" />
        </g>
      ) : null}
      <polygon
        data-slot="canvas-dependency-direction-cue"
        aria-hidden="true"
        pointerEvents="none"
        points={resolveCanvasDependencyArrowPoints(targetX, targetY, targetPosition)}
        style={{
          fill:
            typeof resolvedStyle.stroke === 'string'
              ? resolvedStyle.stroke
              : graphFlowPalette.edgeStroke,
        }}
      />
    </>
  );
}
