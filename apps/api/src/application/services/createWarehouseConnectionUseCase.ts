/** Owned concern: execute CreateWarehouseConnection after backend credential probing. */
import type {
  CreateWarehouseConnectionInput,
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  WarehouseConnection,
} from '../ports/warehouseSourceImport.js';
import { WarehouseConnectionTestFailedError } from '../ports/warehouseSourceImport.js';

export class CreateWarehouseConnectionUseCase {
  public constructor(
    private readonly catalog: IWarehouseConnectionCatalog,
    private readonly probe: IWarehouseConnectionProbe
  ) {}

  public async execute(input: CreateWarehouseConnectionInput): Promise<WarehouseConnection> {
    const inspected = await this.probe.inspectConnection(input);
    if (inspected.status === 'failed') {
      throw new WarehouseConnectionTestFailedError(inspected);
    }

    return this.catalog.createConnection({
      name: input.name,
      type: input.type,
      database: input.database,
      credentialRef: input.credentialRef,
      tables: inspected.tables,
    });
  }
}
