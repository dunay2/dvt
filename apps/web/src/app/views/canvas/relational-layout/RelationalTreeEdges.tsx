/** Owned concern: render connections and operand roles from projected geometry. */
import type { CanvasRelationalTreeLayout } from '../canvasRelationalTreeGeometry';
import type { CanvasStagedOperation } from '../canvasStagedOperation';
import {
  indexPlacedRelations,
  projectStagedRelationEdges,
  relationalEdgePath,
} from './relationalTreeEdgeProjection';
import { RelationalEdgeAction } from './RelationalEdgeAction';
import { RelationalOutputEdge } from './RelationalOutputEdge';
import { RelationalCanonicalEdges } from './RelationalCanonicalEdges';

export function RelationalTreeEdges({
  layout,
  stagedOperations = [],
  removeConnectionLabel,
  onSelectStagedOperation,
  onDisconnectStagedOperation,
  onDisconnectRelation,
  outputRelationId,
  onSelectOutput,
  onDisconnectOutput,
}: Readonly<{
  layout: CanvasRelationalTreeLayout;
  stagedOperations?: readonly CanvasStagedOperation[];
  removeConnectionLabel: string;
  onSelectStagedOperation?: (id: string) => void;
  onDisconnectStagedOperation?: (id: string, port: number) => void;
  onDisconnectRelation?: (id: string, port: number) => void;
  outputRelationId: string | null;
  onSelectOutput?: () => void;
  onDisconnectOutput?: () => void;
}>) {
  const placedByRelationId = indexPlacedRelations(layout);
  const outputProducer =
    outputRelationId == null ? undefined : placedByRelationId.get(outputRelationId);
  const stagedEdges = projectStagedRelationEdges(placedByRelationId, stagedOperations);
  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={layout.width}
      height={layout.height}
    >
      <RelationalOutputEdge
        output={layout.output}
        producer={outputProducer}
        removeLabel={removeConnectionLabel}
        onSelect={onSelectOutput}
        onDisconnect={onDisconnectOutput}
      />
      {stagedEdges.map((edge) => (
        <g key={edge.key}>
          <path
            data-slot="canvas-relational-pending-edge"
            data-port={edge.ordinal}
            d={relationalEdgePath(edge)}
            fill="none"
            stroke="var(--status-info)"
            strokeDasharray="4 4"
            strokeWidth="1.5"
          />
          {onDisconnectStagedOperation == null ? null : (
            <RelationalEdgeAction
              slot="canvas-relational-pending-edge-action"
              port={edge.ordinal}
              path={relationalEdgePath(edge)}
              removeLabel={removeConnectionLabel}
              onSelect={() => onSelectStagedOperation?.(edge.parentLocator)}
              onDisconnect={() => onDisconnectStagedOperation(edge.parentLocator, edge.ordinal)}
            />
          )}
        </g>
      ))}
      <RelationalCanonicalEdges
        layout={layout}
        removeLabel={removeConnectionLabel}
        onDisconnect={onDisconnectRelation}
      />
    </svg>
  );
}
