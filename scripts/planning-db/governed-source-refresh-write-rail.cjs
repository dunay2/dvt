/** Owned concern: refresh exact-HEAD content identity for existing governed sources. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { randomUuidV4, sha256Hex, sha256HexUtf8 } = require('@dvt/crypto');

const { Client } = require('pg');

const { normalizeTextBytesForHash } = require('../generate-governance-file-component-index.cjs');
const { defaultPgUrl } = require('../planning-db-run.cjs');
const { assertPlanningDbCurrentSchemaReady, schemaName } = require('../planning-db-schema.cjs');

const repoRoot = path.resolve(__dirname, '..', '..');

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function normalizeGovernedSourcePath(value) {
  const sourcePath = String(value || '').trim();
  if (
    !sourcePath ||
    sourcePath === '.' ||
    sourcePath.includes('\\') ||
    sourcePath.includes('//') ||
    path.posix.isAbsolute(sourcePath) ||
    /^[a-zA-Z]:/u.test(sourcePath) ||
    sourcePath.split('/').some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new Error(
      `Governed source path "${value}" must be an unambiguous POSIX repository-relative path.`
    );
  }
  return sourcePath;
}

function canonicalSourceContentHash(contentBytes) {
  return sha256Hex(normalizeTextBytesForHash(Buffer.from(contentBytes)));
}

function defaultGit(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: null,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function assertInsideRepository(root, resolvedPath, sourcePath) {
  const relative = path.relative(path.resolve(root), path.resolve(resolvedPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Governed source "${sourcePath}" resolves outside the repository.`);
  }
}

function parseTreeEntry(rawEntry, sourcePath) {
  const entry = rawEntry.toString('utf8').replace(/\0$/u, '');
  const match = /^(\d{6}) blob ([a-f0-9]{40,64})\t(.+)$/u.exec(entry);
  if (!match || match[3] !== sourcePath || !['100644', '100755'].includes(match[1])) {
    throw new Error(`Governed source "${sourcePath}" must be a tracked regular file at HEAD.`);
  }
  return { mode: match[1], blobSha: match[2] };
}

function readGovernedSourceSnapshots(options) {
  const root = path.resolve(options.repoRoot || repoRoot);
  const git = options.git || ((args) => defaultGit(args, root));
  const lstat = options.lstat || fs.lstatSync;
  const realpath = options.realpath || fs.realpathSync;
  const paths = [...new Set(options.paths.map(normalizeGovernedSourcePath))].sort();
  const sourceCommitSha = git(['rev-parse', '--verify', 'HEAD']).toString('utf8').trim();
  if (!/^[a-f0-9]{40,64}$/u.test(sourceCommitSha)) {
    throw new Error('Unable to resolve an exact current Git HEAD commit.');
  }

  const sources = paths.map((sourcePath) => {
    const status = git([
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
      '--',
      sourcePath,
    ]);
    if (status.length > 0) {
      throw new Error(`Governed source "${sourcePath}" must be unmodified relative to HEAD.`);
    }

    const absolutePath = path.resolve(root, ...sourcePath.split('/'));
    assertInsideRepository(root, absolutePath, sourcePath);
    let stats;
    try {
      stats = lstat(absolutePath);
    } catch {
      throw new Error(`Governed source "${sourcePath}" must be a tracked regular file at HEAD.`);
    }
    if (stats.isSymbolicLink() || !stats.isFile()) {
      throw new Error(`Governed source "${sourcePath}" cannot use symbolic links.`);
    }
    assertInsideRepository(root, realpath(absolutePath), sourcePath);

    const treeEntry = parseTreeEntry(
      git(['ls-tree', '-z', sourceCommitSha, '--', sourcePath]),
      sourcePath
    );
    const contentBytes = git(['show', `${sourceCommitSha}:${sourcePath}`]);
    return {
      path: sourcePath,
      blobSha: treeEntry.blobSha,
      contentHash: canonicalSourceContentHash(contentBytes),
    };
  });

  return { sourceCommitSha, sources };
}

function defaultGovernedSourceRefreshIdempotencyKey(command, snapshot) {
  return [
    command.kind,
    command.actor || 'anonymous',
    sha256HexUtf8(
      stableStringify({
        paths: command.paths,
        expectedContentSha256ByPath: command.expectedContentSha256ByPath || {},
        sourceCommitSha: snapshot.sourceCommitSha,
        sources: snapshot.sources.map(({ path: sourcePath, contentHash }) => ({
          path: sourcePath,
          contentHash,
        })),
      })
    ).slice(0, 16),
  ].join(':');
}

function normalizeRow(row) {
  const rawOverrideRevision = row.override_revision ?? row.overrideRevision ?? null;
  return {
    path: row.path,
    pathHash: row.path_hash ?? row.pathHash,
    importedContentHash: row.content_hash ?? row.contentHash,
    governanceHash: row.governance_hash ?? row.governanceHash,
    overrideContentHash: row.override_content_hash ?? row.overrideContentHash ?? null,
    revision: rawOverrideRevision === null ? null : Number(rawOverrideRevision),
  };
}

function planGovernedSourceRefreshOperation({
  command,
  sourceCommitSha,
  snapshots,
  governedRows,
  existingOverrides = [],
  operationId,
  now,
}) {
  const overrideByPath = new Map(existingOverrides.map((row) => [row.path, normalizeRow(row)]));
  const governedByPath = new Map(governedRows.map((row) => [row.path, normalizeRow(row)]));
  const sources = snapshots.map((snapshot) => {
    const governed = governedByPath.get(snapshot.path);
    if (!governed) {
      throw new Error(`Governed source "${snapshot.path}" is not an already-governed path.`);
    }
    const existing = overrideByPath.get(snapshot.path) || governed;
    const previousContentHash =
      existing.overrideContentHash || governed.overrideContentHash || governed.importedContentHash;
    const expected = command.expectedContentSha256ByPath?.[snapshot.path];
    if (expected && expected !== previousContentHash) {
      throw new Error(
        `Governed source "${snapshot.path}" expected effective content ${expected}, found ${previousContentHash}.`
      );
    }
    const revision = existing.revision === null ? 0 : existing.revision + 1;
    return {
      path: snapshot.path,
      contentHash: snapshot.contentHash,
      stateFingerprint: sha256HexUtf8(
        stableStringify({
          contentHash: snapshot.contentHash,
          governanceHash: governed.governanceHash,
          pathHash: governed.pathHash,
        })
      ),
      sourceCommitSha,
      sourceBlobSha: snapshot.blobSha || null,
      previousContentHash,
      revision,
      updatedBy: command.actor,
    };
  });

  const createdAt = (now instanceof Date ? now : new Date(now)).toISOString();
  return {
    sources,
    audit: {
      operationId,
      idempotencyKey: command.idempotencyKey,
      operationType: command.kind,
      actor: command.actor,
      sourceCommitSha,
      paths: sources.map((source) => source.path),
      changes: sources.map(({ path, previousContentHash, contentHash, revision }) => ({
        path,
        previousContentHash,
        contentHash,
        revision,
      })),
      expectedContentSha256ByPath: command.expectedContentSha256ByPath || {},
      createdAt,
    },
  };
}

async function readExistingOperation(client, idempotencyKey) {
  const result = await client.query(
    `select * from ${schemaName}.governed_source_content_operations where idempotency_key = $1`,
    [idempotencyKey]
  );
  return result.rows[0] || null;
}

async function acquireIdempotencyLock(client, idempotencyKey) {
  await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [idempotencyKey]);
}

function assertIdempotentReplayMatches(existing, command, sourceCommitSha) {
  const paths = existing.paths || [];
  const expected = existing.expected_content_sha256_by_path || {};
  if (
    existing.operation_type !== command.kind ||
    existing.actor !== command.actor ||
    existing.source_commit_sha !== sourceCommitSha ||
    stableStringify(paths) !== stableStringify(command.paths) ||
    stableStringify(expected) !== stableStringify(command.expectedContentSha256ByPath || {})
  ) {
    throw new Error(
      `Idempotency key "${command.idempotencyKey}" belongs to a different governed-source refresh.`
    );
  }
}

async function readGovernedRowsForUpdate(client, paths) {
  const result = await client.query(
    `select
       governed.path,
       governed.path_hash,
       governed.content_hash,
       governed.governance_hash,
       current_content.content_hash as override_content_hash,
       current_content.revision as override_revision
     from ${schemaName}.governance_files governed
     left join ${schemaName}.governed_source_content_overrides current_content
       on current_content.path = governed.path
     where governed.path = any($1::text[])
     order by governed.path
     for update of governed`,
    [paths]
  );
  return result.rows;
}

async function writePlan(client, planned) {
  for (const source of planned.sources) {
    await client.query(
      `insert into ${schemaName}.governed_source_content_overrides
        (path, content_hash, state_fingerprint, source_commit_sha, source_blob_sha,
         revision, updated_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
       on conflict (path) do update set
         content_hash = excluded.content_hash,
         state_fingerprint = excluded.state_fingerprint,
         source_commit_sha = excluded.source_commit_sha,
         source_blob_sha = excluded.source_blob_sha,
         revision = excluded.revision,
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
      [
        source.path,
        source.contentHash,
        source.stateFingerprint,
        source.sourceCommitSha,
        source.sourceBlobSha,
        source.revision,
        source.updatedBy,
        planned.audit.createdAt,
      ]
    );
  }

  await client.query(
    `insert into ${schemaName}.governed_source_content_operations
      (operation_id, idempotency_key, operation_type, actor, source_commit_sha, paths,
       changes, expected_content_sha256_by_path, created_at)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)`,
    [
      planned.audit.operationId,
      planned.audit.idempotencyKey,
      planned.audit.operationType,
      planned.audit.actor,
      planned.audit.sourceCommitSha,
      JSON.stringify(planned.audit.paths),
      JSON.stringify(planned.audit.changes),
      JSON.stringify(planned.audit.expectedContentSha256ByPath),
      planned.audit.createdAt,
    ]
  );
}

async function applyGovernedSourceRefreshOperation(command, options = {}) {
  const snapshot = readGovernedSourceSnapshots({
    paths: command.paths,
    repoRoot: options.repoRoot || repoRoot,
    git: options.git,
    lstat: options.lstat,
    realpath: options.realpath,
  });
  const effectiveCommand = command.idempotencyKey
    ? command
    : {
        ...command,
        idempotencyKey: defaultGovernedSourceRefreshIdempotencyKey(command, snapshot),
      };
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;
  if (ownsClient) await client.connect();

  try {
    await assertPlanningDbCurrentSchemaReady(client);
    await client.query('begin');
    await acquireIdempotencyLock(client, effectiveCommand.idempotencyKey);
    const existing = await readExistingOperation(client, effectiveCommand.idempotencyKey);
    if (existing) {
      assertIdempotentReplayMatches(existing, effectiveCommand, snapshot.sourceCommitSha);
      await client.query('commit');
      return { idempotent: true, audit: existing };
    }

    const governedRows = await readGovernedRowsForUpdate(client, effectiveCommand.paths);
    const planned = planGovernedSourceRefreshOperation({
      command: effectiveCommand,
      sourceCommitSha: snapshot.sourceCommitSha,
      snapshots: snapshot.sources,
      governedRows,
      existingOverrides: governedRows,
      operationId: options.operationId || randomUuidV4(),
      now: options.now || new Date(),
    });
    await writePlan(client, planned);
    await client.query('commit');
    return { idempotent: false, ...planned };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) await client.end();
  }
}

module.exports = {
  applyGovernedSourceRefreshOperation,
  assertIdempotentReplayMatches,
  canonicalSourceContentHash,
  defaultGovernedSourceRefreshIdempotencyKey,
  normalizeGovernedSourcePath,
  planGovernedSourceRefreshOperation,
  readGovernedRowsForUpdate,
  readGovernedSourceSnapshots,
  writePlan,
};
