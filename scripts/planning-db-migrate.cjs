const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'tools', 'planning-db', 'migrations');
const schemaName = 'planning_query_store';

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function readMigrationFiles(directory = migrationsDir) {
  return fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort()
    .map((fileName) => ({
      fileName,
      sql: fs.readFileSync(path.join(directory, fileName), 'utf8'),
    }));
}

function buildMigrationRecords(files) {
  return files.map((file) => ({
    fileName: file.fileName,
    version: file.fileName.replace(/\.sql$/i, ''),
    checksumSha256: sha256(file.sql),
    sql: file.sql,
  }));
}

function detectChecksumMismatch(record, appliedRow) {
  if (!appliedRow || appliedRow.checksum_sha256 === record.checksumSha256) {
    return null;
  }

  return `Migration ${record.version} was already applied with checksum ${appliedRow.checksum_sha256} but now has checksum ${record.checksumSha256}.`;
}

async function ensureMigrationTable(client) {
  await client.query(`create schema if not exists ${quoteIdentifier(schemaName)}`);
  await client.query(`
    create table if not exists ${quoteIdentifier(schemaName)}.schema_migrations (
      version text primary key,
      checksum_sha256 text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function runMigrations(options = {}) {
  const url = options.databaseUrl || databaseUrl();
  const silent = options.silent === true;
  const records = buildMigrationRecords(readMigrationFiles(options.migrationsDir || migrationsDir));

  if (records.length === 0) {
    if (!silent) {
      console.log('[planning:db:migrate] No migration files found.');
    }
    return { applied: 0, skipped: 0 };
  }

  const client = options.client || new Client({ connectionString: url });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  let applied = 0;
  let skipped = 0;

  try {
    await client.query('begin');
    await ensureMigrationTable(client);

    for (const record of records) {
      const existing = await client.query(
        `select checksum_sha256 from ${quoteIdentifier(schemaName)}.schema_migrations where version = $1`,
        [record.version]
      );
      const existingRow = existing.rows[0];
      const mismatch = detectChecksumMismatch(record, existingRow);
      if (mismatch) {
        throw new Error(mismatch);
      }

      if (existingRow) {
        skipped += 1;
        continue;
      }

      await client.query(record.sql);
      await client.query(
        `insert into ${quoteIdentifier(schemaName)}.schema_migrations (version, checksum_sha256) values ($1, $2)`,
        [record.version, record.checksumSha256]
      );
      applied += 1;
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }

  if (!silent) {
    console.log(`[planning:db:migrate] applied=${applied} skipped=${skipped}`);
  }

  return { applied, skipped };
}

async function main() {
  await runMigrations();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:migrate] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  migrationsDir,
  schemaName,
  buildMigrationRecords,
  databaseUrl,
  detectChecksumMismatch,
  readMigrationFiles,
  runMigrations,
  sha256,
};
