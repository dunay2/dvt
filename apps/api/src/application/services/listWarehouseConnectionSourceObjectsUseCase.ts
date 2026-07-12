/** Owned concern: execute the ListWarehouseConnectionSourceObjects query rail. */
import {
  SOURCE_OBJECT_CATALOG_CONTRACT_VERSION,
  type SourceObjectCatalogResponse,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { WarehouseConnectionSourceObjectReader } from './WarehouseConnectionSourceObjectReader.js';

export class ListWarehouseConnectionSourceObjectsUseCase {
  public constructor(private readonly reader: WarehouseConnectionSourceObjectReader) {}

  public async execute(
    scope: WorkspaceGraphDraftScope,
    connectionId: string
  ): Promise<SourceObjectCatalogResponse> {
    const result = await this.reader.read(scope, connectionId);
    return {
      contractVersion: SOURCE_OBJECT_CATALOG_CONTRACT_VERSION,
      objects: [...result.sourceObjects],
    };
  }
}
