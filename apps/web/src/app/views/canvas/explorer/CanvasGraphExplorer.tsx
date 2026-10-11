/**
 * Owned concern: adapt the main Canvas graph to the shared explorer.
 * @baseline GH-3610: imported sources and existing nodes are read models, not a new catalogue.
 * @decision Reuse viewport focus and the authorized import action supplied by the shell.
 * @consequence Navigation does not mutate topology or reinterpret plugin kinds.
 * @version 1.0.0
 */
import type { Node } from '@xyflow/react';
import type { ReactNode } from 'react';
import { CanvasExplorer } from './CanvasExplorer';
import { CanvasExplorerList } from './CanvasExplorerList';
import { projectCanvasExplorerNodes } from './canvasExplorerItems';

export function CanvasGraphExplorer({
  nodes,
  onSelect,
  onImport,
  children,
}: Readonly<{
  nodes: readonly Node[];
  onSelect: (id: string) => void;
  onImport?: () => void;
  children: ReactNode;
}>): JSX.Element {
  const items = projectCanvasExplorerNodes(nodes);
  return (
    <CanvasExplorer
      sources={
        <CanvasExplorerList
          items={items.filter((item) => item.source)}
          onSelect={onSelect}
          onImport={onImport}
        />
      }
      elements={<CanvasExplorerList items={items} onSelect={onSelect} />}
    >
      {children}
    </CanvasExplorer>
  );
}
