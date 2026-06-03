/** Owned concern: execute the ListWarehouseConnections query rail. */
import type {
  IWarehouseConnectionCatalog,
  WarehouseConnection,
} from '../ports/warehouseSourceImport.js';

export class ListWarehouseConnectionsUseCase {
  public constructor(private readonly catalog: IWarehouseConnectionCatalog) {}

  public execute(): Promise<readonly WarehouseConnection[]> {
    return this.catalog.listConnections();
  }
}
