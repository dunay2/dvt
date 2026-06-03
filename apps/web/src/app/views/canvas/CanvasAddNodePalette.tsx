/** Owned concern: expose on-demand Canvas node insertion without a permanent rail. */
import { Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { canvasChromeClasses } from './canvasChromeTokens';
import { canvasViewCopy } from './copy';

type CanvasAddNodePaletteProps = Readonly<{
  nodeKinds: readonly NodeKindRegistration[];
  onCreateAuthoringNode: (
    registration: NodeKindRegistration,
    position?: { x: number; y: number }
  ) => void;
  triggerLabel: string;
  triggerDataSlot?: string;
  disabled?: boolean;
  className?: string;
  align?: 'left' | 'right';
}>;

const PALETTE_WIDTH = 288;
const PALETTE_GUTTER = 8;

function filterNodeKinds(
  nodeKinds: readonly NodeKindRegistration[],
  searchValue: string
): readonly NodeKindRegistration[] {
  const normalizedSearch = searchValue.trim().toLowerCase();
  if (!normalizedSearch) {
    return nodeKinds;
  }

  const roleSearchText: Record<NodeKindRegistration['role'], string> = {
    check: 'check data test validation quality',
    control: 'control macro orchestration command',
    input: 'input source ingest warehouse raw origin',
    output: 'output sink exposure metric publish',
    transform: 'transform model sql select materialize',
  };

  return nodeKinds.filter((registration) => {
    const searchText = [
      registration.label,
      registration.kind,
      registration.pluginId,
      registration.role,
      registration.previewStepKind ?? '',
      roleSearchText[registration.role],
      'authoring canvas insert node',
      registration.allowsIncoming ? 'incoming upstream dependency' : 'root first source',
      registration.allowsOutgoing ? 'outgoing downstream dependency' : 'terminal final sink',
      registration.supportsColumns ? 'columns schema fields table' : '',
    ]
      .join(' ')
      .toLowerCase();

    return searchText.includes(normalizedSearch);
  });
}

export function CanvasAddNodePalette({
  nodeKinds,
  onCreateAuthoringNode,
  triggerLabel,
  triggerDataSlot = 'canvas-add-node-palette-trigger',
  disabled = false,
  className,
  align = 'left',
}: CanvasAddNodePaletteProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [paletteStyle, setPaletteStyle] = useState<CSSProperties>({});
  const visibleNodeKinds = useMemo(
    () => filterNodeKinds(nodeKinds, searchValue),
    [nodeKinds, searchValue]
  );
  const canOpen = !disabled && nodeKinds.length > 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    function updatePalettePosition(): void {
      const trigger = triggerRef.current;
      if (trigger == null) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const preferredLeft =
        align === 'right' ? triggerRect.right - PALETTE_WIDTH : triggerRect.left;
      const maxLeft = Math.max(PALETTE_GUTTER, viewportWidth - PALETTE_WIDTH - PALETTE_GUTTER);
      const left = Math.min(Math.max(preferredLeft, PALETTE_GUTTER), maxLeft);

      setPaletteStyle({
        left,
        top: triggerRect.bottom + PALETTE_GUTTER,
        width: PALETTE_WIDTH,
      });
    }

    updatePalettePosition();
    window.addEventListener('resize', updatePalettePosition);
    window.addEventListener('scroll', updatePalettePosition, true);

    return () => {
      window.removeEventListener('resize', updatePalettePosition);
      window.removeEventListener('scroll', updatePalettePosition, true);
    };
  }, [align, open]);

  useEffect(() => {
    if (open) {
      searchInputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
  }, [searchValue, open]);

  function updateActiveIndex(nextIndex: number): void {
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
  }

  function closePalette(): void {
    setOpen(false);
    setSearchValue('');
    updateActiveIndex(0);
  }

  function selectNodeKind(registration: NodeKindRegistration): void {
    onCreateAuthoringNode(registration);
    closePalette();
  }

  const palette = open ? (
    <div
      data-slot="canvas-add-node-palette"
      className="fixed z-50 rounded-md border border-[color:var(--border-default)] bg-[var(--surface-panel)] p-2 shadow-lg"
      style={paletteStyle}
    >
      <div className="flex items-center gap-2 border-b border-[color:var(--border-default)] pb-2">
        <Search className="size-4 shrink-0 text-(--text-muted)" />
        <input
          ref={searchInputRef}
          data-slot="canvas-add-node-palette-search"
          value={searchValue}
          aria-label={canvasViewCopy.addNodePaletteSearchLabel}
          placeholder={canvasViewCopy.addNodePaletteSearchLabel}
          className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm text-(--text-default) outline-none placeholder:text-(--text-muted)"
          onInput={(event) => setSearchValue(event.currentTarget.value)}
          onChange={(event) => setSearchValue(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closePalette();
              return;
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              updateActiveIndex(
                Math.min(activeIndexRef.current + 1, Math.max(visibleNodeKinds.length - 1, 0))
              );
              return;
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              updateActiveIndex(Math.max(activeIndexRef.current - 1, 0));
              return;
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              const activeNodeKind = visibleNodeKinds[activeIndexRef.current];
              if (activeNodeKind) {
                selectNodeKind(activeNodeKind);
              }
            }
          }}
        />
      </div>
      <div role="listbox" aria-label={triggerLabel} className="mt-2 max-h-64 overflow-y-auto">
        {visibleNodeKinds.length === 0 ? (
          <p
            data-slot="canvas-add-node-palette-empty"
            className="px-2 py-3 text-sm text-(--text-muted)"
          >
            {canvasViewCopy.addNodePaletteEmptyLabel}
          </p>
        ) : (
          visibleNodeKinds.map((registration, index) => {
            const Icon = registration.icon;
            const selected = index === activeIndex;
            return (
              <button
                key={registration.kind}
                type="button"
                role="option"
                aria-selected={selected}
                data-slot="canvas-add-node-palette-option"
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-(--text-default)',
                  selected && 'bg-(--surface-elevated)'
                )}
                onMouseEnter={() => updateActiveIndex(index)}
                onClick={() => selectNodeKind(registration)}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 truncate">{registration.label}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div data-slot="canvas-add-node-palette-root" className={cn('relative inline-flex', className)}>
      <Button
        ref={triggerRef}
        type="button"
        data-slot={triggerDataSlot}
        variant="outline"
        size="sm"
        disabled={!canOpen}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={canvasChromeClasses.outlineButton}
        onClick={() => setOpen((current) => !current)}
      >
        <Plus className="size-4" />
        {triggerLabel}
      </Button>
      {palette == null ? null : createPortal(palette, document.body)}
    </div>
  );
}
