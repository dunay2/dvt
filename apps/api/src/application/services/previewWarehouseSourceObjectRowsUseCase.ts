/** Owned concern: execute the PreviewWarehouseSourceObjectRows query rail. */
import {
  SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
  CONNECTED_SOURCE_REF_SCHEMA_VERSION,
  CONNECTION_REF_SCHEMA_VERSION,
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
      ...(input.expectedPublicationToken === undefined
        ? {}
        : { expectedPublicationToken: input.expectedPublicationToken }),
    });
    return SourceDataSampleResponseSchema.parse({
      contractVersion: SOURCE_DATA_SAMPLE_CONTRACT_VERSION,
      connectionId: input.connectionId,
      objectId: input.objectId,
      columns: sample.columns,
      rows: sample.rows,
      truncated: sample.truncated,
      limit: input.limit,
      provenance: {
        mode: 'live',
        sourceRefs: [
          {
            schemaVersion: CONNECTED_SOURCE_REF_SCHEMA_VERSION,
            connectionRef: {
              schemaVersion: CONNECTION_REF_SCHEMA_VERSION,
              connectionId: connection.id,
              provider: connection.type,
            },
            sourceObjectId: input.objectId,
          },
        ],
        queriedAt: sample.queriedAt,
        limit: input.limit,
        navigation: sample.navigation,
      },
    });
  }
}
