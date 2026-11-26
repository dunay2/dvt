/** Build bounded, scoped warehouse discovery queries with canonical page cursors. */
import type {
  SourceObject,
  SourceObjectCatalogRequest,
  SourceObjectCatalogResponse,
  SourceObjectCatalogSchemaSummary,
} from '@dvt/contracts';
import { queryKeys } from '../../queries/queryKeys';
import type { SessionContextPort, WorkspaceScope } from '../../ports/sessionContext';
import type { IWarehouseSourceImportPort } from '../../ports/workspace';
import { sameWorkspaceScopeIdentity } from '../../services/session/workspaceScopeSelectionPort';

export type SqlWorksheetCatalogueFilter = Readonly<{
  connectionId: string | undefined;
  schema: SourceObjectCatalogSchemaSummary | null;
  query: string;
}>;
export const EMPTY_SQL_CATALOGUE_FILTER: SqlWorksheetCatalogueFilter = {
  connectionId: undefined,
  schema: null,
  query: '',
};
type Discovery = Readonly<{
  scopeKey: string;
  connectionId: string | undefined;
  open: boolean;
  read: (request: SourceObjectCatalogRequest) => Promise<SourceObjectCatalogResponse>;
}>;
type CatalogueAccess = Readonly<{
  scope: WorkspaceScope;
  session: SessionContextPort;
  connectionId: string | undefined;
  port: IWarehouseSourceImportPort;
}>;

function assertCatalogueScope(
  access: CatalogueAccess
): asserts access is CatalogueAccess & { connectionId: string } {
  if (access.connectionId == null) throw new Error('Choose a current connection.');
  if (!sameWorkspaceScopeIdentity(access.scope, access.session.getWorkspaceScopeSnapshot()))
    throw new Error('SQL catalogue scope changed.');
}

export function createSqlWorksheetCatalogueReader(access: CatalogueAccess) {
  return async (request: SourceObjectCatalogRequest): Promise<SourceObjectCatalogResponse> => {
    assertCatalogueScope(access);
    const response = await access.port.listSourceObjectCatalog(access.connectionId, request);
    assertCatalogueScope(access);
    if ((request.kind === 'schema-list') !== (response.kind === 'schema-list'))
      throw new Error('Unexpected SQL catalogue response.');
    return response;
  };
}

export function projectSqlWorksheetCataloguePages(
  data: Readonly<{ pages: readonly SourceObjectCatalogResponse[] }> | undefined
) {
  const schemas: SourceObjectCatalogSchemaSummary[] = [];
  const objects: SourceObject[] = [];
  if (data == null) return { schemas, objects };
  for (const page of data.pages) {
    if (page.kind === 'schema-list') schemas.push(...page.schemas);
    else objects.push(...page.objects);
  }
  return { schemas, objects };
}

function catalogueObjectRequest(
  filter: SqlWorksheetCatalogueFilter,
  cursor: string | undefined
): SourceObjectCatalogRequest {
  const page = cursor == null ? { limit: 50 } : { limit: 50, cursor };
  if (filter.query) return { kind: 'name-search', name: filter.query, ...page };
  if (filter.schema == null) throw new Error('Choose a current schema.');
  return {
    kind: 'schema-page',
    catalog: filter.schema.catalog,
    schema: filter.schema.schema,
    ...page,
  };
}

export function sqlWorksheetSchemaOptions(discovery: Discovery) {
  return {
    queryKey: queryKeys.workspace.worksheetSchemas(discovery.scopeKey, discovery.connectionId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      discovery.read({
        kind: 'schema-list',
        limit: 50,
        ...(pageParam == null ? {} : { cursor: pageParam }),
      }),
    getNextPageParam: (page: SourceObjectCatalogResponse) => page.nextCursor,
    enabled: discovery.open && discovery.connectionId != null,
    retry: false,
  };
}

export function sqlWorksheetObjectOptions(
  discovery: Discovery,
  filter: SqlWorksheetCatalogueFilter
) {
  const searchable = filter.schema != null || filter.query.length > 0;
  return {
    queryKey: queryKeys.workspace.worksheetObjects(
      discovery.scopeKey,
      discovery.connectionId,
      filter
    ),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      discovery.read(catalogueObjectRequest(filter, pageParam)),
    getNextPageParam: (page: SourceObjectCatalogResponse) => page.nextCursor,
    enabled: discovery.open && discovery.connectionId != null && searchable,
    retry: false,
  };
}
