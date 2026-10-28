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
    if (args[0] === '--replace-read-views') {
      const flags = new Map();
      for (let index = 1; index < args.length; index += 2) {
        if (
          ![
            '--expected-schema-sha256',
            '--expected-manifest-view-sha256',
            '--expected-lifecycle-view-sha256',
          ].includes(args[index]) ||
          flags.has(args[index]) ||
          !args[index + 1]
        ) {
          throw new Error('Explicit two-view mode requires exactly the three reviewed digests.');
        }
        flags.set(args[index], args[index + 1]);
      }
      if (flags.size !== 3)
        throw new Error('Explicit two-view mode requires exactly the three reviewed digests.');
      console.log(
        JSON.stringify(
          await replaceCurrentPlanningDbViews({
            expectedSchemaSha256: flags.get('--expected-schema-sha256'),
            expectedManifestViewSha256: flags.get('--expected-manifest-view-sha256'),
            expectedLifecycleViewSha256: flags.get('--expected-lifecycle-view-sha256'),
          })
        )
      );
      return;
    }
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

async function replaceCurrentPlanningDbViews(options = {}) {
  if (
    Object.keys(options).some(
      (key) =>
        ![
          'client',
          'databaseUrl',
          'expectedSchemaSha256',
          'expectedManifestViewSha256',
          'expectedLifecycleViewSha256',
        ].includes(key)
    )
  ) {
    throw new Error('Unsupported two-view option; caller SQL and identities are forbidden.');
  }
  const sql = assertCurrentPlanningDbSchema(fs.readFileSync(currentSchemaPath, 'utf8'));
  const schemaSha256 = sha256HexUtf8(sql);
  if (schemaSha256 !== options.expectedSchemaSha256)
    throw new Error('Reviewed schema digest does not match.');
  const views = [
    {
      name: 'planning_query_store.command_query_rail_manifest_query',
      expected: options.expectedManifestViewSha256,
      count: 27,
      append: { attname: 'effective_component_guides', type: 'jsonb' },
    },
    {
      name: 'planning_query_store.documentation_lifecycle_query',
      expected: options.expectedLifecycleViewSha256,
      count: 26,
      append: { attname: 'canonical_target_path', type: 'text' },
    },
  ];
  for (const view of views) {
    if (!/^[a-f0-9]{64}$/u.test(view.expected || ''))
      throw new Error('Exact live view-definition digests required.');
    const matches = [
      ...sql.matchAll(
        new RegExp(
          '^CREATE VIEW ' + view.name.replaceAll('.', '\\.') + ' AS[\\s\\S]*?;(?=\\r?\\n\\r?\\n)',
          'gm'
        )
      ),
    ];
    if (matches.length !== 1)
      throw new Error('Expected exactly one reviewed definition for ' + view.name);
    const statement = matches[0][0].replace(/'(?:[^']|'')*'/gu, "''");
    if (statement.split(';').length !== 2 || !statement.endsWith(';')) {
      throw new Error('Exactly one CREATE VIEW statement is required for ' + view.name);
    }
    view.statement = matches[0][0].replace(/^CREATE VIEW /u, 'CREATE OR REPLACE VIEW ');
  }
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  try {
    if (!options.client) await client.connect();
    await client.query('begin');
    await client.query(
      "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))"
    );
    for (const view of views) {
      const result = await client.query(
        'select pg_get_viewdef(to_regclass($1), true) as definition',
        [view.name]
      );
      if (
        typeof result.rows[0]?.definition !== 'string' ||
        sha256HexUtf8(result.rows[0].definition) !== view.expected
      ) {
        throw new Error('Missing view or stale definition CAS: ' + view.name);
      }
      view.before = (
        await client.query(
          `select attname, format_type(atttypid, atttypmod) as type
        from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum`,
          [view.name]
        )
      ).rows;
      if (view.before.length !== view.count)
        throw new Error('Unexpected current view signature: ' + view.name);
    }
    for (const view of views) await client.query(view.statement);
    for (const view of views) {
      const columns = (
        await client.query(
          `select attname, format_type(atttypid, atttypmod) as type
        from pg_attribute where attrelid=$1::regclass and attnum>0 and not attisdropped order by attnum`,
          [view.name]
        )
      ).rows;
      if (JSON.stringify(columns) !== JSON.stringify([...view.before, view.append]))
        throw new Error('View signature drift: ' + view.name);
      view.after = sha256HexUtf8(
        (await client.query('select pg_get_viewdef($1::regclass, true) as definition', [view.name]))
          .rows[0].definition
      );
    }
    await client.query('commit');
    return {
      schemaSha256,
      replaced: views.map((view) => ({
        view: view.name,
        beforeDefinitionSha256: view.expected,
        afterDefinitionSha256: view.after,
      })),
    };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (!options.client) await client.end();
  }
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
  replaceCurrentPlanningDbViews,
  addCurrentPlanningDbTable,
  applyCurrentPlanningDbSchema,
  assertPlanningDbCurrentSchemaReady,
  assertCurrentPlanningDbSchema,
  currentSchemaPath,
  databaseUrl,
  schemaName,
  schemaNames,
};
