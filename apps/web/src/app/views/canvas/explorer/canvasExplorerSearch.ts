/** Own the searchable, localized text of a project catalogue row. */
import type { CanvasExplorerItem } from './canvasExplorerItems';

export function canvasExplorerSearchText(item: CanvasExplorerItem, sourceLabel: string): string {
  return [
    item.label,
    item.description,
    item.searchText,
    ...(item.details ?? []).map((detail) => detail.value),
    item.isSource ? sourceLabel : undefined,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

export function normalizeCanvasExplorerQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}
