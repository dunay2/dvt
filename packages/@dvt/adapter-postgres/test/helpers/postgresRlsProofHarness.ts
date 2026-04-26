import { URL } from 'node:url';

import { Client } from 'pg';
import { afterAll, describe } from 'vitest';

import {
  CORE_TENANT_ISOLATION_TABLES,
  START_RUN_INTENT_TENANT_ISOLATION_TABLES,
  TENANT_ISOLATION_TABLES,
  type TenantIsolationTable,
} from '../../src/PostgresTenantIsolationPolicy.js';
import { quoteIdentifier } from '../../src/sqlUtils.js';

/**
 * Owned concern: centralize real PostgreSQL RLS proof setup so tests can
 * distinguish admin migration authority from non-owner application runtime.
 */
const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
export const describeIfPg = runIntegration ? describe : describe.skip;
export const POSTGRES_RLS_PROOF_NOW = '2026-04-25T00:00:00.000Z';

const DEFAULT_ADMIN_CONNECTION_STRING = 'postgresql://dvt:dvt@localhost:5432/dvt';

export interface PostgresRlsProofConnections {
  readonly adminConnectionString: string;
  readonly appConnectionString: string;
  readonly appRole: string;
}

export class PostgresRlsProofHarness {
  private readonly createdSchemas = new Set<string>();
  private schemaCounter = 0;

  constructor(
    readonly connections: PostgresRlsProofConnections,
    private readonly schemaPrefix: string
  ) {}

  allocateSchema(): string {
    this.schemaCounter += 1;
    const schema = `${this.schemaPrefix}_${this.schemaCounter}`;
    this.createdSchemas.add(schema);
    return schema;
  }

  async dropCreatedSchemas(): Promise<void> {
    if (this.createdSchemas.size === 0) {
      return;
    }
    await this.withAdminClient(async (client) => {
      for (const schema of this.createdSchemas) {
        await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
      }
    });
  }

  async withAdminClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    return withClient(this.connections.adminConnectionString, fn);
  }

  async withAppClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    return withClient(this.connections.appConnectionString, fn);
  }

  async grantRlsProbePrivileges(schema: string): Promise<void> {
    await this.withAdminClient(async (client) => {
      await grantSchemaUsage(client, schema, this.connections.appRole);
      await grantTablePrivileges(
        client,
        schema,
        this.connections.appRole,
        TENANT_ISOLATION_TABLES,
        ['SELECT']
      );
    });
  }

  async grantStateStoreRuntimePrivileges(schema: string): Promise<void> {
    await this.withAdminClient(async (client) => {
      await grantSchemaUsage(client, schema, this.connections.appRole);
      await grantTablePrivileges(
        client,
        schema,
        this.connections.appRole,
        CORE_TENANT_ISOLATION_TABLES,
        ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      );
    });
  }

  async grantStartRunIntentRuntimePrivileges(schema: string): Promise<void> {
    await this.withAdminClient(async (client) => {
      await grantSchemaUsage(client, schema, this.connections.appRole);
      await grantTablePrivileges(
        client,
        schema,
        this.connections.appRole,
        START_RUN_INTENT_TENANT_ISOLATION_TABLES,
        ['SELECT', 'INSERT', 'UPDATE', 'DELETE']
      );
    });
  }
}

export function usePostgresRlsProofHarness(schemaLabel: string): PostgresRlsProofHarness {
  const harness = new PostgresRlsProofHarness(
    runIntegration ? resolvePostgresRlsProofConnections() : skippedPostgresRlsProofConnections(),
    `${schemaLabel}_${Date.now()}`
  );
  afterAll(async () => {
    await harness.dropCreatedSchemas();
  });
  return harness;
}

function skippedPostgresRlsProofConnections(): PostgresRlsProofConnections {
  return {
    adminConnectionString: '',
    appConnectionString: '',
    appRole: '',
  };
}

export async function assertLeastPrivilegeApplicationRole(
  client: Client,
  expectedRole: string
): Promise<void> {
  const result = await client.query<{
    current_user: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    has_database_create: boolean;
    has_public_schema_create: boolean;
  }>(
    `
      SELECT
        current_user,
        rolsuper,
        rolbypassrls,
        has_database_privilege(current_user, current_database(), 'CREATE') AS has_database_create,
        CASE
          WHEN to_regnamespace('public') IS NULL THEN false
          ELSE has_schema_privilege(current_user, 'public', 'CREATE')
        END AS has_public_schema_create
      FROM pg_roles
      WHERE rolname = current_user
    `
  );

  const role = result.rows[0];
  if (role === undefined) {
    throw new Error('RLS_DIRECT_TEST_REQUIRES_DATABASE_ROLE');
  }
  if (role.current_user !== expectedRole) {
    throw new Error(`RLS_DIRECT_TEST_ROLE_MISMATCH:${expectedRole}:${role.current_user}`);
  }
  if (role.rolsuper === true || role.rolbypassrls === true) {
    throw new Error('RLS_DIRECT_TEST_REQUIRES_NON_BYPASS_ROLE');
  }
  if (role.has_database_create === true || role.has_public_schema_create === true) {
    throw new Error('RLS_DIRECT_TEST_REQUIRES_NON_SCHEMA_CREATING_ROLE');
  }
}

function resolvePostgresRlsProofConnections(): PostgresRlsProofConnections {
  const adminConnectionString =
    process.env.DVT_PG_ADMIN_URL ??
    process.env.DVT_PG_URL ??
    process.env.DATABASE_URL ??
    DEFAULT_ADMIN_CONNECTION_STRING;
  const appConnectionString = requireAppRoleConnectionString();
  return {
    adminConnectionString,
    appConnectionString,
    appRole: decodeURIComponent(new URL(appConnectionString).username),
  };
}

function requireAppRoleConnectionString(): string {
  const connectionString = process.env.DVT_PG_RLS_URL;
  if (connectionString === undefined || connectionString.trim() === '') {
    throw new Error('DVT_PG_RLS_URL is required for Postgres RLS proof tests');
  }
  return connectionString;
}

async function withClient<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function grantSchemaUsage(client: Client, schema: string, role: string): Promise<void> {
  await client.query(
    `GRANT USAGE ON SCHEMA ${quoteIdentifier(schema)} TO ${quoteIdentifier(role)}`
  );
}

async function grantTablePrivileges(
  client: Client,
  schema: string,
  role: string,
  tables: readonly TenantIsolationTable[],
  privileges: readonly string[]
): Promise<void> {
  const privilegeList = privileges.join(', ');
  for (const table of tables) {
    await client.query(
      `GRANT ${privilegeList} ON ${quoteIdentifier(schema)}.${quoteIdentifier(
        table.name
      )} TO ${quoteIdentifier(role)}`
    );
  }
}
