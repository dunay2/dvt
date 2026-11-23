/** One test-double owner and shared warehouse identity fixtures. */
import { buildRelationalSourceObjectId, type RelationalSourceObjectLocator } from '@dvt/contracts';
import { vi } from 'vitest';

export const pgMock = (() => {
  const connect = vi.fn<() => Promise<void>>();
  const end = vi.fn<() => Promise<void>>();
  const query = vi.fn<
    (
      sql: string,
      values?: readonly unknown[]
    ) => Promise<{
      rows: readonly Record<string, unknown>[];
      fields?: readonly { name: string; dataTypeID?: number }[];
    }>
  >();
  const databaseQuery = vi.fn();
  const Client = vi.fn(function () {
    return {
      connect,
      end,
      query: (sql: string, values?: readonly unknown[]) =>
        sql === 'select current_database() as database' ? databaseQuery() : query(sql, values),
    };
  });

  return { Client, connect, end, query, databaseQuery };
})();

export function expectedRelationIdentity(
  name: string,
  relationType: 'table' | 'view' = 'table'
): Readonly<{
  objectId: string;
  displayName: string;
  locator: RelationalSourceObjectLocator;
}> {
  const locator = {
    kind: 'relation' as const,
    catalog: 'dvt',
    schema: 'public',
    name,
    relationType,
  };
  return {
    objectId: buildRelationalSourceObjectId(locator),
    displayName: name,
    locator,
  };
}

export const CATALOG_TARGET = {
  connectionId: 'conn-1',
  scope: { tenantId: 'tenant-1', projectId: 'project-1', environmentId: 'dev' },
  type: 'postgres',
  database: 'dvt',
  credentialRef: 'postgres:warehouse',
} as const;
