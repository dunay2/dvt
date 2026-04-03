import { Command, FileSearch2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { PaletteItem, PaletteMode } from './workbenchTypes';

interface CommandPaletteProps {
  open: boolean;
  mode: PaletteMode;
  query: string;
  items: PaletteItem[];
  onClose: () => void;
  onQueryChange: (query: string) => void;
}

export default function CommandPalette({
  open,
  mode,
  query,
  items,
  onClose,
  onQueryChange,
}: CommandPaletteProps) {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const title = mode === 'files' ? 'Quick Open' : 'Command Palette';

  useEffect(() => {
    if (!open) {
      return;
    }

    setHighlightedIndex(0);
    inputRef.current?.focus();
  }, [open]);

  const safeItems = useMemo(() => items.slice(0, 24), [items]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex((current) => Math.min(current + 1, Math.max(safeItems.length - 1, 0)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex((current) => Math.max(current - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        const item = safeItems[highlightedIndex];
        if (!item) {
          return;
        }

        event.preventDefault();
        item.perform();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [highlightedIndex, onClose, safeItems, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-12"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl overflow-hidden rounded-lg border border-[#3a3d41] bg-[#252526] shadow-2xl"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="flex items-center gap-3 border-b border-[#2a2d2e] px-4 py-3">
          {mode === 'files' ? (
            <FileSearch2 className="size-4 text-[#8b949e]" />
          ) : (
            <Command className="size-4 text-[#8b949e]" />
          )}

          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.08em] text-[#8b949e]">{title}</div>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                onQueryChange(event.target.value);
              }}
              placeholder={mode === 'files' ? 'Type a file, node, or artifact' : 'Type a command'}
              className="mt-1 w-full bg-transparent text-sm text-white outline-none placeholder:text-[#6b7280]"
            />
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto py-2">
          {safeItems.length > 0 ? (
            safeItems.map((item, index) => {
              const isActive = index === highlightedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.perform();
                    onClose();
                  }}
                  className={[
                    'flex w-full items-start justify-between gap-4 px-4 py-2 text-left',
                    isActive ? 'bg-[#094771]' : 'hover:bg-[#2a2d2e]',
                  ].join(' ')}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-[#d4d4d4]">{item.label}</span>
                    {item.description ? (
                      <span className="block truncate text-xs text-[#8b949e]">
                        {item.description}
                      </span>
                    ) : null}
                  </span>

                  <span className="shrink-0 rounded border border-[#3a3d41] px-1.5 py-0.5 text-[10px] uppercase text-[#8b949e]">
                    {item.category}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-6 text-sm text-[#8b949e]">No matches for “{query}”.</div>
          )}
        </div>
      </div>
    </div>
  );
}
