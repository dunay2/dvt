/** Owned concern: share literal search semantics across Canvas Add catalogs. */
export function matchesCanvasCatalogQuery(searchableText: string, query: string): boolean {
  return searchableText.toLowerCase().includes(query.trim().toLowerCase());
}
