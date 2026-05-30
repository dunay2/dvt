/** Owned concern: provide a server-owned warehouse catalog adapter for protected API mode. */
import type {
  IWarehouseConnectionCatalog,
  WarehouseConnection,
  WarehouseConnectionCatalogEntry,
  WarehouseTable,
} from '../../application/ports/warehouseSourceImport.js';
import { WarehouseConnectionNotFoundError } from '../../application/ports/warehouseSourceImport.js';

export class InMemoryWarehouseConnectionCatalog implements IWarehouseConnectionCatalog {
  private readonly entries: readonly WarehouseConnectionCatalogEntry[];

  public constructor(input: { readonly connections: readonly WarehouseConnectionCatalogEntry[] }) {
    this.entries = input.connections;
  }

  public async listConnections(): Promise<readonly WarehouseConnection[]> {
    return this.entries.map(({ tables: _tables, ...connection }) => connection);
  }

  public async listTables(connectionId: string): Promise<readonly WarehouseTable[]> {
    const connection = this.entries.find((entry) => entry.id === connectionId);
    if (!connection) {
      throw new WarehouseConnectionNotFoundError(connectionId);
    }

    return connection.tables;
  }
}

export function createDefaultWarehouseConnectionCatalog(): InMemoryWarehouseConnectionCatalog {
  return new InMemoryWarehouseConnectionCatalog({
    connections: [
      {
        id: 'local-analytics',
        name: 'Local analytics catalog',
        type: 'postgres',
        database: 'analytics',
        tables: [
          {
            database: 'analytics',
            schema: 'public',
            table: 'orders',
            columns: [
              { name: 'id', type: 'integer', nullable: false },
              { name: 'created_at', type: 'timestamp', nullable: false },
            ],
          },
        ],
      },
    ],
  });
}
