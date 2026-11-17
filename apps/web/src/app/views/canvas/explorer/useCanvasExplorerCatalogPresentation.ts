/**
 * Owned concern: retain one scoped Explorer's search and disclosure presentation.
 * @baseline ADR-0069: catalogue presentation owns no Model identity or placement authority.
 * @decision Share controlled values across surfaces and reject obsolete scope callbacks.
 * @consequence View changes retain the filter; workspace replacement retains no historical map.
 * @version 1.0.0
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import type { CanvasExplorerCatalogPresentation } from './CanvasExplorer.types';

type Values = Pick<CanvasExplorerCatalogPresentation, 'query' | 'open' | 'expandedIds'>;

export function useCanvasExplorerCatalogPresentation(
  scopeKey?: string
): CanvasExplorerCatalogPresentation {
  const initial = useMemo<Values>(
    () => ({ query: '', open: true, expandedIds: new Set<string>() }),
    [scopeKey]
  );
  const currentOwner = useRef(initial);
  currentOwner.current = initial;
  const [stored, setStored] = useState(() => ({ owner: initial, value: initial }));
  const update = useCallback(
    (change: (value: Values) => Values) => {
      if (currentOwner.current !== initial) return;
      setStored((previous) => ({
        owner: initial,
        value: change(previous.owner === initial ? previous.value : initial),
      }));
    },
    [initial]
  );
  return {
    ...(stored.owner === initial ? stored.value : initial),
    onQuery: (query) => update((value) => ({ ...value, query })),
    onOpenChange: (open) => update((value) => ({ ...value, open })),
    onToggleDetails: (id) =>
      update((value) => {
        const expandedIds = new Set(value.expandedIds);
        if (expandedIds.has(id)) expandedIds.delete(id);
        else expandedIds.add(id);
        return { ...value, expandedIds };
      }),
  };
}
