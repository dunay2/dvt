/** Owned concern: execute CreateWarehouseConnection after backend credential probing. */
import { PostgresCredentialRefSchema } from '@dvt/contracts';

import type {
  CreateWarehouseConnectionInput,
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  WarehouseConnection,
} from '../ports/warehouseSourceImport.js';
import {
  InvalidWarehouseCredentialReferenceError,
  WarehouseConnectionTestFailedError,
} from '../ports/warehouseSourceImport.js';

export class CreateWarehouseConnectionUseCase {
  public constructor(
    private readonly catalog: IWarehouseConnectionCatalog,
    private readonly probe: IWarehouseConnectionProbe
  ) {}

  public async execute(input: CreateWarehouseConnectionInput): Promise<WarehouseConnection> {
    if (!PostgresCredentialRefSchema.safeParse(input.credentialRef).success) {
      throw new InvalidWarehouseCredentialReferenceError();
    }

    const inspected = await this.probe.inspectConnection(input);
    if (inspected.status === 'failed') {
      throw new WarehouseConnectionTestFailedError(inspected);
    }

    return this.catalog.createConnection(input.scope, {
      name: input.name,
      type: input.type,
      database: input.database,
      credentialRef: input.credentialRef,
      sourceObjects: inspected.sourceObjects,
    });
  }
}
