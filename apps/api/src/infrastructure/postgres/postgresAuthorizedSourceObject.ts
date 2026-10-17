/**
 * Owned concern: resolve the same PostgreSQL source identity and SELECT/publication guard for Preview and capture.
 * @baseline ADR-0058: Warehouse Source Import Rails
 * @decision Extract the existing implementation unchanged; callers own transaction and connection lifecycle.
 * @consequence This relation guard is not DVT scope authorization or evidence of full acquisition.
 */
import { parsePostgresDvtPublicationMarker } from '@dvt/adapter-postgres';
import type { Client } from 'pg';

import {
  SourceObjectNotFoundError,
  WarehouseSourcePublicationChangedError,
} from '../../application/ports/warehouseSourceImport.js';

export type PostgresRelationAuthorizationRow = {
  readonly relation_kind: 'r' | 'p' | 'v' | 'm' | 'f';
  readonly relation_comment?: string | null;
};

export type RelationalSourceObjectId = Readonly<{
  catalog: string;
  schema: string;
  name: string;
}>;

export function parseRelationalSourceObjectId(objectId: string): RelationalSourceObjectId | null {
  const segments = objectId.split('/');
  if (segments.length !== 4 || segments[0] !== 'relation') {
    return null;
  }
  try {
    const [catalog, schema, name] = segments.slice(1).map((segment) => decodeURIComponent(segment));
    if (!catalog || !schema || !name) {
      return null;
    }
    return { catalog, schema, name };
  } catch (_error) {
    return null;
  }
}

export function quotePostgresIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function authorizePostgresSourceObject(
  client: Pick<Client, 'query'>,
  locator: RelationalSourceObjectId,
  objectId: string,
  expectedPublicationToken?: string
): Promise<PostgresRelationAuthorizationRow> {
  const authorized = await client.query<PostgresRelationAuthorizationRow>(
    [
      'select relation.relkind as relation_kind',
      ", obj_description(relation.oid, 'pg_class') as relation_comment",
      'from pg_class relation',
      'join pg_namespace namespace on namespace.oid = relation.relnamespace',
      'where current_database() = $1 and namespace.nspname = $2 and relation.relname = $3',
      "and relation.relkind in ('r', 'p', 'v', 'm', 'f')",
      "and has_table_privilege(relation.oid, 'SELECT')",
      'limit 1',
    ].join(' '),
    [locator.catalog, locator.schema, locator.name]
  );
  if (authorized.rows.length === 0) {
    throw new SourceObjectNotFoundError(objectId);
  }
  if (expectedPublicationToken !== undefined) {
    const relation = authorized.rows[0];
    const marker = parsePostgresDvtPublicationMarker(relation?.relation_comment ?? null);
    if (relation?.relation_kind !== 'r' || marker?.token !== expectedPublicationToken) {
      throw new WarehouseSourcePublicationChangedError();
    }
  }
  return authorized.rows[0]!;
}
