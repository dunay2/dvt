/** Owned concern: join canonical source responsibilities with current DB ownership and Git evidence. */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { defaultPgUrl } = require('../planning-db-run.cjs');
const { FeatureMechanizationGitDiffReader } = require('./feature-mechanization-git-diff.cjs');
const {
  readFeatureMechanizationManifestRowsFromDb,
} = require('./feature-mechanization-db-reader.cjs');
const {
  createCurrentComponentFilesReadModelComponent,
} = require('../planning-db/queries/current-component-files-query.cjs');
const {
  validateResponsibilityBindings,
  validateSourceResponsibilityReferences,
} = require('./component-source-responsibilities.cjs');

function readCandidateSource(reader, sourcePath, currentPaths) {
  if (!currentPaths.has(sourcePath)) {
    throw new Error(`SOURCE-RESPONSIBILITY: Missing selected Git path ${sourcePath}.`);
  }
  return reader.includeWorktree
    ? fs.readFileSync(path.join(reader.repoRootPath, sourcePath), 'utf8')
    : reader.runGit(['show', `${reader.resolveComparison().headSha}:${sourcePath}`]);
}

function readRawResponsibilityBindings(rows, reader, currentPaths) {
  const bindings = [];
  const errors = [];
  for (const row of rows) {
    const manifest = row.raw_manifest;
    if (
      !manifest ||
      typeof manifest !== 'object' ||
      Array.isArray(manifest) ||
      typeof manifest.featureId !== 'string' ||
      !manifest.featureId.trim() ||
      typeof row.source_path !== 'string' ||
      !row.source_path.trim()
    ) {
      throw new Error('SOURCE-RESPONSIBILITY: Invalid effective feature manifest authority.');
    }
    if (!Object.hasOwn(manifest, 'responsibilityBindings')) continue;
    const validation = validateResponsibilityBindings(manifest.responsibilityBindings);
    errors.push(...validation.errors.map((error) => `${row.source_path}: ${error}`));
    if (!/^https?:\/\//u.test(row.source_path)) {
      const content = readCandidateSource(reader, row.source_path, currentPaths);
      const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
      if (hash !== row.source_content_sha256) {
        throw new Error(
          `SOURCE-RESPONSIBILITY: Authority is stale for ${row.source_path}; record the selected source before validation.`
        );
      }
    }
    bindings.push(...validation.bindings);
  }
  const combined = validateResponsibilityBindings(bindings);
  return { bindings: combined.bindings, errors: [...errors, ...combined.errors] };
}

async function readSourceResponsibilitySnapshot(client, reader) {
  reader.resolveComparison();
  const { files: ownership } = await createCurrentComponentFilesReadModelComponent({
    gitReader: reader,
  }).readCurrentComponentFiles(client);
  const currentPaths = new Set(ownership.map((entry) => entry.path));
  const rows = await readFeatureMechanizationManifestRowsFromDb({ client });
  const { bindings, errors } = readRawResponsibilityBindings(rows, reader, currentPaths);
  const boundPaths = new Set(bindings.map((binding) => binding.path));
  if (errors.length > 0 || bindings.length === 0) return { files: [], errors };
  const ids = [...new Set(bindings.map((binding) => binding.responsibilityId))].sort();
  const result = await client.query(
    `
    select responsibility_id, component_id, responsibility, status
    from architecture.component_responsibility_query
    where responsibility_id = any($1::text[])
    order by responsibility_id
  `,
    [ids]
  );
  if (!Array.isArray(result.rows))
    throw new Error('SOURCE-RESPONSIBILITY: Invalid responsibility authority response.');
  for (const row of result.rows) {
    if (!row || !['approved', 'implemented'].includes(row.status)) {
      errors.push(
        `Responsibility ${row?.responsibility_id ?? '(missing ID)'} has noncanonical status ${row?.status ?? '(missing status)'}.`
      );
    }
  }
  if (errors.length > 0) return { files: [], errors };
  const responsibilities = result.rows.map((row) => ({
    responsibilityId: row.responsibility_id,
    componentId: row.component_id,
    description: row.responsibility,
  }));
  const files = [];
  for (const sourcePath of [...boundPaths].sort()) {
    if (!currentPaths.has(sourcePath)) {
      errors.push(
        `${sourcePath}: Mandatory responsibility source is missing from the selected Git candidate.`
      );
      continue;
    }
    const owner = ownership.find((entry) => entry.path === sourcePath);
    if (!owner || ['UNOWNED', 'AMBIGUOUS'].includes(owner.component_unit)) {
      errors.push(`${sourcePath}: Missing or ambiguous current component ownership.`);
      continue;
    }
    const content = readCandidateSource(reader, sourcePath, currentPaths);
    const validation = validateSourceResponsibilityReferences({
      path: sourcePath,
      content,
      bindings: bindings.filter((binding) => binding.path === sourcePath),
      ownerComponentId: owner.component_unit,
      responsibilities,
      currentPaths,
    });
    errors.push(...validation.errors.map((error) => `${sourcePath}: ${error}`));
    if (validation.errors.length === 0) files.push({ path: sourcePath, content });
  }
  return { files, errors };
}

async function readComponentSourceResponsibilities(options = {}) {
  const reader = options.gitReader || new FeatureMechanizationGitDiffReader(options);
  reader.resolveComparison();
  const Client = options.deps?.Client || require('pg').Client;
  const client =
    options.client ||
    new Client({
      connectionString:
        options.databaseUrl ||
        process.env.DVT_PLANNING_DB_URL ||
        process.env.PLANNING_DATABASE_URL ||
        process.env.DATABASE_URL ||
        defaultPgUrl,
    });
  try {
    if (!options.client) await client.connect();
    return await readSourceResponsibilitySnapshot(client, reader);
  } finally {
    if (!options.client) await client.end();
  }
}

async function validateComponentSourceResponsibilities(options = {}) {
  const { files, errors } = await readComponentSourceResponsibilities(options);
  return { errors, fileCount: files.length };
}

module.exports = { readComponentSourceResponsibilities, validateComponentSourceResponsibilities };
