/** Owned concern: accessible contextual actions for one semantic card. */
import type { ReactElement } from 'react';
import { Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

export function CanvasRelationalTreeCardMenu({
  node,
  children,
  onRemove,
}: Readonly<{
  node: CanvasRelationalTreeNode;
  children: ReactElement;
  onRemove?: (relationId: string, keep?: 'left' | 'right') => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  if (onRemove == null || node.relationId == null || !['join', 'read'].includes(node.operator))
    return children;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="canvas-relational-card-menu min-w-56 text-sm">
        {node.operator === 'join' ? (
          (['left', 'right'] as const).map((keep) => (
            <ContextMenuItem
              key={keep}
              data-slot={`canvas-relational-remove-${keep}`}
              onSelect={() => onRemove(node.relationId!, keep)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {keep === 'left' ? copy.removeKeepLeft : copy.removeKeepRight}
            </ContextMenuItem>
          ))
        ) : (
          <ContextMenuItem
            data-slot="canvas-relational-remove-source"
            onSelect={() => onRemove(node.relationId!)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {copy.removeCard}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
