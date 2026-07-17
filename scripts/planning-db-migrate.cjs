const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { defaultRunGitLines } = require('./git-local-changes.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');

const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'tools', 'planning-db', 'migrations');
const schemaName = 'planning_query_store';
const canonicalMigrationsRepoPath = 'tools/planning-db/migrations';
const migrationAdvisoryLockKeys = Object.freeze([0x445654, 0x4d494752]);
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

function compareMigrationFileNamesByOrdinal(leftFileName, rightFileName) {
  const left = parseMigrationOrdinal(leftFileName);
  const right = parseMigrationOrdinal(rightFileName);

  if (left && right && left.ordinal !== right.ordinal) {
    return left.ordinal - right.ordinal;
  }

  if (left && !right) {
    return -1;
  }

  if (!left && right) {
    return 1;
  }

  return leftFileName < rightFileName ? -1 : leftFileName > rightFileName ? 1 : 0;
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

function migrationOrdinalPolicyForDirectory(directory) {
  return path.resolve(directory) === path.resolve(migrationsDir)
    ? migrationOrdinalPolicy
    : {
        firstStrictOrdinal: 1,
        historicalFileNameSha256: buildMigrationFileNameFingerprint([]),
      };
}

function assertAppliedMigrationIdentities(
  records,
  appliedRows,
  policy = migrationOrdinalPolicy,
  knownCheckoutVersions = new Set()
) {
  const localStrictVersions = new Set();
  let highestLocalStrictOrdinal = null;

  for (const record of records) {
    const parsed = parseMigrationOrdinal(record.fileName);
    if (!parsed || parsed.ordinal < policy.firstStrictOrdinal) {
      continue;
    }

    localStrictVersions.add(record.version);
    highestLocalStrictOrdinal = Math.max(
      highestLocalStrictOrdinal ?? parsed.ordinal,
      parsed.ordinal
    );
  }

  const missingStrictFileNames = appliedRows
    .filter((row) => {
      const fileName = `${row.version}.sql`;
      const parsed = parseMigrationOrdinal(fileName);
      if (!parsed || parsed.ordinal < policy.firstStrictOrdinal) {
        return false;
      }

      if (localStrictVersions.has(row.version)) {
        return false;
      }

      return (
        knownCheckoutVersions.has(row.version) ||
        (highestLocalStrictOrdinal !== null && parsed.ordinal <= highestLocalStrictOrdinal)
      );
    })
    .map((row) => `${row.version}.sql`)
    .sort(compareMigrationFileNamesByOrdinal);

  if (missingStrictFileNames.length > 0) {
    throw new Error(
      `Applied strict migration files are missing or renamed: ${missingStrictFileNames.join(', ')}.`
    );
  }
}

function migrationVersionsFromRepoPaths(filePaths) {
  const prefix = `${canonicalMigrationsRepoPath}/`;

  return new Set(
    filePaths
      .map((filePath) => String(filePath).replace(/\\/gu, '/'))
      .filter((filePath) => filePath.startsWith(prefix) && filePath.endsWith('.sql'))
      .map((filePath) => path.posix.basename(filePath, '.sql'))
  );
}

function readKnownCanonicalMigrationVersions(options = {}) {
  const runGitLines = options.runGitLines || defaultRunGitLines;
  const repoOptions = { repoRootPath: options.repoRootPath || repoRoot };
  const baseRef = options.baseRef || process.env.GIT_BASE || 'origin/main';
  const headRef = options.headRef || process.env.GIT_HEAD || 'HEAD';
  const knownPaths = new Set();

  const collect = (args) => {
    try {
      for (const filePath of runGitLines(args, repoOptions)) {
        knownPaths.add(filePath);
      }
      return true;
    } catch {
      return false;
    }
  };

  collect(['ls-tree', '-r', '--name-only', 'HEAD', '--', canonicalMigrationsRepoPath]);
  collect([
    'log',
    '-m',
    '--format=',
    '--name-only',
    '--diff-filter=A',
    'HEAD',
    '--',
    canonicalMigrationsRepoPath,
  ]);
  collect(['diff', '--name-only', '--diff-filter=D', 'HEAD', '--', canonicalMigrationsRepoPath]);

  let mergeBase;
  try {
    [mergeBase] = runGitLines(['merge-base', baseRef, headRef], repoOptions);
  } catch {
    mergeBase = null;
  }

  if (mergeBase) {
    collect([
      'diff',
      '--name-only',
      '--diff-filter=D',
      mergeBase,
      headRef,
      '--',
      canonicalMigrationsRepoPath,
    ]);
  } else {
    const pullRequestMergeCheckout =
      options.pullRequestMergeCheckout === true ||
      (process.env.GITHUB_EVENT_NAME === 'pull_request' &&
        /^refs\/pull\/\d+\/merge$/u.test(process.env.GITHUB_REF || ''));

    if (pullRequestMergeCheckout) {
      // A shallow PR checkout lacks a merge base, but HEAD is GitHub's merge result.
      collect([
        'diff',
        '--name-only',
        '--diff-filter=D',
        baseRef,
        headRef,
        '--',
        canonicalMigrationsRepoPath,
      ]);
    }
  }

  return migrationVersionsFromRepoPaths([...knownPaths]);
}

function readMigrationFiles(directory = migrationsDir) {
  const fileNames = fs.readdirSync(directory).filter((fileName) => fileName.endsWith('.sql'));
  const policy = migrationOrdinalPolicyForDirectory(directory);

  assertMigrationOrdinalPolicy(fileNames, policy);
  fileNames.sort(compareMigrationFileNamesByOrdinal);

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

async function acquireMigrationTransactionLock(client) {
  await client.query(
    'select pg_advisory_xact_lock($1::integer, $2::integer)',
    migrationAdvisoryLockKeys
  );
}

async function runMigrations(options = {}) {
  const url = options.databaseUrl || databaseUrl();
  const silent = options.silent === true;
  const directory = options.migrationsDir || migrationsDir;
  const records = buildMigrationRecords(readMigrationFiles(directory));
  const ordinalPolicy = migrationOrdinalPolicyForDirectory(directory);
  const knownCheckoutVersions =
    options.knownMigrationVersions === undefined
      ? path.resolve(directory) === path.resolve(migrationsDir)
        ? readKnownCanonicalMigrationVersions(options)
        : new Set()
      : new Set(options.knownMigrationVersions);

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
    await acquireMigrationTransactionLock(client);
    await ensureMigrationTable(client);

    const appliedMigrations = await client.query(
      `select version, checksum_sha256 from ${quoteIdentifier(schemaName)}.schema_migrations order by version`
    );
    assertAppliedMigrationIdentities(
      records,
      appliedMigrations.rows,
      ordinalPolicy,
      knownCheckoutVersions
    );
    const appliedByVersion = new Map(appliedMigrations.rows.map((row) => [row.version, row]));

    for (const record of records) {
      const existingRow = appliedByVersion.get(record.version);
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
  assertAppliedMigrationIdentities,
  assertMigrationOrdinalPolicy,
  buildMigrationFileNameFingerprint,
  migrationsDir,
  migrationOrdinalPolicy,
  migrationVersionsFromRepoPaths,
  readKnownCanonicalMigrationVersions,
  schemaName,
  buildMigrationRecords,
  databaseUrl,
  detectChecksumMismatch,
  readMigrationFiles,
  runMigrations,
  sha256,
};
