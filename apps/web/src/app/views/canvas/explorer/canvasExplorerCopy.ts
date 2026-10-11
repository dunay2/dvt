/**
 * Owned concern: localized navigation copy, independent of graph and provider semantics.
 * @baseline GH-3610: distinguish source catalogues from existing elements.
 * @decision Keep ES/EN labels at the presentation boundary.
 * @consequence Navigation never invents domain statuses.
 * @version 1.0.0
 */
const en = {
  navigation: 'Canvas explorer',
  sources: 'Sources',
  elements: 'Elements',
  search: 'Search elements…',
  empty: 'No elements yet.',
  noMatches: 'No matching elements.',
  importSources: 'Import sources',
  resize: 'Resize explorer',
};
const es: typeof en = {
  navigation: 'Explorador del Canvas',
  sources: 'Fuentes',
  elements: 'Elementos',
  search: 'Buscar elementos…',
  empty: 'Todavía no hay elementos.',
  noMatches: 'No hay coincidencias.',
  importSources: 'Importar fuentes',
  resize: 'Ajustar ancho del explorador',
};
export function resolveCanvasExplorerCopy(language: string): typeof en {
  return language === 'es' ? es : en;
}
