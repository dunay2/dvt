/** Owned concern: accessible contextual actions for one semantic card. */
import type { ReactElement } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '../../components/ui/context-menu';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasRelationalTreeNode } from './canvasRelationalTreeProjection';

export function CanvasRelationalTreeCardMenu({
  node,
  children,
  onRemove,
  onExpand,
}: Readonly<{
  node: CanvasRelationalTreeNode;
  children: ReactElement;
  onRemove?: (relationId: string, keep?: 'left' | 'right') => void;
  onExpand?: (locator: string) => void;
}>): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = resolveCanvasSemanticEditorCopy(language);
  if (node.relationId == null || (onRemove == null && onExpand == null)) return children;
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="canvas-relational-card-menu min-w-56 text-sm">
        {node.expressionRefs.length === 0 || onExpand == null ? null : (
          <>
            <ContextMenuItem
              data-slot="canvas-relational-edit-operation"
              onSelect={() => onExpand(node.locator)}
            >
              <Pencil aria-hidden="true" className="size-4" />
              {language === 'es' ? 'Abrir operación' : 'Open operation'}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {node.operator === 'join' ? (
          (['left', 'right'] as const).map((keep) => (
            <ContextMenuItem
              key={keep}
              data-slot={`canvas-relational-remove-${keep}`}
              disabled={onRemove == null}
              onSelect={() => onRemove?.(node.relationId!, keep)}
            >
              <Trash2 aria-hidden="true" className="size-4" />
              {keep === 'left' ? copy.removeKeepLeft : copy.removeKeepRight}
              <span className="max-w-48 truncate text-xs text-(--text-muted)">
                {node.children[keep === 'left' ? 0 : 1]?.node.displayName}
              </span>
            </ContextMenuItem>
          ))
        ) : (
          <ContextMenuItem
            data-slot="canvas-relational-remove-source"
            disabled={onRemove == null}
            onSelect={() => onRemove?.(node.relationId!)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {copy.removeCard}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
