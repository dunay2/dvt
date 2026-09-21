/** Owned concern: accessible, compact discovery of already-admitted operation actions. */
import { Check, ChevronDown, Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../../components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/popover';
import { resolveCanvasRelationalOperationPresentation } from '../canvasRelationalOperationPresentation';
import { writeCanvasRelationalOperationDrag } from '../canvasRelationalTreeDrag';
import { canvasRelationalOperationPresentation } from '../canvasRelationalOperationPresentation';
import type { CanvasRelationalOperation } from '../canvasRelationalOperationChoices';
import type { CanvasOperationMenuCopy } from './canvasOperationMenuCopy';
import type { CanvasMenuOperation, CanvasOperationMenuItem } from './canvasOperationMenuModel';

export function CanvasOperationMenu({
  items,
  copy,
  onSelect,
}: Readonly<{
  items: readonly CanvasOperationMenuItem[];
  copy: CanvasOperationMenuCopy;
  onSelect: (operation: CanvasMenuOperation) => void;
}>): JSX.Element {
  const [open, setOpen] = useState(false);
  const descriptionId = useId();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-slot="canvas-operation-menu-trigger"
          onKeyDown={(event) => {
            if (!['Enter', ' ', 'ArrowDown'].includes(event.key) || event.repeat) return;
            event.preventDefault();
            setOpen(true);
          }}
          className="gap-2 text-(--text-strong)"
        >
          <Plus aria-hidden="true" className="size-4 text-(--status-info)" />
          {copy.add}
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        aria-label={copy.add}
        className="w-80 max-w-[calc(100vw-1rem)] border-(--border-subtle) bg-(--surface-panel) p-0 font-sans text-(--text-strong)"
      >
        <Command label={copy.add} className="bg-transparent text-inherit" loop>
          <CommandInput aria-label={copy.search} placeholder={copy.search} />
          <CommandList className="max-h-[min(24rem,var(--radix-popover-content-available-height))]">
            <CommandEmpty>{copy.empty}</CommandEmpty>
            {(['combine', 'transform', 'order'] as const)
              .filter((group) => items.some((item) => item.group === group))
              .map((group) => (
                <CommandGroup
                  key={group}
                  heading={copy[group]}
                  className="text-inherit [&_[cmdk-group-heading]]:text-(--text-muted)"
                >
                  {items
                    .filter((item) => item.group === group)
                    .map((item) => {
                      const Icon = resolveCanvasRelationalOperationPresentation(item.id).icon;
                      const reasonId = `${descriptionId}-${item.id}`;
                      return (
                        <CommandItem
                          key={item.id}
                          value={item.id}
                          keywords={[item.label, copy[group]]}
                          disabled={!item.selectable}
                          aria-describedby={item.reason == null ? undefined : reasonId}
                          data-operation={item.id}
                          data-slot={`dvt-select-operation-${item.id.replaceAll('_', '-')}`}
                          data-operator-tool={
                            Object.hasOwn(canvasRelationalOperationPresentation, item.id)
                              ? undefined
                              : item.id
                          }
                          draggable={item.draggable}
                          onDragStart={(event) => {
                            if (
                              !item.selectable ||
                              !item.draggable ||
                              !Object.hasOwn(canvasRelationalOperationPresentation, item.id)
                            ) {
                              event.preventDefault();
                              return;
                            }
                            writeCanvasRelationalOperationDrag(
                              event.dataTransfer,
                              item.id as CanvasRelationalOperation
                            );
                          }}
                          onDragEnd={() => setOpen(false)}
                          onSelect={() => {
                            if (!item.selectable) return;
                            setOpen(false);
                            onSelect(item.id);
                          }}
                          className="items-start data-[selected=true]:bg-(--surface-selected) data-[selected=true]:text-(--text-strong)"
                        >
                          <Icon aria-hidden="true" className="mt-0.5 size-4 text-(--status-info)" />
                          <span className="min-w-0 flex-1">
                            <span className="block">{item.label}</span>
                            {item.reason == null ? null : (
                              <span id={reasonId} className="block text-xs text-(--text-muted)">
                                {item.reason}
                              </span>
                            )}
                          </span>
                          {item.active ? (
                            <Check className="mt-0.5 size-4" aria-label={copy.current} />
                          ) : null}
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
