/** Owned concern: execute RenameWarehouseConnection without changing connection identity. */
import type {
  IWarehouseConnectionCatalog,
  RenameWarehouseConnectionInput,
  WarehouseConnection,
} from '../ports/warehouseSourceImport.js';

export class RenameWarehouseConnectionUseCase {
  public constructor(private readonly catalog: IWarehouseConnectionCatalog) {}

  public async execute(input: RenameWarehouseConnectionInput): Promise<WarehouseConnection> {
    return this.catalog.renameConnection(input.scope, input.connectionId, { name: input.name });
  }
}
