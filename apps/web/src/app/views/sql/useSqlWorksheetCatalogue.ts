/** Reuse protected draft and scoped warehouse discovery without authoring Canvas state. */
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { SourceObjectCatalogSchemaSummary } from '@dvt/contracts';
import type { WorkspaceScope } from '../../ports/sessionContext';
import type { SqlWorksheetConnection } from './sqlWorksheet.types';
import { useSessionContext, useWarehouseSourceImportPort } from '../../services/AppServicesContext';
import { useSqlWorksheetProjectCatalogue } from './useSqlWorksheetProjectCatalogue';
import {
  EMPTY_SQL_CATALOGUE_FILTER,
  sqlWorksheetSchemaOptions,
  sqlWorksheetObjectOptions,
  createSqlWorksheetCatalogueReader,
  projectSqlWorksheetCataloguePages,
  type SqlWorksheetCatalogueFilter,
} from './sqlWorksheetCatalogueQueries';

export function useSqlWorksheetCatalogue(
  scope: WorkspaceScope,
  connection: SqlWorksheetConnection | null,
  open: boolean
) {
  const session = useSessionContext();
  const port = useWarehouseSourceImportPort();
  const scopeKey = `${scope.tenantId}::${scope.projectId}::${scope.environmentId}`;
  const project = useSqlWorksheetProjectCatalogue(scopeKey);
  const [selection, setSelection] = useState<SqlWorksheetCatalogueFilter>(
    EMPTY_SQL_CATALOGUE_FILTER
  );
  const filter = selection.connectionId === connection?.id ? selection : EMPTY_SQL_CATALOGUE_FILTER;
  const { schema, query } = filter;
  const read = createSqlWorksheetCatalogueReader({
    scope,
    session,
    connectionId: connection?.id,
    port,
  });
  const discovery = { scopeKey, connectionId: connection?.id, open, read };
  const schemas = useInfiniteQuery(sqlWorksheetSchemaOptions(discovery));
  const objects = useInfiniteQuery(sqlWorksheetObjectOptions(discovery, filter));
  return {
    ...project,
    schemas,
    objects,
    schema,
    query,
    schemaItems: projectSqlWorksheetCataloguePages(schemas.data).schemas,
    objectItems: projectSqlWorksheetCataloguePages(objects.data).objects,
    chooseSchema(value: SourceObjectCatalogSchemaSummary): void {
      if (connection == null) return;
      setSelection({ connectionId: connection.id, schema: value, query: '' });
    },
    searchObjects(value: string): void {
      if (connection != null)
        setSelection({ connectionId: connection.id, schema, query: value.trim() });
    },
  };
}
