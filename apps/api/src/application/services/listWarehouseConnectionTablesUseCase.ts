/** Owned concern: execute the ListWarehouseConnectionTables query rail. */
import type {
  IWarehouseConnectionCatalog,
  WarehouseTable,
} from '../ports/warehouseSourceImport.js';

export class ListWarehouseConnectionTablesUseCase {
  public constructor(private readonly catalog: IWarehouseConnectionCatalog) {}

  public execute(connectionId: string): Promise<readonly WarehouseTable[]> {
    return this.catalog.listTables(connectionId);
  }
}
