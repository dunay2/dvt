/** Shared contextual removal for one admitted relational connection. */
import { Trash2 } from 'lucide-react';
import type { ReactElement } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';

export function RelationalConnectionMenu({
  children,
  removeLabel,
  onDisconnect,
}: Readonly<{
  children: ReactElement;
  removeLabel: string;
  onDisconnect: () => void;
}>): JSX.Element {
  return (
    <ContextMenu modal={false}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-48 text-sm">
        <ContextMenuItem
          data-slot="canvas-relational-remove-connection"
          variant="destructive"
          onSelect={onDisconnect}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {removeLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
