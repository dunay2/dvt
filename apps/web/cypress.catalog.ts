/**
 * Owned concern: validate the single browser inventory and prove additive controlled deltas.
 * @baseline GH-2931: catalog data must not imply execution-policy changes.
 * @decision Narrow only valid, execution-identical snapshots with unchanged prior membership.
 * @consequence Missing or incompatible evidence retains the complete browser baseline.
 */
import catalog from './cypress.catalog.json';

export const WEB_CYPRESS_CATALOG_PATH = 'apps/web/cypress.catalog.json';
export const WEB_CYPRESS_CAPABILITIES = ['controlled', 'available', 'unavailable'] as const;
export type WebCypressCapability = (typeof WEB_CYPRESS_CAPABILITIES)[number];
export type WebCypressCatalog = Readonly<Record<WebCypressCapability, readonly string[]>>;
export type WebCypressCatalogSnapshots = Readonly<{ base: unknown; head: unknown }>;

export function parseWebCypressCatalog(value: unknown): WebCypressCatalog {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== WEB_CYPRESS_CAPABILITIES.length ||
    WEB_CYPRESS_CAPABILITIES.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error('Browser catalog requires exactly the three capability arrays.');

  const record = value as Record<string, unknown>;
  const seen = new Set<string>();
  for (const capability of WEB_CYPRESS_CAPABILITIES) {
    const paths = record[capability];
    if (!Array.isArray(paths) || paths.length === 0)
      throw new Error('Browser catalog capability must be a nonempty array.');
    for (const path of paths) {
      if (
        typeof path !== 'string' ||
        !/^apps\/web\/cypress\/e2e\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.cy\.ts$/.test(
          path
        ) ||
        seen.has(path)
      )
        throw new Error(`Browser catalog requires unique canonical spec paths: ${String(path)}`);
      seen.add(path);
    }
  }
  return value as WebCypressCatalog;
}

export const WEB_CYPRESS_SPECS = parseWebCypressCatalog(catalog);

export function resolveControlledCatalogAdditions(
  executed: WebCypressCatalog,
  snapshots?: WebCypressCatalogSnapshots
): readonly string[] | null {
  if (!snapshots) return null;
  let base: WebCypressCatalog;
  let head: WebCypressCatalog;
  try {
    base = parseWebCypressCatalog(snapshots.base);
    head = parseWebCypressCatalog(snapshots.head);
  } catch {
    return null;
  }
  const equal = (left: readonly string[], right: readonly string[]): boolean =>
    left.length === right.length && left.every((path, index) => path === right[index]);
  if (WEB_CYPRESS_CAPABILITIES.some((key) => !equal(executed[key], head[key]))) return null;
  if (!equal(base.available, head.available) || !equal(base.unavailable, head.unavailable))
    return null;
  const previous = new Set(base.controlled);
  if (
    !equal(
      base.controlled,
      head.controlled.filter((path) => previous.has(path))
    )
  )
    return null;
  return head.controlled.filter((path) => !previous.has(path));
}
