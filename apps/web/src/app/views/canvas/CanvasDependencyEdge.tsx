/** Owned concern: render one directed Canvas dependency without owning graph semantics. */
import { BaseEdge, getSmoothStepPath, Position, type Edge, type EdgeProps } from '@xyflow/react';
import { type ReactElement } from 'react';

import { createGraphFlowEdgeStyle, graphFlowPalette } from '../../plugins/graph/graphVisualTokens';

type CanvasDependencyFlowEdge = Edge;

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
  const tipX = targetX + direction.x * graphFlowPalette.directionCueTargetOverlap;
  const tipY = targetY + direction.y * graphFlowPalette.directionCueTargetOverlap;
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
}: EdgeProps<CanvasDependencyFlowEdge>): ReactElement {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const resolvedStyle = style ?? createGraphFlowEdgeStyle();

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={resolvedStyle}
        interactionWidth={interactionWidth ?? graphFlowPalette.edgeInteractionWidth}
      />
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
