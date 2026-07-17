const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'tools', 'planning-db', 'migrations');
const schemaName = 'planning_query_store';
const migrationOrdinalPolicy = Object.freeze({
  firstStrictOrdinal: 722,
  historicalFileNameSha256: 'cf3ca7b58eb93139ab8e7357a78d5aa42439c3510b3177d1cc7a6a86cc57957e',
});

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeSqlForChecksum(sql) {
  return String(sql).replace(/\r\n/g, '\n');
}

function buildLineEndingCompatibleChecksums(sql) {
  const rawSql = String(sql);
  return Array.from(
    new Set([
      sha256(normalizeSqlForChecksum(rawSql)),
      sha256(rawSql),
      sha256(rawSql.replace(/\r?\n/g, '\r\n')),
    ])
  );
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function buildMigrationFileNameFingerprint(fileNames) {
  return sha256([...fileNames].sort().join('\n'));
}

function parseMigrationOrdinal(fileName) {
  const match = /^(\d+)([a-z]*)_/iu.exec(fileName);
  if (!match) {
    return null;
  }

  return {
    fileName,
    ordinal: Number.parseInt(match[1], 10),
    strictFormat: match[2].length === 0,
  };
}

function analyzeMigrationOrdinals(fileNames, policy = migrationOrdinalPolicy) {
  const parsed = fileNames.map(parseMigrationOrdinal);
  const invalidFileNames = fileNames
    .filter((_fileName, index) => {
      const record = parsed[index];
      return (
        record === null ||
        (record.ordinal >= policy.firstStrictOrdinal && record.strictFormat === false)
      );
    })
    .sort();
  const records = parsed.filter(Boolean);
  const highestOrdinal = records.reduce(
    (highest, record) => Math.max(highest, record.ordinal),
    policy.firstStrictOrdinal - 1
  );
  const strictGroups = new Map();

  for (const record of records) {
    if (record.ordinal < policy.firstStrictOrdinal) {
      continue;
    }

    const group = strictGroups.get(record.ordinal) || [];
    group.push(record.fileName);
    strictGroups.set(record.ordinal, group);
  }

  const strictDuplicateOrdinals = [...strictGroups.entries()]
    .filter(([, names]) => names.length > 1)
    .sort(([left], [right]) => left - right)
    .map(([ordinal, names]) => ({ ordinal, fileNames: names.sort() }));
  const historicalFileNames = records
    .filter((record) => record.ordinal < policy.firstStrictOrdinal)
    .map((record) => record.fileName);
  const historicalFileNameSha256 = buildMigrationFileNameFingerprint(historicalFileNames);

  return {
    highestOrdinal,
    nextSafeOrdinal: highestOrdinal + 1,
    invalidFileNames,
    strictDuplicateOrdinals,
    historicalFileNameSha256,
    historicalFileNamesMatch: historicalFileNameSha256 === policy.historicalFileNameSha256,
  };
}

function formatMigrationOrdinal(ordinal) {
  return String(ordinal).padStart(3, '0');
}

function assertMigrationOrdinalPolicy(fileNames, policy = migrationOrdinalPolicy) {
  const report = analyzeMigrationOrdinals(fileNames, policy);
  const suffix = `Highest ordinal=${report.highestOrdinal}; next safe ordinal=${report.nextSafeOrdinal}.`;

  if (report.invalidFileNames.length > 0) {
    throw new Error(
      `Migration filenames must use the numeric NNN_name.sql format: ${report.invalidFileNames.join(', ')}. ${suffix}`
    );
  }

  if (!report.historicalFileNamesMatch) {
    throw new Error(
      `Applied migration filename history changed below strict ordinal ${formatMigrationOrdinal(policy.firstStrictOrdinal)}. ` +
        `Expected fingerprint ${policy.historicalFileNameSha256} but found ${report.historicalFileNameSha256}. ${suffix}`
    );
  }

  if (report.strictDuplicateOrdinals.length > 0) {
    const duplicates = report.strictDuplicateOrdinals
      .map(
        ({ ordinal, fileNames: duplicateFileNames }) =>
          `${formatMigrationOrdinal(ordinal)}: ${duplicateFileNames.join(', ')}`
      )
      .join('; ');
    throw new Error(`Duplicate strict migration ordinal ${duplicates}. ${suffix}`);
  }

  return report;
}

function readMigrationFiles(directory = migrationsDir) {
  const fileNames = fs
    .readdirSync(directory)
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort();
  const policy =
    path.resolve(directory) === path.resolve(migrationsDir)
      ? migrationOrdinalPolicy
      : {
          firstStrictOrdinal: 1,
          historicalFileNameSha256: buildMigrationFileNameFingerprint([]),
        };

  assertMigrationOrdinalPolicy(fileNames, policy);

  return fileNames.map((fileName) => ({
    fileName,
    sql: fs.readFileSync(path.join(directory, fileName), 'utf8'),
  }));
}

function buildMigrationRecords(files) {
  return files.map((file) => ({
    fileName: file.fileName,
    version: file.fileName.replace(/\.sql$/i, ''),
    checksumSha256: sha256(normalizeSqlForChecksum(file.sql)),
    compatibleChecksumSha256: buildLineEndingCompatibleChecksums(file.sql),
    sql: file.sql,
  }));
}

function detectChecksumMismatch(record, appliedRow) {
  const compatibleChecksums = new Set([
    record.checksumSha256,
    ...(record.compatibleChecksumSha256 || []),
  ]);

  if (!appliedRow || compatibleChecksums.has(appliedRow.checksum_sha256)) {
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
  analyzeMigrationOrdinals,
  assertMigrationOrdinalPolicy,
  buildMigrationFileNameFingerprint,
  migrationsDir,
  migrationOrdinalPolicy,
  schemaName,
  buildMigrationRecords,
  databaseUrl,
  detectChecksumMismatch,
  readMigrationFiles,
  runMigrations,
  sha256,
};
