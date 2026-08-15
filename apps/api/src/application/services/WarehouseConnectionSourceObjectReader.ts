/** Owned concern: resolve the authoritative live SourceObject catalog for one connection. */
import type { SourceObject, WorkspaceGraphDraftScope } from '@dvt/contracts';

import type {
  IWarehouseConnectionCatalog,
  IWarehouseConnectionProbe,
  WarehouseConnectionCatalogEntry,
} from '../ports/warehouseSourceImport.js';
import { WarehouseSourceDiscoveryFailedError } from '../ports/warehouseSourceImport.js';

export type WarehouseConnectionSourceObjectRead = Readonly<{
  connection: WarehouseConnectionCatalogEntry;
  databaseUser?: string;
  sourceObjects: readonly SourceObject[];
}>;

export class WarehouseConnectionSourceObjectReader {
  public constructor(
    private readonly catalog: IWarehouseConnectionCatalog,
    private readonly probe: IWarehouseConnectionProbe
  ) {}

  public async read(
    scope: WorkspaceGraphDraftScope,
    connectionId: string
  ): Promise<WarehouseConnectionSourceObjectRead> {
    const connection = await this.catalog.getConnection(scope, connectionId);
    if (connection.credentialRef === undefined) {
      throw new WarehouseSourceDiscoveryFailedError(
        'invalid_credentials',
        'Credential reference is missing.'
      );
    }

    const inspected = await this.probe.inspectConnection({
      type: connection.type,
      database: connection.database,
      credentialRef: connection.credentialRef,
    });
    if (inspected.status === 'failed') {
      throw new WarehouseSourceDiscoveryFailedError(inspected.reason, inspected.message);
    }

    return {
      connection,
      ...(inspected.databaseUser === undefined ? {} : { databaseUser: inspected.databaseUser }),
      sourceObjects: inspected.sourceObjects,
    };
  }
}
