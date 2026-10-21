/**
 * Owned concern: validate the single browser inventory and prove additive controlled deltas.
 * @baseline GH-2931: catalog data must not imply execution-policy changes.
 * @decision Narrow only valid, execution-identical snapshots with unchanged prior membership.
 * @consequence Withdrawn membership rejects; nondestructive uncertainty retains the complete baseline.
 */
import catalog from './cypress.catalog.json';

export const WEB_CYPRESS_CATALOG_PATH = 'apps/web/cypress.catalog.json';
export const WEB_CYPRESS_CAPABILITIES = ['controlled', 'available', 'unavailable'] as const;
export type WebCypressCapability = (typeof WEB_CYPRESS_CAPABILITIES)[number];
const CATALOG_GROUPS = [...WEB_CYPRESS_CAPABILITIES, 'nightly'] as const;
export type WebCypressCatalog = Readonly<
  Record<(typeof CATALOG_GROUPS)[number], readonly string[]>
>;
export type WebCypressCatalogSnapshots = Readonly<{
  base: unknown;
  head: unknown;
  dirty?: boolean;
}>;

export function parseWebCypressCatalog(value: unknown): WebCypressCatalog {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== CATALOG_GROUPS.length ||
    CATALOG_GROUPS.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error('Browser catalog requires the three capability arrays and nightly cadence.');

  const record = value as Record<string, unknown>;
  const seen = new Set<string>();
  for (const capability of CATALOG_GROUPS) {
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

export const WEB_CYPRESS_CATALOG = parseWebCypressCatalog(catalog);
export const { nightly: WEB_CYPRESS_NIGHTLY_SPECS, ...WEB_CYPRESS_SPECS } = WEB_CYPRESS_CATALOG;

function parseCatalogWitness(value: unknown): WebCypressCatalog | null {
  try {
    return parseWebCypressCatalog(value);
  } catch {
    return null;
  }
}

function requireCatalogRetention(
  previous: WebCypressCatalog | null,
  next: WebCypressCatalog | null
): void {
  if (!previous || !next) return;
  for (const group of CATALOG_GROUPS) {
    const retained = new Set(next[group]);
    const removed = previous[group].find((path) => !retained.has(path));
    if (removed)
      throw new Error(`Browser catalog cannot remove or reclassify ${removed} from ${group}.`);
  }
}

export function resolveControlledCatalogAdditions(
  executed: WebCypressCatalog,
  snapshots?: WebCypressCatalogSnapshots
): readonly string[] | null {
  if (!snapshots) return null;
  const base = parseCatalogWitness(snapshots.base);
  const head = parseCatalogWitness(snapshots.head);
  requireCatalogRetention(base, head);
  requireCatalogRetention(base, executed);
  requireCatalogRetention(head, executed);
  if (!base || !head || snapshots.dirty) return null;
  const equal = (left: readonly string[], right: readonly string[]): boolean =>
    left.length === right.length && left.every((path, index) => path === right[index]);
  if (CATALOG_GROUPS.some((key) => !equal(executed[key], head[key]))) return null;
  if (
    !equal(base.available, head.available) ||
    !equal(base.unavailable, head.unavailable) ||
    !equal(base.nightly, head.nightly)
  )
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
