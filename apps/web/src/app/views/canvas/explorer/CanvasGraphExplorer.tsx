/**
 * Owned concern: adapt the main Canvas graph to the shared explorer.
 * @baseline GH-3610: registered sources need not have a placed card.
 * @decision Inspect source definitions on click; transfer only their identity on drag.
 * @consequence The existing guarded drop command alone admits sources to the graph.
 * @version 1.0.0
 */
import type { Node } from '@xyflow/react';
import { Table2 } from 'lucide-react';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CanonicalNode } from '../../../types/canonical';
import { CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';
import { CanvasExplorer, type CanvasExplorerProjectWorkspace } from './CanvasExplorer';
import type { CanvasExplorerActivityRail } from './CanvasExplorer.templates';
import { CanvasExplorerList } from './CanvasExplorerList';
import { projectCanvasExplorerNodes, projectCanvasExplorerSources } from './canvasExplorerItems';

const sourceIcon = <Table2 aria-hidden="true" />;

export function CanvasGraphExplorer({
  nodes,
  onSelect,
  onImport,
  catalogue,
  onInspectSource,
  canPlaceSource = false,
  importedSourceIds = [],
  onImportFocusComplete,
  children,
  workspaceTask,
  projectFiles,
  activityRail,
}: Readonly<{
  nodes: readonly Node[];
  onSelect: (id: string) => void;
  onImport?: () => void;
  children: ReactNode;
  workspaceTask?: ReactNode;
  projectFiles?: CanvasExplorerProjectWorkspace;
  activityRail?: CanvasExplorerActivityRail;
  catalogue?: readonly CanonicalNode[];
  onInspectSource?: (id: string) => void;
  canPlaceSource?: boolean;
  importedSourceIds?: readonly string[];
  onImportFocusComplete?: () => void;
}>): JSX.Element {
  const items = projectCanvasExplorerNodes(nodes);
  const rootRef = useRef<HTMLDivElement>(null);
  const sources = useMemo(() => projectCanvasExplorerSources(catalogue ?? []), [catalogue]);
  useEffect(() => {
    if (importedSourceIds.length === 0) return;
    const registered = catalogue?.some((node) => importedSourceIds.includes(node.id));
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
      workspaceTask={workspaceTask}
      projectFiles={projectFiles}
      activityRail={activityRail}
      sources={
        <CanvasExplorerList
          items={sources}
          presentation="cards"
          itemIcon={sourceIcon}
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
