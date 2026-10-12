/** Presentation-only node layer for the relational graph. */
import { useMemo } from 'react';
import type { SemanticWorkbenchGraph } from './semanticWorkbenchProjection';
import type { CanvasRelationalTreeLayout } from './canvasRelationalTreeGeometry';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { SourceOccurrenceActions } from './relational-source-occurrence/sourceOccurrenceActions';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { CanvasRelationalTreeGraphNode } from './CanvasRelationalTreeGraphNode';

export function CanvasRelationalTreeNodes({
  layout,
  graphs,
  expanded,
  zoomRevealsDetail,
  toggleDetail,
  occurrences,
  stagedOperations,
  selectedStagedOperationId,
  selectedLocator,
  selectedConnectionSource,
  panMode,
  copy,
  actions,
}: Readonly<{
  layout: CanvasRelationalTreeLayout;
  graphs: ReadonlyMap<string, SemanticWorkbenchGraph>;
  expanded: ReadonlySet<string>;
  zoomRevealsDetail: boolean;
  toggleDetail: (id: string) => void;
  occurrences?: Pick<SourceOccurrenceActions, 'pending' | 'selectedId' | 'select' | 'remove'>;
  stagedOperations: readonly CanvasStagedOperation[];
  selectedStagedOperationId: string | null;
  selectedLocator: string;
  selectedConnectionSource: string | null;
  panMode: boolean;
  copy: CanvasRelationalTreeWorkbenchCopy;
  actions: Readonly<{
    select: (locator: string) => void;
    expand?: (locator: string) => void;
    remove?: (relationId: string) => void;
    selectStaged?: (id: string) => void;
    removeStaged?: (id: string) => void;
    selectConnectionSource?: (relationId: string) => void;
    connectOperation?: (id: string, port: number, relationId: string) => void;
  }>;
}>): JSX.Element {
  const pendingSourceIds = useMemo(
    () => new Set(occurrences?.pending.map((source) => source.read.binding.relationId)),
    [occurrences?.pending]
  );
  const stagedById = useMemo(
    () => new Map(stagedOperations.map((operation) => [operation.id, operation])),
    [stagedOperations]
  );
  const configuredProducerIds = useMemo(
    () =>
      new Set(
        stagedOperations.flatMap((operation) =>
          operation.semanticDocument == null
            ? []
            : operation.inputs.filter((input): input is string => input != null)
        )
      ),
    [stagedOperations]
  );
  return (
    <ul
      role="tree"
      aria-label={copy.relationalTreeLabel}
      className="pointer-events-none absolute inset-0"
    >
      {layout.nodes.map((placed) => {
        const relationId = placed.node.relationId;
        const staged = relationId == null ? undefined : stagedById.get(relationId);
        const sourceOccurrencePending = relationId != null && pendingSourceIds.has(relationId);
        const visuallyPending =
          (sourceOccurrencePending && !configuredProducerIds.has(relationId!)) ||
          (staged != null && staged.semanticDocument == null);
        return (
          <CanvasRelationalTreeGraphNode
            key={placed.node.locator}
            placed={placed}
            selected={
              staged != null
                ? relationId === selectedStagedOperationId
                : occurrences?.selectedId != null
                  ? relationId === occurrences.selectedId
                  : placed.node.locator === selectedLocator
            }
            copy={copy}
            onSelect={
              staged != null
                ? () => actions.selectStaged?.(staged.id)
                : sourceOccurrencePending
                  ? () => occurrences?.select(relationId!)
                  : actions.select
            }
            onExpand={sourceOccurrencePending || staged != null ? undefined : actions.expand}
            onRemove={
              staged != null
                ? () => actions.removeStaged?.(staged.id)
                : sourceOccurrencePending
                  ? occurrences?.remove
                  : actions.remove
            }
            pending={visuallyPending}
            stagedOperation={staged}
            semanticGraph={graphs.get(placed.node.locator)}
            expanded={zoomRevealsDetail || expanded.has(relationId ?? placed.node.locator)}
            onToggleDetail={
              zoomRevealsDetail ? undefined : () => toggleDetail(relationId ?? placed.node.locator)
            }
            movable={!panMode}
            selectedConnectionSource={selectedConnectionSource}
            onSelectConnectionSource={actions.selectConnectionSource}
            onConnectOperation={actions.connectOperation}
          />
        );
      })}
    </ul>
  );
}
