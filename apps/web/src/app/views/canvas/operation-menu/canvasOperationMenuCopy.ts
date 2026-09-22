/** Owned concern: localized operation discovery, not SQL or admission rules. */
const en = {
  add: 'Add operation',
  search: 'Search operations…',
  empty: 'No matching operations.',
  combine: 'Combine',
  transform: 'Transform',
  order: 'Order and limit',
  current: 'In this composition',
  needsOutput: 'Select a source and compose its output first.',
  unavailable: 'Unavailable for this output.',
};
const es: typeof en = {
  add: 'Añadir operación',
  search: 'Buscar operaciones…',
  empty: 'No hay operaciones que coincidan.',
  combine: 'Combinar',
  transform: 'Transformar',
  order: 'Ordenar y limitar',
  current: 'En esta composición',
  needsOutput: 'Selecciona una fuente y compón primero su salida.',
  unavailable: 'No disponible para esta salida.',
};
export function resolveCanvasOperationMenuCopy(language: string): typeof en {
  return language === 'es' ? es : en;
}
export type CanvasOperationMenuCopy = typeof en;
