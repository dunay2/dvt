/** Owned concern: localized operation discovery, not SQL or admission rules. */
const en = {
  add: 'Add operation',
  search: 'Search operations…',
  empty: 'No matching operations.',
  combine: 'Combine',
  transform: 'Transform',
  order: 'Order and limit',
};
const es: typeof en = {
  add: 'Añadir operación',
  search: 'Buscar operaciones…',
  empty: 'No hay operaciones que coincidan.',
  combine: 'Combinar',
  transform: 'Transformar',
  order: 'Ordenar y limitar',
};
export function resolveCanvasOperationMenuCopy(language: string): typeof en {
  return language === 'es' ? es : en;
}
export type CanvasOperationMenuCopy = typeof en;
