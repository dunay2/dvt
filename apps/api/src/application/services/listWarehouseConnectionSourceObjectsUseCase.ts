/** Owned concern: execute the ListWarehouseConnectionSourceObjects query rail. */
import type {
  SourceObjectCatalogRequest,
  SourceObjectCatalogResponse,
  WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { WarehouseConnectionSourceObjectReader } from './WarehouseConnectionSourceObjectReader.js';

export class ListWarehouseConnectionSourceObjectsUseCase {
  public constructor(private readonly reader: WarehouseConnectionSourceObjectReader) {}

  public execute(
    scope: WorkspaceGraphDraftScope,
    connectionId: string,
    request: SourceObjectCatalogRequest
  ): Promise<SourceObjectCatalogResponse> {
    return this.reader.readCatalog(scope, connectionId, request);
  }
}
