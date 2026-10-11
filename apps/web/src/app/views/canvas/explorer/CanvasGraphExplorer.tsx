/**
 * Owned concern: adapt the main Canvas graph to the shared explorer.
 * @baseline GH-3610: registered sources need not have a placed card.
 * @decision Inspect source definitions on click; transfer only their identity on drag.
 * @consequence The existing guarded drop command alone admits sources to the graph.
 * @version 1.0.0
 */
import type { Node } from '@xyflow/react';
import { useEffect, useRef, type ReactNode } from 'react';
import type { CanonicalNode } from '../../../types/canonical';
import { CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';
import { CanvasExplorer } from './CanvasExplorer';
import { CanvasExplorerList } from './CanvasExplorerList';
import { projectCanvasExplorerNodes } from './canvasExplorerItems';

export function CanvasGraphExplorer({
  nodes,
  onSelect,
  onImport,
  catalogue = [],
  onInspectSource,
  canPlaceSource = false,
  importedSourceIds = [],
  onImportFocusComplete,
  children,
}: Readonly<{
  nodes: readonly Node[];
  onSelect: (id: string) => void;
  onImport?: () => void;
  children: ReactNode;
  catalogue?: readonly CanonicalNode[];
  onInspectSource?: (id: string) => void;
  canPlaceSource?: boolean;
  importedSourceIds?: readonly string[];
  onImportFocusComplete?: () => void;
}>): JSX.Element {
  const items = projectCanvasExplorerNodes(nodes);
  const rootRef = useRef<HTMLDivElement>(null);
  const sources = catalogue.filter((node) => node.role === 'input');
  useEffect(() => {
    if (importedSourceIds.length === 0) return;
    const registered = catalogue.some((node) => importedSourceIds.includes(node.id));
    if (!registered) return;
    const first = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[data-element-id]') ?? []
    ).find((element) => element.dataset.elementId === importedSourceIds[0]);
    first?.scrollIntoView?.({ block: 'nearest' });
    onImportFocusComplete?.();
  }, [catalogue, importedSourceIds, onImportFocusComplete]);
  return (
    <CanvasExplorer
      rootRef={rootRef}
      sources={
        <CanvasExplorerList
          items={sources.map((node) => ({ id: node.id, label: node.name, description: node.kind }))}
          onSelect={(id) => onInspectSource?.(id)}
          disabled={onInspectSource == null}
          onDragStart={
            canPlaceSource
              ? (id, event) => {
                  event.dataTransfer.setData(CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE, id);
                  event.dataTransfer.effectAllowed = 'copy';
                }
              : undefined
          }
          onImport={onImport}
        />
      }
      elements={<CanvasExplorerList items={items} onSelect={onSelect} />}
    >
      {children}
    </CanvasExplorer>
  );
}
