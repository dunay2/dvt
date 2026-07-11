/** Owned concern: execute the ListWarehouseConnections query rail. */
import type { WorkspaceGraphDraftScope } from '@dvt/contracts';

import type {
  IWarehouseConnectionCatalog,
  WarehouseConnection,
} from '../ports/warehouseSourceImport.js';

export class ListWarehouseConnectionsUseCase {
  public constructor(private readonly catalog: IWarehouseConnectionCatalog) {}

  public execute(scope: WorkspaceGraphDraftScope): Promise<readonly WarehouseConnection[]> {
    return this.catalog.listConnections(scope);
  }
}
