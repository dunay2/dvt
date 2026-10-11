/**
 * Owned concern: adapt the main Canvas graph to the shared explorer.
 * @baseline GH-3610: imported sources and existing nodes are read models, not a new catalogue.
 * @decision Reuse viewport focus and the authorized import action supplied by the shell.
 * @consequence Navigation does not mutate topology or reinterpret plugin kinds.
 * @version 1.0.0
 */
import { useReactFlow, type Node, type NodeChange } from '@xyflow/react';
import type { ReactNode } from 'react';
import { focusCanvasViewportNode } from '../canvasViewportNodeFocus';
import { CanvasExplorer } from './CanvasExplorer';
import { CanvasExplorerList } from './CanvasExplorerList';
import { projectCanvasExplorerNodes } from './canvasExplorerItems';

export function CanvasGraphExplorer({
  nodes,
  onNodesChange,
  canSelect,
  onImport,
  children,
}: Readonly<{
  nodes: readonly Node[];
  onNodesChange: (changes: NodeChange[]) => void;
  canSelect: boolean;
  onImport?: () => void;
  children: ReactNode;
}>): JSX.Element {
  const { fitView } = useReactFlow();
  const items = projectCanvasExplorerNodes(nodes);
  const select = (nodeId: string) => {
    focusCanvasViewportNode({
      nodeId,
      nodes,
      selectNode: canSelect,
      port: { fitView, onNodesChange },
    });
  };
  return (
    <CanvasExplorer
      sources={
        <CanvasExplorerList
          items={items.filter((item) => item.source)}
          onSelect={select}
          onImport={onImport}
        />
      }
      elements={<CanvasExplorerList items={items} onSelect={select} />}
    >
      {children}
    </CanvasExplorer>
  );
}
