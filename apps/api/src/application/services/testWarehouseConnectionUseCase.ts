/** Owned concern: execute TestWarehouseConnection through a backend-owned probe. */
import type {
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  TestWarehouseConnectionInput,
  TestWarehouseConnectionResult,
} from '../ports/warehouseSourceImport.js';

export class TestWarehouseConnectionUseCase {
  public constructor(
    private readonly catalog: IWarehouseConnectionCatalog,
    private readonly probe: IWarehouseConnectionProbe
  ) {}

  public async execute(
    input: TestWarehouseConnectionInput
  ): Promise<TestWarehouseConnectionResult> {
    return this.probe.testConnection(
      await this.catalog.getConnection(input.scope, input.connectionId)
    );
  }
}
