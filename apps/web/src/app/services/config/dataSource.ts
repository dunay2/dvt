/** Owned concern: keep product web data-source selection API-only. */
export type DataSourceMode = 'api';

export function resolveDataSource(value = import.meta.env.VITE_DATA_SOURCE): DataSourceMode {
  if (typeof value !== 'string') {
    return 'api';
  }

  return 'api';
}
