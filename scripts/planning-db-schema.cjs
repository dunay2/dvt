#!/usr/bin/env node
/**
 * @file scripts/planning-db-schema.cjs
 * @ownedConcern Replace Planning DB with its one declarative current schema.
 * @baseline ADR-0063: Planning DB current-schema rebuild
 * @decision Planning DB is rebuilt from current truth and has no migration compatibility.
 */
const fs = require('node:fs');
const { sha256HexUtf8 } = require('@dvt/crypto');
const path = require('node:path');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const schemaName = 'planning_query_store';
const schemaNames = ['architecture', 'component_engineering', schemaName];
const currentSchemaPath = path.join(repoRoot, 'tools', 'planning-db', 'schema.sql');

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function assertCurrentPlanningDbSchema(schemaSql) {
  const sql = String(schemaSql || '');
  const missingSchemas = schemaNames.filter(
    (name) => !new RegExp(`create\\s+schema\\s+${name}\\s*;`, 'iu').test(sql)
  );
  if (missingSchemas.length > 0) {
    throw new Error(`Current Planning DB schema must declare ${missingSchemas.join(', ')}.`);
  }
  if (
    /schema_migrations|migration_state|migration_checksum|migration_ordinal|applied_migrations?(?:_identity)?|planning:db:migrate/iu.test(
      sql
    )
  ) {
    throw new Error('Current Planning DB schema must not contain migration state.');
  }
  if (/^\\(?:restrict|unrestrict)\b/imu.test(sql)) {
    throw new Error('Current Planning DB schema must not contain psql session tokens.');
  }
  return sql;
}

async function applyCurrentPlanningDbSchema(options = {}) {
  const schemaSql = assertCurrentPlanningDbSchema(
    options.schemaSql ?? fs.readFileSync(currentSchemaPath, 'utf8')
  );
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  const managesTransaction = options.manageTransaction !== false;

  if (!managesTransaction && ownsClient) {
    throw new Error('Caller-managed schema replacement requires an existing client transaction.');
  }

  if (ownsClient) {
    await client.connect();
  }

  try {
    if (managesTransaction) {
      await client.query('begin');
    }
    await client.query(
      "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))"
    );
    for (const name of [...schemaNames].reverse()) {
      await client.query(`drop schema if exists ${name} cascade`);
    }
    await client.query(schemaSql);
    if (managesTransaction) {
      await client.query('commit');
    }
  } catch (error) {
    if (managesTransaction) {
      await client.query('rollback');
    }
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }

  const result = { schemas: schemaNames, replaced: true };
  if (options.silent !== true) {
    console.log(`[planning:db:schema] schemas=${schemaNames.join(',')} replaced=true`);
  }
  return result;
}

async function assertPlanningDbCurrentSchemaReady(client) {
  const result = await client.query(
    `select
       to_regclass('planning_query_store.command_query_rails') is not null as has_query_store,
       to_regclass('component_engineering.component_metadata_query') is not null as has_component_engineering,
       to_regclass('architecture.component') is not null as has_architecture,
       to_regclass('planning_query_store.schema_migrations') is null as has_no_migration_ledger,
       not exists (
         select 1
         from information_schema.columns
         where table_schema in ('architecture', 'component_engineering', 'planning_query_store')
           and column_name = 'migration_state'
       ) as has_no_migration_state`
  );
  const state = result.rows[0] || {};
  if (Object.values(state).some((value) => value !== true)) {
    throw new Error(
      'Planning DB is not on the current schema. Run `pnpm planning:db:import` to replace it.'
    );
  }
  return state;
}

async function main() {
  if (process.argv.length > 2) {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--add-table' || args[2] !== '--expected-schema-sha256') {
      throw new Error(
        'Expected --add-table <schema.table> --expected-schema-sha256 <reviewed digest>.'
      );
    }
    const result = await addCurrentPlanningDbTable({
      table: args[1],
      expectedSchemaSha256: args[3],
    });
    console.log(`[planning:db:schema] added=${result.table} schemaSha256=${result.schemaSha256}`);
    return;
  }
  await applyCurrentPlanningDbSchema();
}

async function addCurrentPlanningDbTable(options) {
  const { table, expectedSchemaSha256 } = options;
  if (
    !/^(?:architecture|component_engineering|planning_query_store)\.[a-z][a-z0-9_]*$/u.test(table)
  )
    throw new Error('Invalid current-schema table identity.');
  const schemaSql = assertCurrentPlanningDbSchema(fs.readFileSync(currentSchemaPath, 'utf8'));
  const schemaSha256 = sha256HexUtf8(schemaSql);
  if (schemaSha256 !== expectedSchemaSha256)
    throw new Error('Reviewed schema digest does not match.');
  const escapedTable = table.replace('.', '\\.');
  const definitions = [
    ...schemaSql.matchAll(
      new RegExp('^CREATE TABLE ' + escapedTable + ' \\([\\s\\S]*?^\\);', 'gm')
    ),
  ];
  const externalClauses = new RegExp('(?:ALTER TABLE(?: ONLY)?|ON) ' + escapedTable + '\\b', 'u');
  if (definitions.length !== 1 || externalClauses.test(schemaSql))
    throw new Error(
      'Addition requires one self-contained current table definition with inline constraints.'
    );
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  let transactionStarted = false;
  try {
    if (!options.client) await client.connect();
    await client.query('begin');
    transactionStarted = true;
    await client.query(
      "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))"
    );
    const existing = await client.query('select to_regclass($1) as existing', [table]);
    if (existing.rows[0]?.existing)
      throw new Error('Current-schema table already exists: ' + table);
    await client.query(definitions[0][0]);
    await client.query('commit');
    return { table, schemaSha256 };
  } catch (error) {
    if (transactionStarted) await client.query('rollback');
    throw error;
  } finally {
    if (!options.client) await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:schema] ${error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  addCurrentPlanningDbTable,
  applyCurrentPlanningDbSchema,
  assertPlanningDbCurrentSchemaReady,
  assertCurrentPlanningDbSchema,
  currentSchemaPath,
  databaseUrl,
  schemaName,
  schemaNames,
};
