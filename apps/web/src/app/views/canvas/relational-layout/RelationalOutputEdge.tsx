/** Render the single producer-to-Output relation and its explicit removal target. */
import { useId } from 'react';
import {
  CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
  type CanvasRelationalTreeLayout,
  type CanvasRelationalTreePlacedNode,
} from '../canvasRelationalTreeGeometry';
import { relationalEdgePath } from './relationalTreeEdgeProjection';
import { RelationalEdgeAction } from './RelationalEdgeAction';

export function RelationalOutputEdge({
  output,
  producer,
  removeLabel,
  onSelect,
  onDisconnect,
}: Readonly<{
  output: CanvasRelationalTreeLayout['output'];
  producer?: CanvasRelationalTreePlacedNode;
  removeLabel: string;
  onSelect?: () => void;
  onDisconnect?: () => void;
}>): JSX.Element | null {
  const markerId = useId().replaceAll(':', '');
  if (output == null || producer == null) return null;
  const path = relationalEdgePath({
    key: 'model-output',
    parentLocator: CANVAS_RELATIONAL_OUTPUT_POSITION_ID,
    role: 'primary',
    ordinal: 0,
    fromX: producer.x + producer.width,
    fromY: producer.y + producer.height / 2,
    toX: output.x - 10,
    toY: output.y + output.height / 2,
  });
  return (
    <g>
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--status-info)" />
        </marker>
      </defs>
      <path
        data-slot="canvas-relational-output-edge"
        d={path}
        fill="none"
        stroke="var(--status-info)"
        strokeWidth="1.5"
        markerEnd={`url(#${markerId})`}
      />
      {onDisconnect == null ? null : (
        <RelationalEdgeAction
          slot="canvas-relational-output-edge-action"
          path={path}
          removeLabel={removeLabel}
          onSelect={onSelect}
          onDisconnect={onDisconnect}
        />
      )}
    </g>
  );
}
