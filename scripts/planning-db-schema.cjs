#!/usr/bin/env node
/**
 * @file scripts/planning-db-schema.cjs
 * @ownedConcern Replace Planning DB with its one declarative current schema.
 * @baseline ADR-0063: Planning DB current-schema rebuild
 * @decision Planning DB is rebuilt from current truth and has no migration compatibility.
 */
const fs = require('node:fs');
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
  if (/schema_migrations|migration_state|planning:db:migrate/iu.test(sql)) {
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

  if (ownsClient) {
    await client.connect();
  }

  try {
    await client.query('begin');
    await client.query(
      "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))"
    );
    for (const name of [...schemaNames].reverse()) {
      await client.query(`drop schema if exists ${name} cascade`);
    }
    await client.query(schemaSql);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
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

async function main() {
  await applyCurrentPlanningDbSchema();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:schema] ${error.message || error}`);
    process.exit(1);
  });
}

module.exports = {
  applyCurrentPlanningDbSchema,
  assertCurrentPlanningDbSchema,
  currentSchemaPath,
  databaseUrl,
  schemaName,
  schemaNames,
};
