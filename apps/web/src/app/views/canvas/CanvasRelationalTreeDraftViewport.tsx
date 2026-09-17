/** Owned concern: render and accept drops on one scalable canonical relational draft graph. */
import { GitMerge } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import { projectCanvasRelationalTreeAuthoringDraft } from './canvasRelationalTreeAuthoringProjection';
import {
  readCanvasRelationalOperationDrag,
  readCanvasRelationalSourceDrag,
} from './canvasRelationalTreeDrag';
import {
  CanvasRelationalTreeOperandSlot,
  type CanvasRelationalOperandPosition,
} from './CanvasRelationalTreeOperandSlot';
import { CanvasRelationalTreeLayout } from './CanvasRelationalTreeLayout';
import { CanvasRelationalTreeZoomControls } from './CanvasRelationalTreeZoomControls';
import { useCanvasRelationalTreeViewport } from './useCanvasRelationalTreeViewport';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function CanvasRelationalTreeDraftViewport({
  copy,
  edges,
  inputs,
  joinDraft,
  nodes,
  operation,
  primaryInputId,
  secondaryInputId,
  selectedInputIds,
  transformNode,
  onPlaceInput,
  onSelectInput,
  onSelectOperation,
}: Readonly<{
  copy: CanvasRelationalTreeWorkbenchCopy;
  edges: readonly CanonicalEdge[];
  inputs: readonly CanvasDvtCompositionInput[];
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  nodes: readonly CanonicalNode[];
  operation: CanvasRelationalOperation | null;
  primaryInputId: string | null;
  secondaryInputId: string | null;
  selectedInputIds: readonly string[];
  transformNode: CanonicalNode;
  onPlaceInput: (nodeId: string, position: CanvasRelationalOperandPosition) => void;
  onSelectInput: (nodeId: string) => void;
  onSelectOperation: (operation: CanvasRelationalOperation) => void;
}>): JSX.Element {
  const inputById = useMemo(
    () => new Map(inputs.map((input) => [input.nodeId, input] as const)),
    [inputs]
  );
  const draftProjection = useMemo(
    () =>
      projectCanvasRelationalTreeAuthoringDraft({
        edges,
        inputs,
        joinDraft,
        nodes,
        operation,
        selectedInputIds,
        transformNode,
      }),
    [edges, inputs, joinDraft, nodes, operation, selectedInputIds, transformNode]
  );
  const [selectedLocator, setSelectedLocator] = useState('');
  const rootLocator = draftProjection?.root.locator ?? '';
  const viewport = useCanvasRelationalTreeViewport(
    `${rootLocator}:${selectedInputIds.join(',')}:${operation}`
  );
  useEffect(() => setSelectedLocator(rootLocator), [rootLocator]);

  const placeDroppedSource = (nodeId: string): void => {
    if (selectedInputIds.includes(nodeId)) return;
    if (primaryInputId == null) onPlaceInput(nodeId, 'primary');
    else if (secondaryInputId == null && operation == null) onPlaceInput(nodeId, 'secondary');
    else onSelectInput(nodeId);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={viewport.viewportRef}
        data-slot="canvas-relational-tree-draft-viewport"
        className="absolute inset-0 cursor-grab overflow-auto p-5 pb-16 active:cursor-grabbing"
        onPointerDown={viewport.onPointerDown}
        onPointerMove={viewport.onPointerMove}
        onPointerUp={viewport.onPointerUp}
        onPointerCancel={viewport.onPointerUp}
        style={{
          backgroundColor: 'var(--surface-subtle)',
          backgroundImage:
            'radial-gradient(circle, color-mix(in srgb, var(--border-subtle) 72%, transparent) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDrop={(event) => {
          event.preventDefault();
          const droppedOperation = readCanvasRelationalOperationDrag(event.dataTransfer);
          if (droppedOperation != null) return onSelectOperation(droppedOperation);
          const nodeId = readCanvasRelationalSourceDrag(event.dataTransfer);
          if (nodeId != null) placeDroppedSource(nodeId);
        }}
      >
        {draftProjection == null ? (
          <div className="mx-auto grid min-h-64 w-full max-w-3xl grid-cols-[minmax(0,13rem)_minmax(10rem,1fr)] grid-rows-2 items-center gap-x-20 gap-y-8">
            <CanvasRelationalTreeOperandSlot
              copy={copy}
              input={primaryInputId == null ? null : (inputById.get(primaryInputId) ?? null)}
              position="primary"
              onPlaceInput={onPlaceInput}
            />
            <div className="row-span-2 flex items-center gap-10">
              <div className="flex min-h-16 min-w-44 items-center gap-2 rounded-md border border-dashed border-(--status-info) bg-blue-950/20 px-3">
                <GitMerge aria-hidden="true" className="size-4 text-(--status-info)" />
                <span className="text-[10px] font-semibold uppercase text-(--text-muted)">
                  {copy.relationalTreeSelectOperationMessage}
                </span>
              </div>
              <div className="min-w-28 rounded-md border border-emerald-500 bg-emerald-950/30 px-3 py-4 text-[10px] font-semibold text-emerald-300">
                {copy.relationalTreeOutputLabel}
              </div>
            </div>
            <CanvasRelationalTreeOperandSlot
              copy={copy}
              input={secondaryInputId == null ? null : (inputById.get(secondaryInputId) ?? null)}
              position="secondary"
              onPlaceInput={onPlaceInput}
            />
          </div>
        ) : (
          <div
            ref={viewport.contentRef}
            data-slot="canvas-relational-tree-draft"
            className="w-max"
            style={{ zoom: viewport.zoom }}
          >
            <CanvasRelationalTreeLayout
              outputName={transformNode.name}
              root={draftProjection.root}
              selectedLocator={selectedLocator}
              copy={copy}
              onSelect={setSelectedLocator}
            />
          </div>
        )}
      </div>
      {draftProjection == null ? null : (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-(--border-subtle) bg-(--surface-panel) p-1 shadow-md">
          <CanvasRelationalTreeZoomControls
            copy={copy}
            zoom={viewport.zoom}
            onChange={viewport.changeZoom}
            onFit={viewport.fit}
          />
        </div>
      )}
    </div>
  );
}
