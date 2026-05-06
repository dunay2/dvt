const { Client } = require('pg');

const { buildGovernanceFileSnapshot, databaseUrl } = require('./planning-db-import.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');
const { compareRows, formatDriftReport } = require('./planning-db-check.cjs');

function buildGovernanceExpectedState(snapshot = buildGovernanceFileSnapshot()) {
  return {
    sources: (snapshot.sources || []).map((source) => ({
      sourcePath: source.sourcePath,
      sourceType: source.sourceType,
      contentSha256: source.contentSha256,
      sourceBytes: source.sourceBytes,
    })),
    files: (snapshot.files || []).map((file) => ({
      path: file.path,
      fileId: file.fileId,
      shardId: file.shardId,
      contentHash: file.contentHash,
      governanceHash: file.governanceHash,
      stateFingerprint: file.stateFingerprint,
      owningUnit: file.owningUnit,
      componentUnit: file.componentUnit,
      isDrift: file.isDrift,
      isLegacy: file.isLegacy,
      sourcePath: file.sourcePath,
      sourceContentSha256: file.sourceContentSha256,
    })),
    components: (snapshot.components || []).map((component) => ({
      componentId: component.componentId,
      sourcePath: component.sourcePath,
      governanceState: component.governanceState,
      isDrift: component.isDrift,
      isLegacy: component.isLegacy,
      fileCount: component.fileCount,
      sourceContentSha256: component.sourceContentSha256,
    })),
    componentFiles: (snapshot.componentFiles || []).map((file) => ({
      componentId: file.componentId,
      path: file.path,
      fileId: file.fileId,
      owningUnit: file.owningUnit,
      governanceState: file.governanceState,
      isDrift: file.isDrift,
      isLegacy: file.isLegacy,
      sourcePath: file.sourcePath,
      sourceContentSha256: file.sourceContentSha256,
    })),
    fingerprints: (snapshot.fingerprints || []).map((fingerprint) => ({
      path: fingerprint.path,
      fileId: fingerprint.fileId,
      contentHash: fingerprint.contentHash,
      governanceHash: fingerprint.governanceHash,
      stateFingerprint: fingerprint.stateFingerprint,
      owningUnit: fingerprint.owningUnit,
      sourcePath: fingerprint.sourcePath,
      sourceContentSha256: fingerprint.sourceContentSha256,
    })),
    coverageRows: (snapshot.coverageRows || []).map((row) => ({
      coverageId: row.coverageId,
      coverageKind: row.coverageKind,
      name: row.name,
      countValue: row.countValue,
      fileCount: row.fileCount,
      componentId: row.componentId,
      sourcePath: row.sourcePath,
      sourceContentSha256: row.sourceContentSha256,
    })),
    remediationTasks: (snapshot.remediationTasks || []).map((task) => ({
      taskId: task.taskId,
      priority: task.priority,
      componentUnit: task.componentUnit,
      fileCount: task.fileCount,
      documentCount: task.documentCount,
      sourcePath: task.sourcePath,
      sourceContentSha256: task.sourceContentSha256,
    })),
  };
}

