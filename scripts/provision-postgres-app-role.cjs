#!/usr/bin/env node
/**
 * Owned concern: provision the CI/local PostgreSQL application role used to
 * prove RLS behavior without superuser or BYPASSRLS privileges.
 */

const { Client } = require('pg');

const adminUrl = process.env.DVT_PG_ADMIN_URL ?? process.env.DATABASE_URL;
const appUser = process.env.DVT_PG_APP_USER ?? 'dvt_app';
const appPassword = process.env.DVT_PG_APP_PASSWORD ?? 'dvt_app';
const databaseName =
  process.env.DVT_PG_DATABASE ??
  (adminUrl === undefined ? undefined : new URL(adminUrl).pathname.replace(/^\//, ''));

if (adminUrl === undefined || adminUrl.trim() === '') {
  throw new Error('DVT_PG_ADMIN_URL or DATABASE_URL is required');
}

if (databaseName === undefined || databaseName.trim() === '') {
  throw new Error('DVT_PG_DATABASE or a database name in DVT_PG_ADMIN_URL is required');
}

const client = new Client({ connectionString: adminUrl });

main()
  .then(() => {
    console.log(`[postgres-role] Provisioned non-bypass role ${appUser} for ${databaseName}`);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });

async function main() {
  await client.connect();
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${quoteLiteral(appUser)}) THEN
        EXECUTE format(
          'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
          ${quoteLiteral(appUser)},
          ${quoteLiteral(appPassword)}
        );
      ELSE
        EXECUTE format(
          'ALTER ROLE %I WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS',
          ${quoteLiteral(appUser)},
          ${quoteLiteral(appPassword)}
        );
      END IF;
    END $$;
  `);
  await client.query(
    `GRANT CONNECT, CREATE ON DATABASE ${quoteIdentifier(databaseName)} TO ${quoteIdentifier(
      appUser
    )}`
  );

  const verification = await client.query(
    `
      SELECT rolsuper, rolbypassrls
      FROM pg_roles
      WHERE rolname = $1
    `,
    [appUser]
  );
  const role = verification.rows[0];
  if (role === undefined) {
    throw new Error(`POSTGRES_APP_ROLE_NOT_FOUND:${appUser}`);
  }
  if (role.rolsuper === true || role.rolbypassrls === true) {
    throw new Error(`POSTGRES_APP_ROLE_CAN_BYPASS_RLS:${appUser}`);
  }
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}
