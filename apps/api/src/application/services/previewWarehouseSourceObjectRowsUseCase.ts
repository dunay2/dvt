/** Owned concern: execute the PreviewWarehouseSourceObjectRows query rail. */
import {
  SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
  SourceDataSampleResponseSchema,
  type SourceDataSampleResponse,
} from '@dvt/contracts';

import type {
  IWarehouseConnectionCatalog,
  IWarehouseSourceDataSampleProbe,
  PreviewWarehouseSourceObjectRowsInput,
} from '../ports/warehouseSourceImport.js';
import { WarehouseSourceDiscoveryFailedError } from '../ports/warehouseSourceImport.js';

export class PreviewWarehouseSourceObjectRowsUseCase {
  public constructor(
    private readonly catalog: IWarehouseConnectionCatalog,
    private readonly probe: IWarehouseSourceDataSampleProbe
  ) {}

  public async execute(
    input: PreviewWarehouseSourceObjectRowsInput
  ): Promise<SourceDataSampleResponse> {
    const connection = await this.catalog.getConnection(input.scope, input.connectionId);
    if (connection.credentialRef === undefined) {
      throw new WarehouseSourceDiscoveryFailedError(
        'invalid_credentials',
        'Credential reference is missing.'
      );
    }

    const sample = await this.probe.previewSourceObjectRows({
      type: connection.type,
      database: connection.database,
      credentialRef: connection.credentialRef,
      objectId: input.objectId,
      limit: input.limit,
    });
    return SourceDataSampleResponseSchema.parse({
      contractVersion: SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
      connectionId: input.connectionId,
      objectId: input.objectId,
      ...sample,
      limit: input.limit,
    });
  }
}