function compareGovernanceDatabaseState(expected, actual) {
  const sections = {
    sources: compareRows(expected.sources, actual.sources, {
      keyOf: (row) => row.sourcePath,
      compareFields: ['sourceType', 'contentSha256', 'sourceBytes'],
    }),
    files: compareRows(expected.files, actual.files, {
      keyOf: (row) => row.path,
      compareFields: [
        'fileId',
        'shardId',
        'contentHash',
        'governanceHash',
        'stateFingerprint',
        'owningUnit',
        'componentUnit',
        'isDrift',
        'isLegacy',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
    components: compareRows(expected.components, actual.components, {
      keyOf: (row) => row.componentId,
      compareFields: [
        'sourcePath',
        'governanceState',
        'isDrift',
        'isLegacy',
        'fileCount',
        'sourceContentSha256',
      ],
    }),
    componentFiles: compareRows(expected.componentFiles, actual.componentFiles, {
      keyOf: (row) => `${row.componentId}::${row.path}`,
      compareFields: [
        'fileId',
        'owningUnit',
        'governanceState',
        'isDrift',
        'isLegacy',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
    fingerprints: compareRows(expected.fingerprints, actual.fingerprints, {
      keyOf: (row) => row.path,
      compareFields: [
        'fileId',
        'contentHash',
        'governanceHash',
        'stateFingerprint',
        'owningUnit',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
    coverageRows: compareRows(expected.coverageRows, actual.coverageRows, {
      keyOf: (row) => row.coverageId,
      compareFields: [
        'coverageKind',
        'name',
        'countValue',
        'fileCount',
        'componentId',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
    remediationTasks: compareRows(expected.remediationTasks, actual.remediationTasks, {
      keyOf: (row) => row.taskId,
      compareFields: [
        'priority',
        'componentUnit',
        'fileCount',
        'documentCount',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
  };
  const ok = Object.values(sections).every(
    (section) =>
      section.missing.length === 0 && section.unexpected.length === 0 && section.stale.length === 0
  );

  return { ok, sections };
}

async function readGovernanceDatabaseState(client) {
  const [sources, files, components, componentFiles, fingerprints, coverageRows, remediationTasks] =
    await Promise.all([
      client.query(`
      select
        source_path as "sourcePath",
        source_type as "sourceType",
        content_sha256 as "contentSha256",
        source_bytes::int as "sourceBytes"
      from ${schemaName}.governance_sources
      order by source_path
    `),
      client.query(`
      select
        path,
        file_id as "fileId",
        shard_id as "shardId",
        content_hash as "contentHash",
        governance_hash as "governanceHash",
        state_fingerprint as "stateFingerprint",
        owning_unit as "owningUnit",
        component_unit as "componentUnit",
        is_drift as "isDrift",
        is_legacy as "isLegacy",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.governance_files
      order by path
    `),
      client.query(`
      select
        component_id as "componentId",
        source_path as "sourcePath",
        governance_state as "governanceState",
        is_drift as "isDrift",
        is_legacy as "isLegacy",
        file_count::int as "fileCount",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.governance_components
      order by component_id
    `),
      client.query(`
      select
        component_id as "componentId",
        path,
        file_id as "fileId",
        owning_unit as "owningUnit",
        governance_state as "governanceState",
        is_drift as "isDrift",
        is_legacy as "isLegacy",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.governance_component_files
      order by component_id, path
    `),
      client.query(`
      select
        path,
        file_id as "fileId",
        content_hash as "contentHash",
        governance_hash as "governanceHash",
        state_fingerprint as "stateFingerprint",
        owning_unit as "owningUnit",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.governance_fingerprints
      order by path
    `),
      client.query(`
      select
        coverage_id as "coverageId",
        coverage_kind as "coverageKind",
        name,
        count_value::int as "countValue",
        file_count::int as "fileCount",
        component_id as "componentId",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.governance_coverage
      order by coverage_id
    `),
      client.query(`
      select
        task_id as "taskId",
        priority,
        component_unit as "componentUnit",
        file_count::int as "fileCount",
        document_count::int as "documentCount",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.governance_remediation
      order by task_id
    `),
    ]);

  return {
    sources: sources.rows,
    files: files.rows,
    components: components.rows,
    componentFiles: componentFiles.rows,
    fingerprints: fingerprints.rows,
    coverageRows: coverageRows.rows,
    remediationTasks: remediationTasks.rows,
  };
}

async function checkGovernanceDatabase(options = {}) {
  const expected = buildGovernanceExpectedState(options.snapshot);
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const actual = await readGovernanceDatabaseState(client);
    return compareGovernanceDatabaseState(expected, actual);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function main() {
  const report = await checkGovernanceDatabase();

  if (!report.ok) {
    console.error(formatDriftReport('governance:db:check', report));
    process.exit(1);
  }

  console.log(formatDriftReport('governance:db:check', report));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[governance:db:check] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildGovernanceExpectedState,
  checkGovernanceDatabase,
  compareGovernanceDatabaseState,
  formatDriftReport,
  readGovernanceDatabaseState,
};
