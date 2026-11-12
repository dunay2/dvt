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
> &
  Readonly<{
    nativePlatforms: Readonly<Partial<Record<'win32' | 'linux' | 'darwin', readonly string[]>>>;
  }>;
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
    Object.keys(value).length !== CATALOG_GROUPS.length + 1 ||
    [...CATALOG_GROUPS, 'nativePlatforms'].some((key) => !Object.hasOwn(value, key))
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
  const native = record.nativePlatforms;
  if (!native || typeof native !== 'object' || Array.isArray(native))
    throw new Error('Browser catalog requires native platform declarations.');
  const mergeSpecs = new Set(
    CATALOG_GROUPS.filter((group) => group !== 'nightly').flatMap(
      (group) => record[group] as string[]
    )
  );
  for (const [platform, paths] of Object.entries(native)) {
    if (
      !['win32', 'linux', 'darwin'].includes(platform) ||
      !Array.isArray(paths) ||
      new Set(paths).size !== paths.length ||
      paths.some((spec) => typeof spec !== 'string' || !mergeSpecs.has(spec))
    )
      throw new Error(`Browser catalog has invalid native platform references: ${platform}`);
  }
  return value as WebCypressCatalog;
}

export const WEB_CYPRESS_CATALOG = parseWebCypressCatalog(catalog);
export const WEB_CYPRESS_NIGHTLY_SPECS = WEB_CYPRESS_CATALOG.nightly;
export const WEB_CYPRESS_NATIVE_PLATFORMS = WEB_CYPRESS_CATALOG.nativePlatforms;
export const WEB_CYPRESS_SPECS = Object.fromEntries(
  WEB_CYPRESS_CAPABILITIES.map((capability) => [capability, WEB_CYPRESS_CATALOG[capability]])
) as Readonly<Record<WebCypressCapability, readonly string[]>>;

function parseCatalogWitness(value: unknown): WebCypressCatalog | null {
  try {
    // Only historical Git witnesses may lack the newly declared native obligations.
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === CATALOG_GROUPS.length &&
      CATALOG_GROUPS.every((key) => Object.hasOwn(value, key))
    )
      return parseWebCypressCatalog({ ...value, nativePlatforms: {} });
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
  for (const platform of ['win32', 'linux', 'darwin'] as const) {
    const retained = new Set(next.nativePlatforms[platform] ?? []);
    if (previous.nativePlatforms[platform]?.some((spec) => !retained.has(spec)))
      throw new Error(`Browser catalog cannot withdraw native platform proof: ${platform}.`);
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
  for (const platform of ['win32', 'linux', 'darwin'] as const) {
    const metadata = [base, head, executed].map((entry) =>
      JSON.stringify(entry.nativePlatforms[platform] ?? [])
    );
    if (new Set(metadata).size !== 1) return null;
  }
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
