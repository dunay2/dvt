/** Owned concern: require the declared warehouse database to match the opened credential binding. */
import type { Client } from 'pg';

import { WarehouseSourceDiscoveryFailedError } from '../../application/ports/warehouseSourceImport.js';

export async function assertPostgresWarehouseDatabase(
  client: Pick<Client, 'query'>,
  database: string
): Promise<void> {
  const result = await client.query<{ database: string }>('select current_database() as database');
  if (result.rows.length !== 1 || result.rows[0]?.database !== database) {
    throw new WarehouseSourceDiscoveryFailedError(
      'invalid_credentials',
      'The configured warehouse database does not match the resolved credential database.'
    );
  }
}
