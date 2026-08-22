/** Owned concern: project Git-owned governance into the Planning DB query store. */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { sha256Hex, sha256HexUtf8 } = require('@dvt/crypto');
const { Client } = require('pg');
const yaml = require('js-yaml');

const { governanceGeneratedPath } = require('./governance-generated-paths.cjs');
const {
  buildFingerprintBaseline,
  expandFingerprintBaseline,
} = require('./check-governance-file-fingerprint-baseline.cjs');
const {
  buildOutputs: buildDocumentUnitOutputs,
} = require('./generate-governance-document-unit-map.cjs');
const {
  buildOutputs: buildGovernanceFileComponentOutputs,
} = require('./generate-governance-file-component-index.cjs');
const { buildCoverageReport } = require('./generate-governance-coverage-report.cjs');
const { buildRemediationQueue } = require('./generate-governance-remediation-queue.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');
const { assertPlanningDbCurrentSchemaReady, schemaName } = require('./planning-db-schema.cjs');
const { assertCurrentStateValue } = require('./planning-db-current-schema-policy.cjs');
const {
  buildKnowledgeSnapshotFromDocuments,
} = require('../tools/planning-db/knowledge/documentSnapshot.cjs');
const { buildCommandQueryRailSnapshot } = require('./planning-db/command-query-rail-catalog.cjs');
const {
  buildFrontendMechanicalTruthSnapshot,
} = require('./planning-db/frontend-mechanical-truth-inventory.cjs');
const {
  buildFrontendComponentReflectionSnapshot,
} = require('./planning-db/frontend-component-inventory.cjs');
const { buildCodeSymbolSnapshot } = require('./planning-db/code-symbol-inventory.cjs');

const repoRoot = path.resolve(__dirname, '..');
const dbGovernanceSurfaceCatalogPath = path.join(
  repoRoot,
  'tools',
  'planning-db',
  'state',
  'db-governance-surfaces.json'
);
const dbtProjectRoundtripCapabilityCatalogPath = path.join(
  repoRoot,
  'tools',
  'planning-db',
  'state',
  'dbt-project-roundtrip-capabilities.json'
);

const governanceFileIndexPath = governanceGeneratedPath('system-governance-file-index.files.yaml');
const governanceComponentIndexPath = governanceGeneratedPath(
  'system-governance-component-index.components.yaml'
);
const governanceComponentFileMapPath = governanceGeneratedPath(
  'system-governance-component-file-map.components.yaml'
);
const governanceFingerprintBaselinePath = governanceGeneratedPath(
  'system-governance-file-fingerprint-baseline.yaml'
);
const governanceCoverageReportPath = governanceGeneratedPath(
  'system-governance-coverage-report.coverage.yaml'
);
const governanceRemediationQueuePath = governanceGeneratedPath(
  'system-governance-remediation-queue.queue.yaml'
);
const governanceImportDeleteTables = [
  'knowledge_intake_repository_references',
  'knowledge_action_links',
  'knowledge_document_links',
  'knowledge_action_items',
  'knowledge_findings',
  'knowledge_proposals',
  'knowledge_document_sections',
  'knowledge_documents',
  'frontend_component_evidence',
  'frontend_component_cq_rails',
  'frontend_component_files',
  'frontend_surface_component_links',
  'frontend_components',
  'frontend_mechanical_truth_surfaces',
  'code_symbols',
  'risk_debt_items',
  'governance_component_files',
  'governance_component_file_shards',
  'governance_fingerprints',
  'governance_components',
  'governance_coverage',
  'governance_remediation',
];

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    databaseUrl: null,
    help: false,
    ifStale: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') {
      continue;
    }

    if (token === '--database-url') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Missing value for --database-url');
      }
      options.databaseUrl = next;
      index += 1;
      continue;
    }

    if (token === '--if-stale') {
      options.ifStale = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown planning DB import option "${token}".`);
  }

  return options;
}

function printHelp() {
  console.log(
    [
      'Usage: pnpm planning:db:import [--if-stale] [--database-url <url>]',
      '',
      '--if-stale  Skip the architecture/governance import when its source state is current.',
    ].join('\n')
  );
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function repoRelative(filePath) {
  return toPosix(path.relative(repoRoot, filePath));
}

function sha256(value) {
  return typeof value === 'string' ? sha256HexUtf8(value) : sha256Hex(value);
}

function readYamlSource(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return {
    absolutePath: filePath,
    sourcePath: repoRelative(filePath),
    raw,
    contentSha256: sha256(raw),
    sourceBytes: Buffer.byteLength(raw, 'utf8'),
    parsed: yaml.load(raw),
    rawSourceText: raw,
  };
}

function renderYamlSourcePayload(payload) {
  return yaml.dump(payload, {
    lineWidth: 100,
    noRefs: true,
    sortKeys: false,
  });
}

function buildGeneratedYamlSource(sourcePath, parsed, options = {}) {
  const absolutePath = path.join(repoRoot, sourcePath);
  const hasExistingGeneratedSource = fs.existsSync(absolutePath);
  const raw = renderYamlSourcePayload(parsed);
  const rawSourceText =
    hasExistingGeneratedSource && options.preserveExistingRawSourceText !== false
      ? fs.readFileSync(absolutePath, 'utf8')
      : raw;
  return {
    absolutePath,
    sourcePath,
    raw,
    contentSha256: sha256(raw),
    sourceBytes: Buffer.byteLength(raw, 'utf8'),
    parsed,
    rawSourceText,
    sourceMode: 'in-memory-generator',
  };
}

function cleanJson(value) {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(cleanJson);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([key, entryValue]) => [key, cleanJson(entryValue)])
    );
  }

  return value;
}

function toJson(value) {
  return JSON.stringify(cleanJson(value));
}

const postgresParameterLimit = 60000;

function normalizeInsertColumn(column) {
  if (typeof column === 'string') {
    return { name: column, cast: null };
  }

  return {
    name: column.name,
    cast: column.cast || null,
  };
}

function insertPlaceholder(parameterIndex, cast) {
  return `$${parameterIndex}${cast ? `::${cast}` : ''}`;
}

async function insertRows(client, tableName, columns, rows, valuesForRow, options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return;
  }

  const normalizedColumns = columns.map(normalizeInsertColumn);
  const parameterLimit = options.parameterLimit || postgresParameterLimit;
  const maxRowsPerBatch = Math.max(1, Math.floor(parameterLimit / normalizedColumns.length));

  for (let start = 0; start < rows.length; start += maxRowsPerBatch) {
    const batchRows = rows.slice(start, start + maxRowsPerBatch);
    const params = [];
    const valueGroups = batchRows.map((row) => {
      const values = valuesForRow(row);
      if (values.length !== normalizedColumns.length) {
        throw new Error(
          `Insert row for ${tableName} returned ${values.length} values for ${normalizedColumns.length} columns.`
        );
      }

      const placeholders = values.map((value, valueIndex) => {
        params.push(value);
        const column = normalizedColumns[valueIndex];
        return insertPlaceholder(params.length, column.cast);
      });

      return `(${placeholders.join(', ')})`;
    });

    await client.query(
      `insert into ${schemaName}.${tableName}
        (${normalizedColumns.map((column) => column.name).join(', ')})
       values ${valueGroups.join(', ')}${options.suffix ? `\n       ${options.suffix}` : ''}`,
      params
    );
  }
}

function normalizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(normalizeText).join('\n');
  }

  if (typeof value === 'object') {
    return JSON.stringify(cleanJson(value));
  }

  return String(value);
}

function normalizeArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value.map(cleanJson) : [cleanJson(value)];
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function addGovernanceSource(sources, source, sourceType, metadata = {}) {
  if (sources.some((entry) => entry.sourcePath === source.sourcePath)) {
    return;
  }

  sources.push({
    sourcePath: source.sourcePath,
    sourceType,
    contentSha256: source.contentSha256,
    sourceBytes: source.sourceBytes,
    metadata,
    rawSource: source.parsed,
    rawSourceText: source.rawSourceText || source.raw,
  });
}

function inMemorySourceMetadata(metadata = {}) {
  return {
    sourceMode: 'in-memory-generator',
    ...metadata,
  };
}

function generatedSourceMetadata(source, metadata = {}) {
  return {
    sourceMode: source.sourceMode || 'in-memory-generator',
    ...metadata,
  };
}

function buildCoverageRows(coverageSource) {
  const report = coverageSource.parsed;
  const rows = [];

  function pushRow({
    coverageId,
    coverageKind,
    name,
    countValue = null,
    fileCount = null,
    componentId = null,
    metadata = {},
    rawCoverage,
  }) {
    rows.push({
      coverageId,
      sourcePath: coverageSource.sourcePath,
      coverageKind,
      name,
      countValue,
      fileCount,
      componentId,
      metadata,
      sourceContentSha256: coverageSource.contentSha256,
      rawCoverage,
    });
  }

  for (const [name, value] of Object.entries(report.totals || {})) {
    pushRow({
      coverageId: `total.${name}`,
      coverageKind: 'total',
      name,
      countValue: normalizeNumber(value),
      rawCoverage: { name, count: value },
    });
  }

  if (report.ciPosture) {
    pushRow({
      coverageId: 'ci_posture',
      coverageKind: 'ci_posture',
      name: normalizeText(report.ciPosture.blockingStatus || 'ci_posture'),
      metadata: report.ciPosture,
      rawCoverage: report.ciPosture,
    });
  }

  const groupedCoverage = [
    ['root_unit', 'byRootUnit'],
    ['domain_unit', 'byDomainUnit'],
    ['component_unit', 'byComponentUnit'],
    ['status', 'byStatus'],
    ['governance_state', 'byGovernanceState'],
    ['canonical_role', 'byCanonicalRole'],
    ['evidence_state', 'byEvidenceState'],
    ['ddd_owner', 'byDddOwner'],
  ];

  for (const [coverageKind, key] of groupedCoverage) {
    for (const item of report[key] || []) {
      const name = normalizeText(item.name);
      pushRow({
        coverageId: `${coverageKind}.${name}`,
        coverageKind,
        name,
        countValue: normalizeNumber(item.count),
        rawCoverage: item,
      });
    }
  }

  for (const document of report.governanceDocuments || []) {
    const documentPath = normalizeText(document.path);
    pushRow({
      coverageId: `governance_document.${sha256(documentPath).slice(0, 16)}`,
      coverageKind: 'governance_document',
      name: documentPath,
      fileCount: normalizeNumber(document.fileCount),
      rawCoverage: document,
    });
  }

  for (const component of report.componentCoverage || []) {
    const componentId = normalizeText(component.id);
    pushRow({
      coverageId: `component.${componentId}`,
      coverageKind: 'component',
      name: componentId,
      countValue: normalizeNumber(component.fileCount),
      fileCount: normalizeNumber(component.fileCount),
      componentId,
      metadata: {
        rootUnit: normalizeText(component.rootUnit),
        domainUnit: normalizeText(component.domainUnit),
        governanceState: normalizeText(component.governanceState),
        evidenceState: normalizeText(component.evidenceState),
        childrenRequired: Boolean(component.childrenRequired),
      },
      rawCoverage: component,
    });
  }

  if (Array.isArray(report.findings)) {
    for (const [index, finding] of report.findings.entries()) {
      pushRow({
        coverageId: `finding.${index + 1}`,
        coverageKind: 'finding',
        name: normalizeText(finding.id || finding.type || `finding-${index + 1}`),
        metadata: finding,
        rawCoverage: finding,
      });
    }
  } else if (report.findings && typeof report.findings === 'object') {
    for (const [findingKind, findings] of Object.entries(report.findings)) {
      const rows = Array.isArray(findings) ? findings : [findings];
      for (const [index, finding] of rows.entries()) {
        pushRow({
          coverageId: `finding.${findingKind}.${index + 1}`,
          coverageKind: `finding_${findingKind}`,
          name: normalizeText(finding.path || finding.id || `${findingKind}-${index + 1}`),
          metadata: { findingKind },
          rawCoverage: finding,
        });
      }
    }
  }

  return rows;
}

function buildGovernanceGeneratedInputs(options = {}) {
  const fileComponentOutputs =
    options.fileComponentOutputs || buildGovernanceFileComponentOutputs();
  const documentOutputs = options.documentOutputs || buildDocumentUnitOutputs();
  const index = fileComponentOutputs.fileIndexManifest;
  const componentIndex = fileComponentOutputs.componentIndexManifest;
  const componentFileMap = fileComponentOutputs.componentFileMapManifest;
  const fingerprintBaseline = buildFingerprintBaseline(fileComponentOutputs.fileEntries);
  const coverageReport = buildCoverageReport(
    { files: fileComponentOutputs.fileEntries },
    componentIndex
  );
  const remediationQueue = buildRemediationQueue({
    coverageReport,
    fileIndex: { files: fileComponentOutputs.fileEntries },
    componentIndex,
    componentFileMap,
    documentMap: documentOutputs.documentMap,
  });

  return {
    indexSource: buildGeneratedYamlSource(repoRelative(governanceFileIndexPath), index),
    componentIndexSource: buildGeneratedYamlSource(
      repoRelative(governanceComponentIndexPath),
      componentIndex
    ),
    componentFileMapSource: buildGeneratedYamlSource(
      repoRelative(governanceComponentFileMapPath),
      componentFileMap
    ),
    fingerprintBaselineSource: buildGeneratedYamlSource(
      repoRelative(governanceFingerprintBaselinePath),
      fingerprintBaseline.manifest
    ),
    fingerprintBaselineShardPayloads: fingerprintBaseline.shards,
    coverageReportSource: buildGeneratedYamlSource(
      repoRelative(governanceCoverageReportPath),
      coverageReport,
      { preserveExistingRawSourceText: false }
    ),
    remediationQueueSource: buildGeneratedYamlSource(
      repoRelative(governanceRemediationQueuePath),
      remediationQueue,
      { preserveExistingRawSourceText: false }
    ),
    fileComponentOutputs,
    documentOutputs,
    fileShardSources: new Map(
      Object.entries(fileComponentOutputs.fileIndexShardPayloads).map(([sourcePath, payload]) => [
        sourcePath,
        buildGeneratedYamlSource(sourcePath, payload),
      ])
    ),
    componentShardSources: new Map(
      Object.entries(fileComponentOutputs.componentFileMapShardPayloads).map(
        ([sourcePath, payload]) => [sourcePath, buildGeneratedYamlSource(sourcePath, payload)]
      )
    ),
  };
}

function buildGovernanceFileSnapshot(options = {}) {
  const generatedInputs = options.generatedInputs || buildGovernanceGeneratedInputs();
  const indexSource = generatedInputs.indexSource;
  const index = indexSource.parsed;
  const componentIndexSource = generatedInputs.componentIndexSource;
  const componentIndex = componentIndexSource.parsed;
  const componentFileMapSource = generatedInputs.componentFileMapSource;
  const componentFileMap = componentFileMapSource.parsed;
  const fingerprintBaselineSource = generatedInputs.fingerprintBaselineSource;
  const fingerprintBaseline = fingerprintBaselineSource.parsed;
  const coverageReportSource = generatedInputs.coverageReportSource;
  const coverageReport = coverageReportSource.parsed;
  const remediationQueueSource = generatedInputs.remediationQueueSource;
  const remediationQueue = remediationQueueSource.parsed;

  const sources = [];
  const fileShards = [];
  const files = [];
  const components = [];
  const componentFileShards = [];
  const componentFiles = [];
  const fingerprints = [];

  addGovernanceSource(
    sources,
    indexSource,
    'governance_file_index',
    inMemorySourceMetadata({
      fileCount: index.fileCount,
      shardCount: Array.isArray(index.shards) ? index.shards.length : 0,
    })
  );
  addGovernanceSource(
    sources,
    componentIndexSource,
    'governance_component_index',
    inMemorySourceMetadata({
      componentCount: componentIndex.componentCount,
    })
  );
  addGovernanceSource(
    sources,
    componentFileMapSource,
    'governance_component_file_map',
    inMemorySourceMetadata({
      componentCount: componentFileMap.componentCount,
      fileCount: componentFileMap.fileCount,
    })
  );
  addGovernanceSource(
    sources,
    fingerprintBaselineSource,
    'governance_fingerprint_baseline',
    inMemorySourceMetadata({
      fileCount: fingerprintBaseline.fileCount,
    })
  );
  addGovernanceSource(
    sources,
    coverageReportSource,
    'governance_coverage_report',
    generatedSourceMetadata(coverageReportSource, {
      totals: coverageReport.totals || {},
    })
  );
  addGovernanceSource(
    sources,
    remediationQueueSource,
    'governance_remediation_queue',
    generatedSourceMetadata(remediationQueueSource, {
      totals: remediationQueue.totals || {},
    })
  );

  for (const shard of index.shards || []) {
    const shardSource = generatedInputs.fileShardSources.get(shard.path);
    if (!shardSource) {
      throw new Error(`Missing in-memory governance file shard ${shard.path}`);
    }
    const shardDoc = shardSource.parsed;

    addGovernanceSource(
      sources,
      shardSource,
      'governance_file_shard',
      inMemorySourceMetadata({
        shardId: shardDoc.shardId,
        fileCount: shardDoc.fileCount,
      })
    );

    fileShards.push({
      shardId: normalizeText(shardDoc.shardId),
      sourcePath: shardSource.sourcePath,
      fileCount: normalizeNumber(shardDoc.fileCount) ?? 0,
      contentHash: normalizeText(shard.contentHash),
      sourceContentSha256: shardSource.contentSha256,
      rawShard: shardDoc,
    });

    for (const file of shardDoc.files || []) {
      files.push({
        path: normalizeText(file.path),
        fileId: normalizeText(file.fileId),
        shardId: normalizeText(shardDoc.shardId),
        sourcePath: shardSource.sourcePath,
        pathHash: normalizeText(file.pathHash),
        contentHash: normalizeText(file.contentHash),
        governanceHash: normalizeText(file.governanceHash),
        stateFingerprint: normalizeText(file.stateFingerprint),
        owningUnit: normalizeText(file.owningUnit),
        rootUnit: normalizeText(file.rootUnit),
        domainUnit: normalizeText(file.domainUnit),
        componentUnit: normalizeText(file.componentUnit),
        ownerLevel: normalizeText(file.ownerLevel),
        unitStatus: normalizeText(file.unitStatus),
        governanceState: normalizeText(file.governanceState),
        canonicalRole: normalizeText(file.canonicalRole),
        evidenceState: normalizeText(file.evidenceState),
        isDrift: Boolean(file.isDrift),
        isLegacy: Boolean(file.isLegacy),
        dddOwner: normalizeText(file.dddOwner),
        cqRails: normalizeText(file.cqRails),
        governanceRefs: normalizeArray(file.governance),
        sourceContentSha256: shardSource.contentSha256,
        rawFile: file,
      });
    }
  }

  for (const component of componentIndex.components || []) {
    components.push({
      componentId: normalizeText(component.id),
      sourcePath: componentIndexSource.sourcePath,
      name: normalizeText(component.name),
      level: normalizeText(component.level),
      parentId: component.parent === undefined ? null : normalizeText(component.parent),
      rootUnit: normalizeText(component.rootUnit),
      domainUnit: normalizeText(component.domainUnit),
      unitPath: normalizeArray(component.unitPath),
      status: normalizeText(component.status),
      governanceState: normalizeText(component.governanceState),
      canonicalRole: normalizeText(component.canonicalRole),
      evidenceState: normalizeText(component.evidenceState),
      isDrift: Boolean(component.isDrift),
      isLegacy: Boolean(component.isLegacy),
      childrenRequired: Boolean(component.childrenRequired),
      fileCount: normalizeNumber(component.fileCount) ?? 0,
      dddOwner: normalizeText(component.dddOwner),
      cqRails: normalizeText(component.cqRails),
      owns: normalizeArray(component.owns),
      excludes: normalizeArray(component.excludes),
      governanceRefs: normalizeArray(component.governance),
      fowlerSignals: normalizeArray(component.fowlerSignals),
      sourceContentSha256: componentIndexSource.contentSha256,
      rawComponent: component,
    });
  }

  for (const componentShard of componentFileMap.components || []) {
    const shardSource = generatedInputs.componentShardSources.get(componentShard.path);
    if (!shardSource) {
      throw new Error(`Missing in-memory governance component shard ${componentShard.path}`);
    }
    const shardDoc = shardSource.parsed;
    const componentId = normalizeText(componentShard.id || shardDoc.componentUnit);

    addGovernanceSource(
      sources,
      shardSource,
      'governance_component_shard',
      inMemorySourceMetadata({
        componentId,
        fileCount: shardDoc.fileCount,
        driftFileCount: shardDoc.driftFileCount,
        legacyFileCount: shardDoc.legacyFileCount,
      })
    );

    componentFileShards.push({
      componentId,
      sourcePath: shardSource.sourcePath,
      fileCount: normalizeNumber(shardDoc.fileCount) ?? 0,
      driftFileCount: normalizeNumber(shardDoc.driftFileCount) ?? 0,
      legacyFileCount: normalizeNumber(shardDoc.legacyFileCount) ?? 0,
      contentHash: normalizeText(componentShard.contentHash),
      sourceContentSha256: shardSource.contentSha256,
      rawShard: shardDoc,
    });

    for (const file of shardDoc.files || []) {
      componentFiles.push({
        componentId,
        path: normalizeText(file.path),
        fileId: normalizeText(file.fileId),
        owningUnit: normalizeText(file.owningUnit),
        unitStatus: normalizeText(file.unitStatus),
        governanceState: normalizeText(file.governanceState),
        isDrift: Boolean(file.isDrift),
        isLegacy: Boolean(file.isLegacy),
        sourcePath: shardSource.sourcePath,
        sourceContentSha256: shardSource.contentSha256,
        rawComponentFile: file,
      });
    }
  }

  for (const fingerprint of expandFingerprintBaseline({
    manifest: fingerprintBaseline,
    shards: generatedInputs.fingerprintBaselineShardPayloads,
  })) {
    fingerprints.push({
      path: normalizeText(fingerprint.path),
      fileId: normalizeText(fingerprint.fileId),
      sourcePath: fingerprintBaselineSource.sourcePath,
      contentHash: normalizeText(fingerprint.contentHash),
      governanceHash: normalizeText(fingerprint.governanceHash),
      stateFingerprint: normalizeText(fingerprint.stateFingerprint),
      rootUnit: normalizeText(fingerprint.rootUnit),
      domainUnit: normalizeText(fingerprint.domainUnit),
      componentUnit: normalizeText(fingerprint.componentUnit),
      owningUnit: normalizeText(fingerprint.owningUnit),
      sourceContentSha256: fingerprintBaselineSource.contentSha256,
      rawFingerprint: fingerprint,
    });
  }

  const coverageRows = buildCoverageRows(coverageReportSource);
  const remediationTasks = (remediationQueue.tasks || []).map((task) => ({
    taskId: normalizeText(task.id),
    sourcePath: remediationQueueSource.sourcePath,
    taskType: normalizeText(task.type),
    priority: normalizeText(task.priority),
    componentUnit: normalizeText(task.componentUnit),
    componentFileMap:
      task.componentFileMap === undefined ? null : normalizeText(task.componentFileMap),
    rootUnit: normalizeText(task.rootUnit),
    domainUnit: normalizeText(task.domainUnit),
    dddOwner: normalizeText(task.dddOwner),
    cqRails: normalizeText(task.cqRails),
    blocking: normalizeText(task.blocking),
    reason: normalizeText(task.reason),
    fileCount: normalizeNumber(task.fileCount) ?? 0,
    documentCount: normalizeNumber(task.documentCount) ?? 0,
    files: normalizeArray(task.files),
    documents: normalizeArray(task.documents),
    expectedValidation: normalizeArray(task.expectedValidation),
    sourceContentSha256: remediationQueueSource.contentSha256,
    rawTask: task,
  }));
  const riskDebtSnapshotOptions = { governanceFiles: files };
  if (options.riskDocuments !== undefined) {
    riskDebtSnapshotOptions.riskDocuments = options.riskDocuments;
  }
  const { riskDebtItems } = buildRiskDebtSnapshot(riskDebtSnapshotOptions);

  return {
    index,
    componentIndex,
    componentFileMap,
    fingerprintBaseline,
    coverageReport,
    remediationQueue,
    sources,
    fileShards,
    files,
    components,
    componentFileShards,
    componentFiles,
    fingerprints,
    coverageRows,
    remediationTasks,
    riskDebtItems,
  };
}

async function loadRepositoryCommandCatalogModule() {
  return import(
    pathToFileURL(path.join(repoRoot, 'tools', 'ci', 'repository-command-catalog.mjs')).href
  );
}

async function buildRepositoryCommandSnapshot() {
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonRaw);
  const packageJsonHash = sha256(packageJsonRaw);
  const catalogModule = await loadRepositoryCommandCatalogModule();
  const catalog = catalogModule.buildRepositoryCommandCatalog(
    packageJson,
    catalogModule.discoverRepositoryCommandFiles(repoRoot)
  );
  const commands = [];

  for (const script of catalog.packageScripts) {
    commands.push({
      commandId: `package:${script.name}`,
      commandType: 'package_script',
      commandName: script.name,
      commandPath: null,
      commandText: normalizeText(script.command),
      domain: normalizeText(script.classification.domain),
      sensitivity: normalizeText(script.classification.sensitivity),
      runtimeFanout: Boolean(script.classification.runtimeFanout),
      changedFileValidationRelevant: Boolean(script.classification.changedFileValidationRelevant),
      referencedFiles: normalizeArray(script.referencedFiles).map(normalizeText),
      sourcePath: 'package.json',
      sourceContentSha256: packageJsonHash,
      rawCommand: script,
    });
  }

  for (const fileCommand of catalog.fileCommands) {
    const sourcePath = normalizeText(fileCommand.path);
    const fileRaw = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
    commands.push({
      commandId: `file:${sourcePath}`,
      commandType: 'command_file',
      commandName: null,
      commandPath: sourcePath,
      commandText: null,
      domain: normalizeText(fileCommand.classification.domain),
      sensitivity: normalizeText(fileCommand.classification.sensitivity),
      runtimeFanout: Boolean(fileCommand.classification.runtimeFanout),
      changedFileValidationRelevant: Boolean(
        fileCommand.classification.changedFileValidationRelevant
      ),
      referencedFiles: [],
      sourcePath,
      sourceContentSha256: sha256(fileRaw),
      rawCommand: fileCommand,
    });
  }

  return {
    sourcePath: 'tools/ci/repository-command-catalog.mjs',
    commands,
  };
}

function resolveRepoPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
}

function gitErrorText(error) {
  const parts = [error?.message, error?.stderr?.toString?.(), error?.stdout?.toString?.()];
  return parts.filter(Boolean).join('\n');
}

function isNoMergeBaseError(error) {
  return /\bno merge base\b/u.test(gitErrorText(error));
}

function defaultRunGitDiff(args) {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function listChangedFiles(baseRef, headRef, runGitDiff = defaultRunGitDiff) {
  const commonArgs = ['diff', '--name-only'];
  let output;

  try {
    output = runGitDiff([...commonArgs, `${baseRef}...${headRef}`]);
  } catch (error) {
    if (!isNoMergeBaseError(error)) {
      throw error;
    }

    console.error(
      `[planning:db:import] No merge base for ${baseRef}...${headRef}; using direct tree diff.`
    );
    output = runGitDiff([...commonArgs, baseRef, headRef]);
  }

  return output
    .split('\n')
    .map((value) => normalizeText(value).trim())
    .filter(Boolean)
    .map(toPosix);
}

function readTrackedDocumentPaths(gitPathspecs, options = {}) {
  const runGit = options.execFileSync || execFileSync;
  const fileExists =
    options.fileExists ||
    ((sourcePath) => fs.existsSync(path.join(repoRoot, ...sourcePath.split('/'))));
  const output = runGit('git', ['ls-files', '--', ...gitPathspecs], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return [
    ...new Set(
      output
        .split('\n')
        .map((value) => normalizeText(value).trim())
        .filter(Boolean)
        .map(toPosix)
        .filter(fileExists)
    ),
  ].sort();
}

function readTrackedDocuments(gitPathspecs) {
  return readTrackedDocumentPaths(gitPathspecs).map((sourcePath) => {
    const raw = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
    return { sourcePath, raw, contentSha256: sha256(raw) };
  });
}

function listTrackedMarkdownDocuments() {
  return readTrackedDocuments(['docs/*.md', 'docs/**/*.md']);
}

function listTrackedBuzonDocuments() {
  return readTrackedDocuments(['buzon/*.md']);
}

function listTrackedKnowledgeDocuments(options = {}) {
  const markdownDocuments = options.markdownDocuments || listTrackedMarkdownDocuments();
  return [...markdownDocuments, ...listTrackedBuzonDocuments()].sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath)
  );
}

const repositoryReferenceTextFilePattern =
  /\.(?:cjs|css|cts|html|js|json|jsonc|jsx|md|mdx|mjs|mts|ps1|scss|sh|sql|ts|tsx|txt|ya?ml)$/i;
const buzonReferencePattern = /(?:^|[^\w./-])(buzon\/[^\s'"`<>()\x5b\x5d{}]+?\.md)\b/giu;

function readTrackedRepositoryTextDocuments() {
  return readTrackedDocumentPaths(['*', '.*', '**/*', '.github/**/*'])
    .filter((sourcePath) => repositoryReferenceTextFilePattern.test(sourcePath))
    .map((sourcePath) => {
      const raw = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
      return { sourcePath, raw, contentSha256: sha256(raw) };
    });
}

function buildKnowledgeIntakeRepositoryReferenceSnapshot(options = {}) {
  const documents = normalizeArray(options.documents).length
    ? normalizeArray(options.documents)
    : readTrackedRepositoryTextDocuments();
  const intakeDocumentPaths = new Set(
    normalizeArray(options.intakeDocumentPaths).length
      ? normalizeArray(options.intakeDocumentPaths).map((sourcePath) =>
          toPosix(normalizeText(sourcePath))
        )
      : readTrackedDocumentPaths(['buzon/*.md'])
  );
  const references = [];

  for (const document of documents) {
    const sourcePath = toPosix(normalizeText(document.sourcePath));
    if (!sourcePath || /^buzon\/.*\.md$/i.test(sourcePath)) {
      continue;
    }

    const raw = normalizeText(document.raw);
    const sourceContentSha256 = normalizeText(document.contentSha256) || sha256(raw);
    for (const [lineIndex, line] of raw.split(/\r?\n/).entries()) {
      buzonReferencePattern.lastIndex = 0;
      const matches = [...line.matchAll(buzonReferencePattern)];
      for (const [matchIndex, match] of matches.entries()) {
        const targetDocumentPath = toPosix(normalizeText(match[1]));
        if (!intakeDocumentPaths.has(targetDocumentPath)) {
          continue;
        }

        const lineNumber = lineIndex + 1;
        const sampleText = line.trim().slice(0, 240);
        const referenceIdentity = [
          sourcePath,
          lineNumber,
          match.index ?? matchIndex,
          targetDocumentPath,
        ].join('\0');
        references.push({
          referenceId: sha256(referenceIdentity),
          targetDocumentPath,
          sourcePath,
          relationType: 'repository_path_reference',
          lineNumber,
          sampleText,
          sourceContentSha256,
          rawReference: {
            matchText: targetDocumentPath,
            matchIndex: match.index ?? null,
          },
        });
      }
    }
  }

  references.sort(
    (left, right) =>
      left.targetDocumentPath.localeCompare(right.targetDocumentPath) ||
      left.sourcePath.localeCompare(right.sourcePath) ||
      left.lineNumber - right.lineNumber ||
      left.referenceId.localeCompare(right.referenceId)
  );

  return { references };
}

function isRiskRegisterItemPath(sourcePath) {
  return /^docs\/risk-register\/.+\/[Rr]-[^/]+\.(md|ya?ml)$/i.test(toPosix(sourcePath));
}

function listTrackedRiskDocuments() {
  const output = execFileSync(
    'git',
    [
      'ls-files',
      '--',
      'docs/risk-register/*.md',
      'docs/risk-register/**/*.md',
      'docs/risk-register/*.yaml',
      'docs/risk-register/**/*.yaml',
      'docs/risk-register/*.yml',
      'docs/risk-register/**/*.yml',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    }
  );

  return [
    ...new Set(
      output
        .split('\n')
        .map((value) => normalizeText(value).trim())
        .filter(Boolean)
        .map(toPosix)
        .filter(isRiskRegisterItemPath)
    ),
  ]
    .sort()
    .map((sourcePath) => {
      const raw = fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8');
      return { sourcePath, raw, contentSha256: sha256(raw) };
    });
}

function parseMarkdownFrontmatter(raw) {
  const text = normalizeText(raw).replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') {
    return { frontmatter: {}, body: text };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (closingIndex < 0) {
    return { frontmatter: {}, body: text };
  }

  const frontmatterText = lines.slice(1, closingIndex).join('\n');
  let parsed;
  try {
    parsed = yaml.load(frontmatterText);
  } catch (error) {
    parsed = parseLooseFrontmatter(frontmatterText);
    parsed._parse_error = normalizeText(error.message);
  }
  const frontmatter =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? cleanJson(parsed) : {};

  return {
    frontmatter,
    body: lines.slice(closingIndex + 1).join('\n'),
  };
}

function riskPriorityFromSeverityProbability(severity, probability) {
  const severityLevel = normalizeText(severity).toLowerCase();
  const probabilityLevel = normalizeText(probability).toLowerCase();

  if (severityLevel === 'high' && probabilityLevel === 'high') {
    return 'P0';
  }
  if (severityLevel === 'high' || probabilityLevel === 'high') {
    return 'P1';
  }
  if (severityLevel === 'medium' || probabilityLevel === 'medium') {
    return 'P2';
  }
  return 'P3';
}

function governanceField(row, camelName, snakeName) {
  return normalizeText(row?.[camelName] ?? row?.[snakeName]);
}

function buildRiskDebtSnapshot(options = {}) {
  const riskDocuments =
    options.riskDocuments === undefined
      ? listTrackedRiskDocuments()
      : normalizeArray(options.riskDocuments);
  const governanceFiles = normalizeArray(options.governanceFiles);
  const governanceFileByPath = new Map(
    governanceFiles.map((file) => [normalizeText(file.path), file])
  );
  const seenRiskIds = new Set();
  const riskDebtItems = [];

  for (const sourceDocument of riskDocuments) {
    const sourcePath = toPosix(normalizeText(sourceDocument.sourcePath));
    if (!isRiskRegisterItemPath(sourcePath)) {
      continue;
    }

    const raw = normalizeText(sourceDocument.raw);
    const contentSha256 = normalizeText(sourceDocument.contentSha256) || sha256(raw);
    const { frontmatter } = parseMarkdownFrontmatter(raw);
    const riskId =
      normalizeText(frontmatter.id) || path.basename(sourcePath).replace(/\.(md|ya?ml)$/i, '');
    if (seenRiskIds.has(riskId)) {
      throw new Error(`Duplicate risk debt id "${riskId}" while importing ${sourcePath}.`);
    }
    seenRiskIds.add(riskId);

    const governanceFile = governanceFileByPath.get(sourcePath);
    if (!governanceFile) {
      throw new Error(`Risk debt source ${sourcePath} is missing from governance_files.`);
    }

    const severity = normalizeText(frontmatter.severity || 'Unknown');
    const probability = normalizeText(frontmatter.probability || 'Unknown');
    const priority =
      normalizeText(frontmatter.priority) ||
      riskPriorityFromSeverityProbability(severity, probability);

    riskDebtItems.push({
      riskId,
      sourcePath,
      title: normalizeText(frontmatter.title) || riskId,
      status: normalizeText(frontmatter.status) || 'Open',
      owners: normalizeArray(frontmatter.owners || frontmatter.owner)
        .map(normalizeText)
        .filter(Boolean),
      severity,
      probability,
      priority,
      componentUnit: governanceField(governanceFile, 'componentUnit', 'component_unit'),
      rootUnit: governanceField(governanceFile, 'rootUnit', 'root_unit'),
      domainUnit: governanceField(governanceFile, 'domainUnit', 'domain_unit'),
      dddOwner: governanceField(governanceFile, 'dddOwner', 'ddd_owner'),
      cqRails: governanceField(governanceFile, 'cqRails', 'cq_rails'),
      sourceContentSha256: contentSha256,
      rawFrontmatter: frontmatter,
      rawDebt: {
        sourcePath,
        sourceBytes: Buffer.byteLength(raw, 'utf8'),
      },
    });
  }

  return { riskDebtItems };
}

function parseLooseFrontmatter(frontmatterText) {
  const parsed = {};
  for (const line of normalizeText(frontmatterText).split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    parsed[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }

  return parsed;
}

const pendingMarkerTerms = [
  'pending',
  'remaining',
  'debt',
  'gap',
  'follow-up',
  'followup',
  'not implemented',
  'todo',
  'next step',
  'tbd',
  'open question',
];

const taskLikeReferencePattern =
  /(?<![A-Za-z0-9-])(?:ADR-\d{4}|ED-\d{8}-[A-Za-z0-9][A-Za-z0-9-]*|R-\d{8}-[A-Za-z0-9][A-Za-z0-9-]*|US-\d+[A-Za-z0-9-]*|F-\d{2}|[A-Z][A-Z0-9]{1,12}(?:-[A-Z0-9][A-Z0-9]{0,24})+)(?![A-Za-z0-9-])/g;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function lineNumbersForPattern(raw, pattern) {
  const lines = normalizeText(raw).split(/\r?\n/);
  const samples = [];
  let occurrenceCount = 0;

  for (const [index, line] of lines.entries()) {
    const matches = line.match(pattern);
    if (!matches) {
      continue;
    }
    occurrenceCount += matches.length;
    if (samples.length < 5) {
      samples.push({
        lineNumber: index + 1,
        line: line.trim().slice(0, 240),
      });
    }
  }

  return { occurrenceCount, sampleLines: samples };
}

function markerPattern(markerKind) {
  return new RegExp(
    `(?<![A-Za-z0-9-])${escapeRegExp(markerKind).replace(/ /g, '\\s+')}(?![A-Za-z0-9-])`,
    'gi'
  );
}

function buildPendingMarkerRows(document) {
  const rows = [];
  for (const markerKind of pendingMarkerTerms) {
    const { occurrenceCount, sampleLines } = lineNumbersForPattern(
      document.raw,
      markerPattern(markerKind)
    );
    if (occurrenceCount === 0) {
      continue;
    }

    rows.push({
      markerId: `doc-marker:${sha256(`${document.sourcePath}:${markerKind}`).slice(0, 32)}`,
      documentPath: document.sourcePath,
      markerKind,
      occurrenceCount,
      sampleLines,
      sourceContentSha256: document.contentSha256,
      rawMarker: {
        markerKind,
        occurrenceCount,
        sampleLines,
      },
    });
  }

  return rows;
}

function referencePrefix(referenceText) {
  return normalizeText(referenceText).split('-')[0].toUpperCase();
}

function addNormalizedId(idSet, value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return;
  }
  idSet.add(normalized);
  idSet.add(normalized.toUpperCase());
}

function collectFeatureMechanizationReferenceIds(sourceDocuments) {
  const featureIds = new Set();
  const cycleIds = new Set();
  const fencePattern = /```feature-mechanization\s*\r?\n([\s\S]*?)\r?\n```/g;

  for (const sourceDocument of sourceDocuments) {
    const raw = normalizeText(sourceDocument.raw);
    let match;

    while ((match = fencePattern.exec(raw)) !== null) {
      let manifest;
      try {
        manifest = yaml.load(match[1]);
      } catch {
        continue;
      }

      if (!manifest || typeof manifest !== 'object') {
        continue;
      }

      const status = normalizeText(manifest.mechanizationStatus).toLowerCase();
      if (status !== 'closed' && status !== 'implemented') {
        continue;
      }

      addNormalizedId(featureIds, manifest.featureId);
      for (const cycle of normalizeArray(manifest.redGreenCycles)) {
        addNormalizedId(cycleIds, cycle?.id);
      }
    }
  }

  return { featureIds, cycleIds };
}

function classifyTaskLikeReference(
  referenceText,
  featureMechanizationIdSet = new Set(),
  featureMechanizationCycleIdSet = new Set()
) {
  const value = normalizeText(referenceText);
  const upperValue = value.toUpperCase();

  if (featureMechanizationIdSet.has(value) || featureMechanizationIdSet.has(upperValue)) {
    return {
      classification: 'registered_feature_mechanization',
    };
  }
  if (featureMechanizationCycleIdSet.has(value) || featureMechanizationCycleIdSet.has(upperValue)) {
    return { classification: 'feature_mechanization_cycle' };
  }
  if (/^GPT-\d+(?:\.\d+)?$/.test(upperValue)) {
    return { classification: 'model_reference' };
  }
  if (/^[A-Z0-9]+-SKILL$/.test(upperValue)) {
    return { classification: 'skill_reference' };
  }
  if (/^ED-YYYYMMDD$/.test(upperValue)) {
    return { classification: 'evidence_template_id' };
  }
  if (/^ADR-XXXX$/.test(upperValue)) {
    return { classification: 'adr_template_id' };
  }
  if (/^ADR-(?:\d{3,4}[A-Z]?|[A-Z]\d+)$/.test(upperValue)) {
    return { classification: 'adr_id' };
  }
  if (/^ARC-\d+$/.test(upperValue)) {
    return { classification: 'arc_level' };
  }
  if (/^ED-\d{8}(?:-|$)/.test(upperValue)) {
    return { classification: 'evidence_id' };
  }
  if (/^R-\d{8}-/.test(upperValue)) {
    return { classification: 'risk_id' };
  }
  if (/^US-/.test(upperValue)) {
    return { classification: 'user_story' };
  }
  if (/^EPIC-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(upperValue)) {
    return { classification: 'epic_reference' };
  }
  if (/^(?:[A-Z0-9]+-)*[A-Z0-9]+-US\d+$/.test(upperValue)) {
    return { classification: 'user_story' };
  }
  if (/^(?:WAPO|E\d+-ARCH|WEB-(?:AUTH|GAP|PROJECT|SCOPE))-\d+$/.test(upperValue)) {
    return { classification: 'user_story' };
  }
  if (/^(?:EWC|CODE-FILES)-\d+$/.test(upperValue)) {
    return { classification: 'user_story' };
  }
  if (/^TASK-\d+$/.test(upperValue)) {
    return { classification: 'example_task_reference' };
  }
  if (/^GOV-S\d+(?:-[A-Z0-9]+)*$/.test(upperValue) || /^CDG(?:-[A-Z0-9]+)+$/.test(upperValue)) {
    return { classification: 'governance_workstream_reference' };
  }
  if (/^RFC-\d+$/.test(upperValue)) {
    return { classification: 'standards_reference' };
  }
  if (/^AR-[A-Z]$/.test(upperValue)) {
    return {
      classification: 'architecture_review_stream_reference',
    };
  }
  if (/^(?:G\d+|F\d{2}|S\d{2}|W\d+)-/.test(upperValue)) {
    return { classification: 'historical_gap' };
  }
  if (/^SHA-\d+$/.test(upperValue)) {
    return { classification: 'algorithm_reference' };
  }
  if (/^REF-\d+$/.test(upperValue)) {
    return { classification: 'document_reference' };
  }
  if (/^(?:SSE-(?:KMS|S3)|AES-GCM)$/.test(upperValue)) {
    return { classification: 'security_algorithm_reference' };
  }
  if (/^(?:AES|RSA|ECDSA)-\d+$/.test(upperValue) || /^HMAC-SHA\d+$/.test(upperValue)) {
    return { classification: 'security_algorithm_reference' };
  }
  if (/^CVE-\d{4}-\d+$/.test(upperValue)) {
    return { classification: 'security_advisory_reference' };
  }
  if (/^(?:AC|AT|AU|CA|CM|CP|IA|IR|MA|MP|PE|PL|PS|RA|SA|SC|SI|SR)-\d+$/.test(upperValue)) {
    return { classification: 'security_control_reference' };
  }
  if (/^ISOL(?:-[A-Z0-9]+)*$/.test(upperValue)) {
    return { classification: 'security_test_reference' };
  }
  if (/^YYYY-MM-DD$/.test(upperValue)) {
    return { classification: 'date_placeholder' };
  }
  if (/^UTF-\d+$/.test(upperValue)) {
    return { classification: 'encoding_reference' };
  }
  if (
    /^(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY)-(?:USD|EUR|GBP|JPY|CAD|AUD|CHF|CNY)$/.test(upperValue)
  ) {
    return { classification: 'currency_pair_reference' };
  }
  if (/^Q\d+-Q\d+$/.test(upperValue)) {
    return { classification: 'range_reference' };
  }
  if (/^P\d+-\d+$/.test(upperValue)) {
    return { classification: 'priority_work_item_marker' };
  }
  if (/^DL-\d+$/.test(upperValue)) {
    return { classification: 'diagram_reference' };
  }
  if (/^(?:AUTO-FAIL|TEST-MODE)$/.test(upperValue)) {
    return { classification: 'policy_state_reference' };
  }
  if (/^CI-AUDIT$/.test(upperValue)) {
    return { classification: 'governance_workstream_reference' };
  }
  if (/^(?:AV|CE|DW)-\d{3}$/.test(upperValue) || /^EA-\d{8}-\d+$/.test(upperValue)) {
    return { classification: 'review_finding_reference' };
  }
  if (/^AR-[A-Z]\d+-INV-\d+$/.test(upperValue)) {
    return { classification: 'review_invariant_reference' };
  }
  if (
    /^EA-\d{8}$/.test(upperValue) ||
    /^QA-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(upperValue) ||
    /^TF-[A-Z0-9]+(?:-[A-Z0-9]+)*-QA-\d+$/.test(upperValue) ||
    /^AR-[A-Z](?:\d+)?(?:-[A-Z0-9]+)*$/.test(upperValue)
  ) {
    return { classification: 'review_finding_reference' };
  }
  if (
    /^(?:INT|PKR|PR)-[A-Z0-9]+$/.test(upperValue) ||
    /^(?:MW|RC|TF)-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(upperValue)
  ) {
    return { classification: 'historical_planning_reference' };
  }
  if (/^(?:GAP|MVP|RESIDUAL|RISK|LEGACY|INV)-/.test(upperValue) || /^F-\d{2}/.test(upperValue)) {
    return { classification: 'historical_planning_reference' };
  }
  if (/^SYS-/.test(upperValue)) {
    return { classification: 'governance_unit_reference' };
  }
  if (/^CMD-/.test(upperValue)) {
    return { classification: 'command_reference' };
  }
  if (/^PS-[CQ]\d+/.test(upperValue)) {
    return { classification: 'plan_store_matrix_reference' };
  }
  return { classification: 'unknown_task_like_id' };
}

function extractTaskLikeReferences(
  document,
  featureMechanizationIdSet = new Set(),
  featureMechanizationCycleIdSet = new Set()
) {
  const raw = normalizeText(document.raw);
  const grouped = new Map();
  const lineEntries = raw.split(/\r?\n/).map((line, index) => ({
    lineNumber: index + 1,
    line,
    sampleLine: line.trim().slice(0, 240),
  }));

  function addReference(referenceText, lineEntry, options = {}) {
    const groupKey = options.groupKey || referenceText;
    const entry = grouped.get(groupKey) || {
      referenceText,
      occurrenceCount: 0,
      sampleLineNumbers: new Set(),
      sampleLines: [],
    };
    entry.occurrenceCount += 1;
    if (
      lineEntry &&
      entry.sampleLines.length < 5 &&
      !entry.sampleLineNumbers.has(lineEntry.lineNumber)
    ) {
      entry.sampleLineNumbers.add(lineEntry.lineNumber);
      entry.sampleLines.push({
        lineNumber: lineEntry.lineNumber,
        line: lineEntry.sampleLine,
      });
    }
    grouped.set(groupKey, entry);
  }

  for (const lineEntry of lineEntries) {
    taskLikeReferencePattern.lastIndex = 0;
    let match;
    while ((match = taskLikeReferencePattern.exec(lineEntry.line)) !== null) {
      addReference(match[0], lineEntry);
    }
  }

  return [...grouped.values()]
    .sort((left, right) => left.referenceText.localeCompare(right.referenceText))
    .map((entry) => {
      const classification = classifyTaskLikeReference(
        entry.referenceText,
        featureMechanizationIdSet,
        featureMechanizationCycleIdSet
      );
      return {
        referenceId: `doc-reference:${sha256(`${document.sourcePath}:${entry.referenceText}`).slice(
          0,
          32
        )}`,
        documentPath: document.sourcePath,
        referenceText: entry.referenceText,
        referencePrefix: referencePrefix(entry.referenceText),
        classification: classification.classification,
        occurrenceCount: entry.occurrenceCount,
        sampleLines: entry.sampleLines,
        sourceContentSha256: document.contentSha256,
        rawReference: {
          referenceText: entry.referenceText,
          referencePrefix: referencePrefix(entry.referenceText),
          classification: classification.classification,
          occurrenceCount: entry.occurrenceCount,
          sampleLines: entry.sampleLines,
        },
      };
    });
}

function isArchivedDocumentPath(documentPath) {
  const normalizedPath = toPosix(documentPath);
  return (
    normalizedPath.startsWith('docs/archive/') ||
    normalizedPath.includes('/archive/') ||
    normalizedPath.includes('/superseded/') ||
    normalizedPath.includes('/_archive/')
  );
}

function dispositionPriorityRank(priority) {
  const match = /^P?(\d+)$/i.exec(normalizeText(priority));
  return match ? Number(match[1]) : 9;
}

function buildDocsDispositionActions(document, references, pendingHotspotThreshold) {
  if (!document.isActive) {
    return [];
  }

  const actions = [];

  function pushAction({ priority, actionKind, referenceText = null, reason, blocking, evidence }) {
    actions.push({
      actionId: `doc-action:${sha256(
        `${document.documentPath}:${actionKind}:${referenceText || ''}`
      ).slice(0, 32)}`,
      priority,
      actionKind,
      documentPath: document.documentPath,
      referenceText,
      reason,
      blocking,
      evidence,
      sourceContentSha256: document.sourceContentSha256,
      rawAction: {
        priority,
        actionKind,
        documentPath: document.documentPath,
        referenceText,
        reason,
        blocking,
        evidence,
      },
    });
  }

  if (!document.status) {
    pushAction({
      priority: 'P2',
      actionKind: 'missing_status_frontmatter',
      reason: 'Active documentation has no frontmatter status.',
      blocking: false,
      evidence: { documentPath: document.documentPath },
    });
  }

  if (document.status.toLowerCase() === 'draft') {
    pushAction({
      priority: document.documentPath.includes('/closeouts/') ? 'P1' : 'P2',
      actionKind: 'draft_active_doc',
      reason: 'Active documentation still declares Draft status.',
      blocking: false,
      evidence: { status: document.status },
    });
  }

  if (document.status.toLowerCase() === 'superseded') {
    pushAction({
      priority: 'P1',
      actionKind: 'superseded_active_doc',
      reason: 'Superseded documentation is still in an active documentation path.',
      blocking: false,
      evidence: { status: document.status },
    });
  }

  if (document.pendingMarkerCount >= pendingHotspotThreshold) {
    pushAction({
      priority: 'P2',
      actionKind: 'pending_marker_hotspot',
      reason: 'Documentation contains enough pending-style markers to require triage.',
      blocking: false,
      evidence: {
        pendingMarkerCount: document.pendingMarkerCount,
        pendingHotspotThreshold,
      },
    });
  }

  for (const reference of references) {
    if (reference.classification !== 'unknown_task_like_id') {
      continue;
    }

    pushAction({
      priority: 'P1',
      actionKind: 'unknown_task_like_id',
      referenceText: reference.referenceText,
      reason: 'Task-like reference does not match a known governance ID family.',
      blocking: false,
      evidence: {
        referenceText: reference.referenceText,
        occurrenceCount: reference.occurrenceCount,
        sampleLines: reference.sampleLines,
      },
    });
  }

  return actions.sort(
    (left, right) =>
      dispositionPriorityRank(left.priority) - dispositionPriorityRank(right.priority) ||
      left.actionKind.localeCompare(right.actionKind) ||
      normalizeText(left.referenceText).localeCompare(normalizeText(right.referenceText))
  );
}

function buildDocsDispositionSnapshot(options = {}) {
  const sourceDocuments = normalizeArray(options.documents).length
    ? normalizeArray(options.documents)
    : listTrackedMarkdownDocuments();
  const collectedFeatureReferences = collectFeatureMechanizationReferenceIds(sourceDocuments);
  const featureMechanizationIdSet = new Set(collectedFeatureReferences.featureIds);
  const featureMechanizationCycleIdSet = new Set(collectedFeatureReferences.cycleIds);
  for (const featureId of normalizeArray(options.featureMechanizationIds)) {
    addNormalizedId(featureMechanizationIdSet, featureId);
  }
  for (const cycleId of normalizeArray(options.featureMechanizationCycleIds)) {
    addNormalizedId(featureMechanizationCycleIdSet, cycleId);
  }
  const pendingHotspotThreshold = Math.max(
    1,
    normalizeNumber(options.pendingHotspotThreshold) ?? 10
  );
  const documents = [];
  const markers = [];
  const references = [];
  const actions = [];

  for (const sourceDocument of sourceDocuments) {
    const sourcePath = toPosix(normalizeText(sourceDocument.sourcePath));
    const raw = normalizeText(sourceDocument.raw);
    const contentSha256 = normalizeText(sourceDocument.contentSha256) || sha256(raw);
    const { frontmatter } = parseMarkdownFrontmatter(raw);
    const isArchive = isArchivedDocumentPath(sourcePath);
    const documentInput = { sourcePath, raw, contentSha256 };
    const documentMarkers = buildPendingMarkerRows(documentInput);
    const documentReferences = extractTaskLikeReferences(
      documentInput,
      featureMechanizationIdSet,
      featureMechanizationCycleIdSet
    );
    const document = {
      documentPath: sourcePath,
      title: normalizeText(frontmatter.title),
      status: normalizeText(frontmatter.status),
      planningType: normalizeText(frontmatter.planning_type),
      owner: normalizeText(frontmatter.owner),
      isActive: !isArchive,
      isArchive,
      pendingMarkerCount: documentMarkers.reduce((sum, marker) => sum + marker.occurrenceCount, 0),
      taskLikeReferenceCount: documentReferences.reduce(
        (sum, reference) => sum + reference.occurrenceCount,
        0
      ),
      sourceContentSha256: contentSha256,
      rawFrontmatter: frontmatter,
      rawDocument: {
        documentPath: sourcePath,
        sourceBytes: Buffer.byteLength(raw, 'utf8'),
        frontmatter,
      },
    };

    documents.push(document);
    markers.push(...documentMarkers);
    references.push(...documentReferences);
    actions.push(
      ...buildDocsDispositionActions(document, documentReferences, pendingHotspotThreshold)
    );
  }

  return { documents, markers, references, actions };
}

function buildKnowledgeDocumentSnapshot(options = {}) {
  const sourceDocuments = normalizeArray(options.documents).length
    ? normalizeArray(options.documents)
    : listTrackedKnowledgeDocuments();
  return buildKnowledgeSnapshotFromDocuments(sourceDocuments);
}

function globToRegExp(glob) {
  const escaped = String(glob).replaceAll(/[.+^${}()|[\]\\]/g, String.raw`\$&`);
  const doubleStarMarker = '__DOUBLESTAR__';
  const pattern = escaped
    .replaceAll('**', doubleStarMarker)
    .replaceAll('*', '[^/]*')
    .replaceAll(doubleStarMarker, '.*');
  return new RegExp(`^${pattern}$`);
}

function levelRank(level) {
  switch (String(level || '').toUpperCase()) {
    case 'ARC-0':
      return 0;
    case 'ARC-1':
      return 1;
    case 'ARC-2':
      return 2;
    case 'ARC-3':
      return 3;
    default:
      return -1;
  }
}

function maxArcLevel(left, right) {
  return levelRank(left) >= levelRank(right) ? left : right;
}

function isEvidenceDocPath(filePath, policy) {
  const evidenceDir = toPosix(policy.artifacts?.evidence_dir || 'docs/evidence').replace(/\/$/, '');
  const normalizedPath = toPosix(filePath);
  return normalizedPath.startsWith(`${evidenceDir}/`) && /\.md$/i.test(normalizedPath);
}

function isRiskUpdatePath(filePath, policy) {
  const riskDir = toPosix(policy.artifacts?.risk_dir || 'docs/risk-register').replace(/\/$/, '');
  const normalizedPath = toPosix(filePath);
  return normalizedPath.startsWith(`${riskDir}/`) && /\.ya?ml$/i.test(normalizedPath);
}

function evaluateArcPolicyReadiness(options) {
  const policy = options.policy || {};
  const changedFiles = normalizeArray(options.changedFiles).map((filePath) =>
    toPosix(normalizeText(filePath))
  );
  const declaredArcLevel = normalizeText(options.declaredArcLevel || 'NA').toUpperCase();
  let effectiveArcLevel = 'ARC-0';
  const triggerHits = [];

  for (const trigger of policy.triggers || []) {
    const regexes = normalizeArray(trigger.globs).map(globToRegExp);
    const hits = changedFiles.filter((filePath) => regexes.some((regex) => regex.test(filePath)));
    if (hits.length === 0) {
      continue;
    }

    const minArcLevel = normalizeText(trigger.min_arc_level || 'ARC-0').toUpperCase();
    effectiveArcLevel = maxArcLevel(effectiveArcLevel, minArcLevel);
    triggerHits.push({
      triggerName: normalizeText(trigger.name),
      name: normalizeText(trigger.name),
      minArcLevel,
      min_arc_level: minArcLevel,
      guides: normalizeArray(trigger.guides),
      require: trigger.require || {},
      hits: hits.slice(0, 200),
    });
  }

  const isArc = levelRank(effectiveArcLevel) > 0;
  const recommendedGuideSet = new Set();
  for (const hit of triggerHits) {
    for (const guide of normalizeArray(hit.guides)) {
      recommendedGuideSet.add(normalizeText(guide));
    }
  }

  const requirements = {
    evidenceDoc: false,
    riskUpdate: false,
    rolloutNotes: false,
    compatMatrix: false,
  };
  for (const hit of triggerHits) {
    const requireConfig = hit.require || {};
    if (requireConfig.evidence_doc) requirements.evidenceDoc = true;
    if (requireConfig.risk_update) requirements.riskUpdate = true;
    if (requireConfig.rollout_notes) requirements.rolloutNotes = true;
    if (requireConfig.compat_matrix) requirements.compatMatrix = true;
  }
  if (levelRank(effectiveArcLevel) >= levelRank('ARC-2')) requirements.evidenceDoc = true;
  if (effectiveArcLevel === 'ARC-3') requirements.riskUpdate = true;

  const evidenceDocs = changedFiles.filter((filePath) => isEvidenceDocPath(filePath, policy));
  const riskUpdates = changedFiles.filter((filePath) => isRiskUpdatePath(filePath, policy));
  const missingRequirements = [];
  if (requirements.evidenceDoc && evidenceDocs.length === 0) {
    missingRequirements.push('evidenceDoc');
  }
  if (requirements.riskUpdate && riskUpdates.length === 0) {
    missingRequirements.push('riskUpdate');
  }
  if (requirements.rolloutNotes) {
    missingRequirements.push('rolloutNotes');
  }
  if (requirements.compatMatrix) {
    missingRequirements.push('compatMatrix');
  }

  const requiredChecks = normalizeArray(policy.checks?.[effectiveArcLevel] || ['lint', 'test']);
  const recommendedGuides = [...recommendedGuideSet];
  const rawReadiness = {
    isArc,
    declaredArcLevel,
    effectiveArcLevel,
    reasons: {
      triggerHits,
      changedFiles: changedFiles.slice(0, 500),
    },
    requirements,
    requiredChecks,
    policyVersion: policy.version ?? 1,
    recommendedGuides,
    evidenceDocs,
    riskUpdates,
    missingRequirements,
    blocking: missingRequirements.length > 0,
  };

  return {
    readinessId: normalizeText(options.readinessId || 'current'),
    baseRef: normalizeText(options.baseRef || 'origin/main'),
    headRef: normalizeText(options.headRef || 'HEAD'),
    sourcePath: normalizeText(options.sourcePath || '.arc-policy.yaml'),
    sourceContentSha256: normalizeText(options.sourceContentSha256 || ''),
    effectiveArcLevel,
    isArc,
    blocking: missingRequirements.length > 0,
    requirements,
    requiredChecks,
    recommendedGuides,
    changedFiles,
    evidenceDocs,
    riskUpdates,
    triggerHits,
    missingRequirements,
    rawReadiness,
  };
}

function buildPrReadinessSnapshot(options = {}) {
  const baseRef = normalizeText(options.baseRef || process.env.GIT_BASE || 'origin/main');
  const headRef = normalizeText(options.headRef || process.env.GIT_HEAD || 'HEAD');
  const declaredArcLevel = normalizeText(
    options.declaredArcLevel || process.env.DECLARED_ARC_LEVEL || 'NA'
  ).toUpperCase();
  const policyPath = resolveRepoPath(
    options.policyPath || process.env.ARC_POLICY || '.arc-policy.yaml'
  );
  const policySource = readYamlSource(policyPath);
  const changedFiles =
    options.changedFiles === undefined ? listChangedFiles(baseRef, headRef) : options.changedFiles;
  const readiness = evaluateArcPolicyReadiness({
    readinessId: options.readinessId || 'current',
    policy: policySource.parsed || {},
    changedFiles,
    declaredArcLevel,
    baseRef,
    headRef,
    sourcePath: policySource.sourcePath,
    sourceContentSha256: policySource.contentSha256,
  });

  return {
    source: policySource,
    readiness,
  };
}

async function clearGovernanceSnapshotTables(client) {
  for (const tableName of governanceImportDeleteTables) {
    await client.query(`delete from ${schemaName}.${tableName}`);
  }
}

async function insertGovernanceSnapshot(client, snapshot) {
  await clearGovernanceSnapshotTables(client);

  for (const source of snapshot.sources) {
    await client.query(
      `insert into ${schemaName}.governance_sources
        (source_path, source_type, content_sha256, source_bytes, metadata, raw_source, raw_source_text, source_authority)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
       on conflict (source_path) do update set
         source_type = excluded.source_type,
         content_sha256 = excluded.content_sha256,
         source_bytes = excluded.source_bytes,
         metadata = excluded.metadata,
         raw_source = excluded.raw_source,
         raw_source_text = excluded.raw_source_text,
         source_authority = excluded.source_authority`,
      [
        source.sourcePath,
        source.sourceType,
        source.contentSha256,
        source.sourceBytes,
        toJson(source.metadata),
        toJson(source.rawSource),
        source.rawSourceText || null,
        'database',
      ]
    );
  }

  for (const shard of snapshot.fileShards) {
    await client.query(
      `insert into ${schemaName}.governance_file_shards
        (shard_id, source_path, file_count, content_hash, source_content_sha256, raw_shard)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       on conflict (shard_id) do update set
         source_path = excluded.source_path,
         file_count = excluded.file_count,
         content_hash = excluded.content_hash,
         source_content_sha256 = excluded.source_content_sha256,
         raw_shard = excluded.raw_shard`,
      [
        shard.shardId,
        shard.sourcePath,
        shard.fileCount,
        shard.contentHash,
        shard.sourceContentSha256,
        toJson(shard.rawShard),
      ]
    );
  }

  await insertRows(
    client,
    'governance_files',
    [
      'path',
      'file_id',
      'shard_id',
      'source_path',
      'path_hash',
      'content_hash',
      'governance_hash',
      'state_fingerprint',
      'owning_unit',
      'root_unit',
      'domain_unit',
      'component_unit',
      'owner_level',
      'unit_status',
      'governance_state',
      'canonical_role',
      'evidence_state',
      'is_drift',
      'is_legacy',
      'ddd_owner',
      'cq_rails',
      { name: 'governance_refs', cast: 'jsonb' },
      'source_content_sha256',
      { name: 'raw_file', cast: 'jsonb' },
    ],
    snapshot.files,
    (file) => [
      file.path,
      file.fileId,
      file.shardId,
      file.sourcePath,
      file.pathHash,
      file.contentHash,
      file.governanceHash,
      file.stateFingerprint,
      file.owningUnit,
      file.rootUnit,
      file.domainUnit,
      file.componentUnit,
      file.ownerLevel,
      file.unitStatus,
      file.governanceState,
      file.canonicalRole,
      file.evidenceState,
      file.isDrift,
      file.isLegacy,
      file.dddOwner,
      file.cqRails,
      toJson(file.governanceRefs),
      file.sourceContentSha256,
      toJson(file.rawFile),
    ],
    {
      suffix: `on conflict (path) do update set
         file_id = excluded.file_id,
         shard_id = excluded.shard_id,
         source_path = excluded.source_path,
         path_hash = excluded.path_hash,
         content_hash = excluded.content_hash,
         governance_hash = excluded.governance_hash,
         state_fingerprint = excluded.state_fingerprint,
         owning_unit = excluded.owning_unit,
         root_unit = excluded.root_unit,
         domain_unit = excluded.domain_unit,
         component_unit = excluded.component_unit,
         owner_level = excluded.owner_level,
         unit_status = excluded.unit_status,
         governance_state = excluded.governance_state,
         canonical_role = excluded.canonical_role,
         evidence_state = excluded.evidence_state,
         is_drift = excluded.is_drift,
         is_legacy = excluded.is_legacy,
         ddd_owner = excluded.ddd_owner,
         cq_rails = excluded.cq_rails,
         governance_refs = excluded.governance_refs,
         source_content_sha256 = excluded.source_content_sha256,
         raw_file = excluded.raw_file`,
    }
  );

  const incomingGovernancePaths = snapshot.files.map((file) => file.path);
  const protectedPrune = await client.query(
    `select governed.path
       from ${schemaName}.governance_files governed
       join ${schemaName}.governed_source_content_overrides db_owned
         on db_owned.path = governed.path
      where not (governed.path = any($1::text[]))
      order by governed.path
      limit 20`,
    [incomingGovernancePaths]
  );
  if (protectedPrune.rows.length > 0) {
    const paths = protectedPrune.rows.map(({ path: governedPath }) => governedPath).join(', ');
    throw new Error(
      `DB-owned governed-source overlay blocks Planning DB import for removed path(s): ${paths}. ` +
        'Retire that authority explicitly before removing its Git projection.'
    );
  }

  await client.query(
    `delete from ${schemaName}.governance_files where not (path = any($1::text[]))`,
    [incomingGovernancePaths]
  );
  await client.query(
    `delete from ${schemaName}.governance_file_shards where not (shard_id = any($1::text[]))`,
    [snapshot.fileShards.map((shard) => shard.shardId)]
  );
  await client.query(
    `delete from ${schemaName}.governance_sources where not (source_path = any($1::text[]))`,
    [snapshot.sources.map((source) => source.sourcePath)]
  );

  for (const component of snapshot.components) {
    await client.query(
      `insert into ${schemaName}.governance_components
        (component_id, source_path, name, level, parent_id, root_unit, domain_unit,
         unit_path, status, governance_state, canonical_role, evidence_state, is_drift,
         is_legacy, children_required, file_count, ddd_owner, cq_rails, owns, excludes,
         governance_refs, fowler_signals, source_content_sha256, raw_component)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, $14,
         $15, $16, $17, $18, $19::jsonb, $20::jsonb, $21::jsonb, $22::jsonb, $23, $24::jsonb)`,
      [
        component.componentId,
        component.sourcePath,
        component.name,
        component.level,
        component.parentId,
        component.rootUnit,
        component.domainUnit,
        toJson(component.unitPath),
        component.status,
        component.governanceState,
        component.canonicalRole,
        component.evidenceState,
        component.isDrift,
        component.isLegacy,
        component.childrenRequired,
        component.fileCount,
        component.dddOwner,
        component.cqRails,
        toJson(component.owns),
        toJson(component.excludes),
        toJson(component.governanceRefs),
        toJson(component.fowlerSignals),
        component.sourceContentSha256,
        toJson(component.rawComponent),
      ]
    );
  }

  for (const shard of snapshot.componentFileShards) {
    await client.query(
      `insert into ${schemaName}.governance_component_file_shards
        (component_id, source_path, file_count, drift_file_count, legacy_file_count,
         content_hash, source_content_sha256, raw_shard)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        shard.componentId,
        shard.sourcePath,
        shard.fileCount,
        shard.driftFileCount,
        shard.legacyFileCount,
        shard.contentHash,
        shard.sourceContentSha256,
        toJson(shard.rawShard),
      ]
    );
  }

  await insertRows(
    client,
    'governance_component_files',
    [
      'component_id',
      'path',
      'file_id',
      'owning_unit',
      'unit_status',
      'governance_state',
      'is_drift',
      'is_legacy',
      'source_path',
      'source_content_sha256',
      { name: 'raw_component_file', cast: 'jsonb' },
    ],
    snapshot.componentFiles,
    (file) => [
      file.componentId,
      file.path,
      file.fileId,
      file.owningUnit,
      file.unitStatus,
      file.governanceState,
      file.isDrift,
      file.isLegacy,
      file.sourcePath,
      file.sourceContentSha256,
      toJson(file.rawComponentFile),
    ]
  );

  await insertRows(
    client,
    'governance_fingerprints',
    [
      'path',
      'file_id',
      'source_path',
      'content_hash',
      'governance_hash',
      'state_fingerprint',
      'root_unit',
      'domain_unit',
      'component_unit',
      'owning_unit',
      'source_content_sha256',
      { name: 'raw_fingerprint', cast: 'jsonb' },
    ],
    snapshot.fingerprints,
    (fingerprint) => [
      fingerprint.path,
      fingerprint.fileId,
      fingerprint.sourcePath,
      fingerprint.contentHash,
      fingerprint.governanceHash,
      fingerprint.stateFingerprint,
      fingerprint.rootUnit,
      fingerprint.domainUnit,
      fingerprint.componentUnit,
      fingerprint.owningUnit,
      fingerprint.sourceContentSha256,
      toJson(fingerprint.rawFingerprint),
    ]
  );

  for (const row of snapshot.coverageRows) {
    await client.query(
      `insert into ${schemaName}.governance_coverage
        (coverage_id, source_path, coverage_kind, name, count_value, file_count,
         component_id, metadata, source_content_sha256, raw_coverage)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)`,
      [
        row.coverageId,
        row.sourcePath,
        row.coverageKind,
        row.name,
        row.countValue,
        row.fileCount,
        row.componentId,
        toJson(row.metadata),
        row.sourceContentSha256,
        toJson(row.rawCoverage),
      ]
    );
  }

  for (const task of snapshot.remediationTasks) {
    await client.query(
      `insert into ${schemaName}.governance_remediation
        (task_id, source_path, task_type, priority, component_unit, component_file_map,
         root_unit, domain_unit, ddd_owner, cq_rails, blocking, reason, file_count,
         document_count, files, documents, expected_validation, source_content_sha256,
         raw_task)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15::jsonb, $16::jsonb, $17::jsonb, $18, $19::jsonb)`,
      [
        task.taskId,
        task.sourcePath,
        task.taskType,
        task.priority,
        task.componentUnit,
        task.componentFileMap,
        task.rootUnit,
        task.domainUnit,
        task.dddOwner,
        task.cqRails,
        task.blocking,
        task.reason,
        task.fileCount,
        task.documentCount,
        toJson(task.files),
        toJson(task.documents),
        toJson(task.expectedValidation),
        task.sourceContentSha256,
        toJson(task.rawTask),
      ]
    );
  }

  for (const debt of snapshot.riskDebtItems) {
    await client.query(
      `insert into ${schemaName}.risk_debt_items
        (risk_id, source_path, title, status, owners, severity, probability, priority,
         component_unit, root_unit, domain_unit, ddd_owner, cq_rails, source_content_sha256,
         raw_frontmatter, raw_debt)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11, $12, $13, $14,
         $15::jsonb, $16::jsonb)`,
      [
        debt.riskId,
        debt.sourcePath,
        debt.title,
        debt.status,
        toJson(debt.owners),
        debt.severity,
        debt.probability,
        debt.priority,
        debt.componentUnit,
        debt.rootUnit,
        debt.domainUnit,
        debt.dddOwner,
        debt.cqRails,
        debt.sourceContentSha256,
        toJson(debt.rawFrontmatter),
        toJson(debt.rawDebt),
      ]
    );
  }
}

async function insertCodeSymbolSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.code_symbols`);

  await insertRows(
    client,
    'code_symbols',
    [
      'symbol_id',
      'source_path',
      'source_content_sha256',
      'file_path',
      'component_id',
      'owning_unit',
      'root_unit',
      'domain_unit',
      'symbol_name',
      'symbol_kind',
      'export_kind',
      'signature',
      'signature_sha256',
      'start_line',
      'end_line',
      'body_sha256',
      'normalized_body_length',
      { name: 'import_refs', cast: 'jsonb' },
      { name: 'metadata', cast: 'jsonb' },
      { name: 'raw_symbol', cast: 'jsonb' },
    ],
    snapshot.symbols,
    (symbol) => [
      symbol.symbolId,
      symbol.sourcePath,
      symbol.sourceContentSha256,
      symbol.filePath,
      symbol.componentId,
      symbol.owningUnit,
      symbol.rootUnit,
      symbol.domainUnit,
      symbol.symbolName,
      symbol.symbolKind,
      symbol.exportKind,
      symbol.signature,
      symbol.signatureSha256,
      symbol.startLine,
      symbol.endLine,
      symbol.bodySha256,
      symbol.normalizedBodyLength,
      toJson(symbol.importRefs),
      toJson(symbol.metadata),
      toJson(symbol.rawSymbol),
    ]
  );
}

async function refreshCodeSymbolMaterializedProjection(client) {
  await client.query(
    `refresh materialized view ${schemaName}.code_symbol_effective_inventory_projection`
  );
}

async function refreshComponentTreeMaterializedProjection(client) {
  await client.query(
    `refresh materialized view ${schemaName}.component_engineering_component_tree_projection`
  );
}

async function refreshComponentFileOwnershipMaterializedProjection(client) {
  await client.query(
    `refresh materialized view ${schemaName}.component_engineering_file_ownership_projection`
  );
}

async function refreshComponentRuleEvaluationMaterializedProjection(client) {
  await client.query(
    `refresh materialized view ${schemaName}.component_engineering_rule_evaluation_projection`
  );
}

async function insertRepositoryCommandSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.repository_commands`);

  await insertRows(
    client,
    'repository_commands',
    [
      'command_id',
      'command_type',
      'command_name',
      'command_path',
      'command_text',
      'domain',
      'sensitivity',
      'runtime_fanout',
      'changed_file_validation_relevant',
      { name: 'referenced_files', cast: 'jsonb' },
      'source_path',
      'source_content_sha256',
      { name: 'raw_command', cast: 'jsonb' },
    ],
    snapshot.commands,
    (command) => [
      command.commandId,
      command.commandType,
      command.commandName,
      command.commandPath,
      command.commandText,
      command.domain,
      command.sensitivity,
      command.runtimeFanout,
      command.changedFileValidationRelevant,
      toJson(command.referencedFiles),
      command.sourcePath,
      command.sourceContentSha256,
      toJson(command.rawCommand),
    ]
  );
}

async function insertCommandQueryRailSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.command_query_rails`);

  await insertRows(
    client,
    'command_query_rails',
    [
      'rail_id',
      'feature_id',
      'mechanization_status',
      'rail_name',
      'normalized_rail_name',
      'rail_type',
      'ddd_owner',
      'rail_status',
      { name: 'symbol_refs', cast: 'jsonb' },
      { name: 'implementation_refs', cast: 'jsonb' },
      { name: 'documentation_refs', cast: 'jsonb' },
      { name: 'governing_sources', cast: 'jsonb' },
      { name: 'allowed_implementation_surfaces', cast: 'jsonb' },
      { name: 'architecture_guards', cast: 'jsonb' },
      { name: 'completion_gate', cast: 'jsonb' },
      'source_path',
      'source_content_sha256',
      { name: 'raw_rail', cast: 'jsonb' },
      { name: 'raw_manifest', cast: 'jsonb' },
    ],
    snapshot.rails,
    (rail) => [
      rail.railId,
      rail.featureId,
      rail.mechanizationStatus,
      rail.railName,
      rail.normalizedRailName,
      rail.railType,
      rail.dddOwner,
      rail.railStatus,
      toJson(rail.symbolRefs),
      toJson(rail.implementationRefs),
      toJson(rail.documentationRefs),
      toJson(rail.governingSources),
      toJson(rail.allowedImplementationSurfaces),
      toJson(rail.architectureGuards),
      toJson(rail.completionGate),
      rail.sourcePath,
      rail.sourceContentSha256,
      toJson(rail.rawRail),
      toJson(rail.rawManifest),
    ]
  );
}

function readDbGovernanceSurfaceCatalog(catalogPath = dbGovernanceSurfaceCatalogPath) {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Missing Planning DB governance surface catalog: ${catalogPath}`);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.surfaces)) {
    throw new Error(
      'Planning DB governance surface catalog must use schemaVersion 1 and contain surfaces.'
    );
  }

  const names = new Set();
  for (const [index, surface] of catalog.surfaces.entries()) {
    for (const field of [
      'surfaceName',
      'canonicalSource',
      'writeRail',
      'writeRailKind',
      'readQueryRail',
      'projection',
      'validation',
      'authorityMode',
    ]) {
      if (typeof surface?.[field] !== 'string' || surface[field].trim() === '') {
        throw new Error(`Planning DB governance surface catalog row ${index} is missing ${field}.`);
      }
    }
    if (names.has(surface.surfaceName)) {
      throw new Error(`Duplicate Planning DB governance surface "${surface.surfaceName}".`);
    }
    names.add(surface.surfaceName);
  }

  assertCurrentStateValue(catalog, 'dbGovernanceSurfaceCatalog');
  return catalog;
}

async function restoreDbGovernanceSurfaceCatalog(client, catalog, options = {}) {
  const catalogPath = options.catalogPath || dbGovernanceSurfaceCatalogPath;
  const sourceRef = path.relative(repoRoot, catalogPath).replaceAll('\\', '/');
  const sourceContentSha256 = sha256(fs.readFileSync(catalogPath));

  await client.query(`delete from ${schemaName}.db_governance_surfaces`);
  await insertRows(
    client,
    'db_governance_surfaces',
    [
      'surface_name',
      'canonical_source',
      'write_rail',
      'write_rail_kind',
      'read_query_rail',
      'projection',
      'validation',
      'authority_mode',
      'source_ref',
      'source_content_sha256',
      'revision',
      'updated_by',
      { name: 'raw_surface', cast: 'jsonb' },
    ],
    catalog.surfaces,
    (surface) => [
      surface.surfaceName,
      surface.canonicalSource,
      surface.writeRail,
      surface.writeRailKind,
      surface.readQueryRail,
      surface.projection,
      surface.validation,
      surface.authorityMode,
      sourceRef,
      sourceContentSha256,
      1,
      'current-schema',
      toJson({ authorityMode: surface.authorityMode, catalogVersion: catalog.schemaVersion }),
    ]
  );
}

function readDbtProjectRoundtripCapabilityCatalog(
  catalogPath = dbtProjectRoundtripCapabilityCatalogPath
) {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Missing DBT project round-trip capability catalog: ${catalogPath}`);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  if (
    catalog?.schemaVersion !== 1 ||
    !Array.isArray(catalog.phases) ||
    !Array.isArray(catalog.railEvidence)
  ) {
    throw new Error(
      'DBT project round-trip capability catalog must use schemaVersion 1 and contain phases and railEvidence.'
    );
  }

  const phasesById = new Map(catalog.phases.map((phase) => [phase.phaseId, phase]));
  if (phasesById.size !== catalog.phases.length) {
    throw new Error('DBT project round-trip capability catalog contains duplicate phase IDs.');
  }
  const evidenceIds = new Set();
  for (const evidence of catalog.railEvidence) {
    if (!phasesById.has(evidence.phaseId)) {
      throw new Error(
        `DBT round-trip evidence ${evidence.evidenceId} references an unknown phase.`
      );
    }
    if (evidenceIds.has(evidence.evidenceId)) {
      throw new Error(`Duplicate DBT round-trip evidence ID "${evidence.evidenceId}".`);
    }
    evidenceIds.add(evidence.evidenceId);
  }
  for (const phase of catalog.phases) {
    const actualCount = catalog.railEvidence.filter(
      (evidence) => evidence.phaseId === phase.phaseId
    ).length;
    if (actualCount !== phase.expectedRailCount) {
      throw new Error(
        `DBT round-trip phase ${phase.phaseId} expects ${phase.expectedRailCount} rails but declares ${actualCount}.`
      );
    }
  }

  assertCurrentStateValue(catalog, 'dbtProjectRoundtripCapabilityCatalog');
  return catalog;
}

async function restoreDbtProjectRoundtripCapabilityCatalog(client, catalog, options = {}) {
  const catalogPath = options.catalogPath || dbtProjectRoundtripCapabilityCatalogPath;
  const sourcePath = path.relative(repoRoot, catalogPath).replaceAll('\\', '/');

  await client.query(`delete from ${schemaName}.dbt_project_roundtrip_phase_rail_evidence`);
  await client.query(`delete from ${schemaName}.dbt_project_roundtrip_phases`);
  await insertRows(
    client,
    'dbt_project_roundtrip_phases',
    ['phase_id', 'phase_order', 'phase_name', 'expected_rail_count', 'source_path'],
    catalog.phases,
    (phase) => [
      phase.phaseId,
      phase.phaseOrder,
      phase.phaseName,
      phase.expectedRailCount,
      sourcePath,
    ]
  );
  await insertRows(
    client,
    'dbt_project_roundtrip_phase_rail_evidence',
    [
      'evidence_id',
      'phase_id',
      'rail_name',
      'expected_rail_type',
      'expected_rail_status',
      'expected_mechanization_status',
      'expected_is_gap',
      'expected_implemented',
      'reviewed_pr_url',
      'reviewed_commit_sha',
      'evidence_summary',
      'source_path',
    ],
    catalog.railEvidence,
    (evidence) => [
      evidence.evidenceId,
      evidence.phaseId,
      evidence.railName,
      evidence.expectedRailType,
      evidence.expectedRailStatus,
      evidence.expectedMechanizationStatus,
      evidence.expectedIsGap,
      evidence.expectedImplemented,
      evidence.reviewedPrUrl,
      evidence.reviewedCommitSha,
      evidence.evidenceSummary,
      sourcePath,
    ]
  );
}

async function insertFrontendMechanicalTruthSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.frontend_mechanical_truth_surfaces`);

  await insertRows(
    client,
    'frontend_mechanical_truth_surfaces',
    [
      'surface_id',
      'surface_kind',
      'route_path',
      'screen_state',
      'frontend_owner',
      { name: 'registered_plugins', cast: 'jsonb' },
      { name: 'consumed_endpoints', cast: 'jsonb' },
      { name: 'zustand_stores', cast: 'jsonb' },
      { name: 'tanstack_queries', cast: 'jsonb' },
      { name: 'visible_no_backend_affordances', cast: 'jsonb' },
      { name: 'capability_gaps', cast: 'jsonb' },
      { name: 'evidence_refs', cast: 'jsonb' },
      'source_path',
      'source_content_sha256',
      { name: 'raw_surface', cast: 'jsonb' },
    ],
    snapshot.surfaces,
    (surface) => [
      surface.surfaceId,
      surface.surfaceKind,
      surface.routePath,
      surface.screenState,
      surface.frontendOwner,
      toJson(surface.registeredPlugins),
      toJson(surface.consumedEndpoints),
      toJson(surface.zustandStores),
      toJson(surface.tanstackQueries),
      toJson(surface.visibleNoBackendAffordances),
      toJson(surface.capabilityGaps),
      toJson(surface.evidenceRefs),
      surface.sourcePath,
      surface.sourceContentSha256,
      toJson(surface.rawSurface),
    ]
  );
}

async function insertFrontendComponentReflectionSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.frontend_component_evidence`);
  await client.query(`delete from ${schemaName}.frontend_component_cq_rails`);
  await client.query(`delete from ${schemaName}.frontend_component_files`);
  await client.query(`delete from ${schemaName}.frontend_surface_component_links`);
  await client.query(`delete from ${schemaName}.frontend_components`);

  await insertRows(
    client,
    'frontend_components',
    [
      'component_id',
      'component_name',
      'component_kind',
      'component_status',
      'reuse_decision',
      'frontend_owner',
      'responsibility',
      'package_name',
      'route_scope',
      'plugin_scope',
      { name: 'capability_gaps', cast: 'jsonb' },
      { name: 'evidence_refs', cast: 'jsonb' },
      'source_path',
      'source_content_sha256',
      { name: 'raw_component', cast: 'jsonb' },
    ],
    snapshot.components,
    (component) => [
      component.componentId,
      component.componentName,
      component.componentKind,
      component.componentStatus,
      component.reuseDecision,
      component.frontendOwner,
      component.responsibility,
      component.packageName,
      component.routeScope || null,
      component.pluginScope || null,
      toJson(component.capabilityGaps),
      toJson(component.evidenceRefs),
      component.sourcePath,
      component.sourceContentSha256,
      toJson(component.rawComponent),
    ]
  );

  await insertRows(
    client,
    'frontend_surface_component_links',
    [
      'component_id',
      'surface_id',
      'route_path',
      'placement_kind',
      'placement_order',
      { name: 'raw_link', cast: 'jsonb' },
    ],
    snapshot.surfaceLinks,
    (link) => [
      link.componentId,
      link.surfaceId,
      link.routePath || null,
      link.placementKind,
      link.placementOrder,
      toJson(link.rawLink),
    ]
  );

  await insertRows(
    client,
    'frontend_component_files',
    [
      'component_id',
      'file_path',
      'file_role',
      'exported_symbol',
      { name: 'raw_file', cast: 'jsonb' },
    ],
    snapshot.files,
    (fileRef) => [
      fileRef.componentId,
      fileRef.filePath,
      fileRef.fileRole,
      fileRef.exportedSymbol || null,
      toJson(fileRef.rawFile),
    ]
  );

  await insertRows(
    client,
    'frontend_component_cq_rails',
    ['component_id', 'rail_name', 'rail_kind', 'rail_status', { name: 'raw_rail', cast: 'jsonb' }],
    snapshot.rails,
    (rail) => [
      rail.componentId,
      rail.railName,
      rail.railKind,
      rail.railStatus,
      toJson(rail.rawRail),
    ]
  );

  await insertRows(
    client,
    'frontend_component_evidence',
    [
      'evidence_id',
      'component_id',
      'evidence_kind',
      'evidence_ref',
      'evidence_status',
      { name: 'raw_evidence', cast: 'jsonb' },
    ],
    snapshot.evidence,
    (evidence) => [
      evidence.evidenceId,
      evidence.componentId,
      evidence.evidenceKind,
      evidence.evidenceRef,
      evidence.evidenceStatus,
      toJson(evidence.rawEvidence),
    ]
  );
}

async function insertPrReadinessSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.pr_readiness_checks`);

  const readiness = snapshot.readiness;
  await client.query(
    `insert into ${schemaName}.pr_readiness_checks
      (readiness_id, base_ref, head_ref, source_path, source_content_sha256,
       effective_arc_level, is_arc, blocking, requirements, required_checks,
       recommended_guides, changed_files, evidence_docs, risk_updates, trigger_hits,
       missing_requirements, raw_readiness)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb,
       $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb,
       $16::jsonb, $17::jsonb)`,
    [
      readiness.readinessId,
      readiness.baseRef,
      readiness.headRef,
      readiness.sourcePath,
      readiness.sourceContentSha256,
      readiness.effectiveArcLevel,
      readiness.isArc,
      readiness.blocking,
      toJson(readiness.requirements),
      toJson(readiness.requiredChecks),
      toJson(readiness.recommendedGuides),
      toJson(readiness.changedFiles),
      toJson(readiness.evidenceDocs),
      toJson(readiness.riskUpdates),
      toJson(readiness.triggerHits),
      toJson(readiness.missingRequirements),
      toJson(readiness.rawReadiness),
    ]
  );
}

async function insertDocsDispositionSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.doc_disposition_actions`);
  await client.query(`delete from ${schemaName}.doc_task_like_references`);
  await client.query(`delete from ${schemaName}.doc_disposition_markers`);
  await client.query(`delete from ${schemaName}.doc_disposition_documents`);

  await insertRows(
    client,
    'doc_disposition_documents',
    [
      'document_path',
      'title',
      'status',
      'planning_type',
      'owner',
      'is_active',
      'is_archive',
      'pending_marker_count',
      'task_like_reference_count',
      'source_content_sha256',
      { name: 'raw_frontmatter', cast: 'jsonb' },
      { name: 'raw_document', cast: 'jsonb' },
    ],
    snapshot.documents,
    (document) => [
      document.documentPath,
      document.title,
      document.status,
      document.planningType,
      document.owner,
      document.isActive,
      document.isArchive,
      document.pendingMarkerCount,
      document.taskLikeReferenceCount,
      document.sourceContentSha256,
      toJson(document.rawFrontmatter),
      toJson(document.rawDocument),
    ]
  );

  await insertRows(
    client,
    'doc_disposition_markers',
    [
      'marker_id',
      'document_path',
      'marker_kind',
      'occurrence_count',
      { name: 'sample_lines', cast: 'jsonb' },
      'source_content_sha256',
      { name: 'raw_marker', cast: 'jsonb' },
    ],
    snapshot.markers,
    (marker) => [
      marker.markerId,
      marker.documentPath,
      marker.markerKind,
      marker.occurrenceCount,
      toJson(marker.sampleLines),
      marker.sourceContentSha256,
      toJson(marker.rawMarker),
    ]
  );

  await insertRows(
    client,
    'doc_task_like_references',
    [
      'reference_id',
      'document_path',
      'reference_text',
      'reference_prefix',
      'classification',
      'occurrence_count',
      { name: 'sample_lines', cast: 'jsonb' },
      'source_content_sha256',
      { name: 'raw_reference', cast: 'jsonb' },
    ],
    snapshot.references,
    (reference) => [
      reference.referenceId,
      reference.documentPath,
      reference.referenceText,
      reference.referencePrefix,
      reference.classification,
      reference.occurrenceCount,
      toJson(reference.sampleLines),
      reference.sourceContentSha256,
      toJson(reference.rawReference),
    ]
  );

  await insertRows(
    client,
    'doc_disposition_actions',
    [
      'action_id',
      'priority',
      'action_kind',
      'document_path',
      'reference_text',
      'reason',
      'blocking',
      { name: 'evidence', cast: 'jsonb' },
      'source_content_sha256',
      { name: 'raw_action', cast: 'jsonb' },
    ],
    snapshot.actions,
    (action) => [
      action.actionId,
      action.priority,
      action.actionKind,
      action.documentPath,
      action.referenceText,
      action.reason,
      action.blocking,
      toJson(action.evidence),
      action.sourceContentSha256,
      toJson(action.rawAction),
    ]
  );
}

async function insertKnowledgeSnapshot(client, snapshot) {
  await insertRows(
    client,
    'knowledge_documents',
    [
      'document_id',
      'document_path',
      'document_type',
      'title',
      'status',
      'planning_type',
      'owner',
      'mandatory',
      'source_content_sha256',
      { name: 'raw_frontmatter', cast: 'jsonb' },
    ],
    snapshot.documents,
    (document) => [
      document.documentId,
      document.documentPath,
      document.documentType,
      document.title,
      document.status,
      document.planningType,
      document.owner,
      document.mandatory,
      document.sourceContentSha256,
      toJson(document.rawFrontmatter),
    ]
  );

  await insertRows(
    client,
    'knowledge_document_sections',
    ['section_id', 'document_id', 'heading', 'heading_level', 'ordinal', 'anchor', 'start_line'],
    snapshot.sections,
    (section) => [
      section.sectionId,
      section.documentId,
      section.heading,
      section.headingLevel,
      section.ordinal,
      section.anchor,
      section.startLine,
    ]
  );

  await insertRows(
    client,
    'knowledge_proposals',
    ['proposal_id', 'document_id', 'proposal_status', 'mandatory', 'decision_state'],
    snapshot.proposals,
    (proposal) => [
      proposal.proposalId,
      proposal.documentId,
      proposal.proposalStatus,
      proposal.mandatory,
      proposal.decisionState,
    ]
  );

  await insertRows(
    client,
    'knowledge_document_links',
    ['from_document_id', 'to_document_id', 'relation_type'],
    snapshot.documentLinks,
    (link) => [link.fromDocumentId, link.toDocumentId, link.relationType],
    { suffix: 'on conflict do nothing' }
  );

  await insertRows(
    client,
    'knowledge_action_items',
    [
      'action_id',
      'source_document_id',
      'source_section_id',
      'summary',
      'status',
      'required',
      'line_number',
    ],
    snapshot.actions,
    (action) => [
      action.actionId,
      action.sourceDocumentId,
      action.sourceSectionId,
      action.summary,
      action.status,
      action.required,
      action.lineNumber,
    ]
  );

  await insertRows(
    client,
    'knowledge_action_links',
    ['action_id', 'target_type', 'target_id', 'relation_type'],
    snapshot.actionLinks,
    (link) => [link.actionId, link.targetType, link.targetId, link.relationType],
    { suffix: 'on conflict do nothing' }
  );
}

async function insertKnowledgeIntakeRepositoryReferences(client, snapshot) {
  await client.query(`delete from ${schemaName}.knowledge_intake_repository_references`);
  await insertRows(
    client,
    'knowledge_intake_repository_references',
    [
      'reference_id',
      'target_document_path',
      'source_path',
      'relation_type',
      'line_number',
      'sample_text',
      'source_content_sha256',
      { name: 'raw_reference', cast: 'jsonb' },
    ],
    snapshot.references,
    (reference) => [
      reference.referenceId,
      reference.targetDocumentPath,
      reference.sourcePath,
      reference.relationType,
      reference.lineNumber,
      reference.sampleText,
      reference.sourceContentSha256,
      toJson(reference.rawReference),
    ]
  );
}

async function beginImportTransaction(client) {
  await client.query('begin');
  await client.query('select pg_advisory_xact_lock(hashtext($1), hashtext($2))', [
    'dvt:planning-query-store',
    'import-content-v1',
  ]);
}

async function importContent(options = {}) {
  const url = options.databaseUrl || databaseUrl();
  const silent = options.silent === true;
  const governanceSnapshot = buildGovernanceFileSnapshot();
  const repositoryCommandSnapshot = await buildRepositoryCommandSnapshot();
  const commandQueryRailSnapshot = buildCommandQueryRailSnapshot({ governanceSnapshot });
  const codeSymbolSnapshot = buildCodeSymbolSnapshot({ governanceSnapshot });
  const frontendMechanicalTruthSnapshot = buildFrontendMechanicalTruthSnapshot();
  const frontendComponentReflectionSnapshot = buildFrontendComponentReflectionSnapshot();
  const prReadinessSnapshot = buildPrReadinessSnapshot();
  const markdownDocuments = listTrackedMarkdownDocuments();
  const knowledgeDocuments = listTrackedKnowledgeDocuments({ markdownDocuments });
  const knowledgeIntakeRepositoryReferenceSnapshot =
    buildKnowledgeIntakeRepositoryReferenceSnapshot({
      intakeDocumentPaths: knowledgeDocuments
        .map((document) => document.sourcePath)
        .filter((sourcePath) => /^buzon\/.*\.md$/i.test(toPosix(sourcePath))),
    });
  const dbGovernanceSurfaceCatalog = readDbGovernanceSurfaceCatalog();
  const dbtProjectRoundtripCapabilityCatalog = readDbtProjectRoundtripCapabilityCatalog();
  let docsDispositionSnapshot;
  let knowledgeSnapshot;
  const client = options.client || new Client({ connectionString: url });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await beginImportTransaction(client);
    await assertPlanningDbCurrentSchemaReady(client);
    await restoreDbGovernanceSurfaceCatalog(client, dbGovernanceSurfaceCatalog);
    await restoreDbtProjectRoundtripCapabilityCatalog(client, dbtProjectRoundtripCapabilityCatalog);
    docsDispositionSnapshot = buildDocsDispositionSnapshot({
      documents: markdownDocuments,
    });
    knowledgeSnapshot = buildKnowledgeDocumentSnapshot({
      documents: knowledgeDocuments,
    });
    await insertGovernanceSnapshot(client, governanceSnapshot);
    await refreshComponentTreeMaterializedProjection(client);
    await refreshComponentFileOwnershipMaterializedProjection(client);
    await refreshComponentRuleEvaluationMaterializedProjection(client);
    await insertCodeSymbolSnapshot(client, codeSymbolSnapshot);
    await refreshCodeSymbolMaterializedProjection(client);
    await insertRepositoryCommandSnapshot(client, repositoryCommandSnapshot);
    await insertCommandQueryRailSnapshot(client, commandQueryRailSnapshot);
    await insertFrontendMechanicalTruthSnapshot(client, frontendMechanicalTruthSnapshot);
    await insertFrontendComponentReflectionSnapshot(client, frontendComponentReflectionSnapshot);
    await insertPrReadinessSnapshot(client, prReadinessSnapshot);
    await insertDocsDispositionSnapshot(client, docsDispositionSnapshot);
    await insertKnowledgeSnapshot(client, knowledgeSnapshot);
    await insertKnowledgeIntakeRepositoryReferences(
      client,
      knowledgeIntakeRepositoryReferenceSnapshot
    );
    await refreshComponentTreeMaterializedProjection(client);
    await refreshComponentFileOwnershipMaterializedProjection(client);
    await refreshComponentRuleEvaluationMaterializedProjection(client);
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }

  const result = {
    governanceFiles: governanceSnapshot.files.length,
    governanceComponents: governanceSnapshot.components.length,
    governanceComponentFiles: governanceSnapshot.componentFiles.length,
    governanceFingerprints: governanceSnapshot.fingerprints.length,
    governanceCoverageRows: governanceSnapshot.coverageRows.length,
    governanceRemediationTasks: governanceSnapshot.remediationTasks.length,
    riskDebtItems: governanceSnapshot.riskDebtItems.length,
    repositoryCommands: repositoryCommandSnapshot.commands.length,
    commandQueryRails: commandQueryRailSnapshot.rails.length,
    codeSymbols: codeSymbolSnapshot.symbols.length,
    frontendMechanicalTruthSurfaces: frontendMechanicalTruthSnapshot.surfaces.length,
    frontendComponents: frontendComponentReflectionSnapshot.components.length,
    prReadinessChecks: 1,
    docsDispositionDocuments: docsDispositionSnapshot.documents.length,
    docsDispositionActions: docsDispositionSnapshot.actions.length,
    docsTaskLikeReferences: docsDispositionSnapshot.references.length,
    knowledgeDocuments: knowledgeSnapshot.documents.length,
    knowledgeActions: knowledgeSnapshot.actions.length,
    knowledgeIntakeRepositoryReferences:
      knowledgeIntakeRepositoryReferenceSnapshot.references.length,
  };

  if (!silent) {
    const message = [
      `[planning:db:import] governanceFiles=${result.governanceFiles}`,
      `governanceComponents=${result.governanceComponents}`,
      `governanceRemediationTasks=${result.governanceRemediationTasks}`,
      `riskDebtItems=${result.riskDebtItems}`,
      `repositoryCommands=${result.repositoryCommands}`,
      `commandQueryRails=${result.commandQueryRails}`,
      `codeSymbols=${result.codeSymbols}`,
      `frontendMechanicalTruthSurfaces=${result.frontendMechanicalTruthSurfaces}`,
      `frontendComponents=${result.frontendComponents}`,
      `prReadinessChecks=${result.prReadinessChecks}`,
      `docsDispositionActions=${result.docsDispositionActions}`,
      `knowledgeDocuments=${result.knowledgeDocuments}`,
      `knowledgeIntakeRepositoryReferences=${result.knowledgeIntakeRepositoryReferences}`,
    ].join(' ');
    console.log(message);
  }

  return result;
}

function compareImportRows(expectedRows, actualRows, options) {
  const expectedByKey = new Map((expectedRows || []).map((row) => [options.keyOf(row), row]));
  const actualByKey = new Map((actualRows || []).map((row) => [options.keyOf(row), row]));
  const expectedKeys = [...expectedByKey.keys()];
  const actualKeys = [...actualByKey.keys()];
  const missing = expectedKeys.filter((key) => !actualByKey.has(key)).sort();
  const unexpected = actualKeys.filter((key) => !expectedByKey.has(key)).sort();
  const stale = [];

  for (const key of expectedKeys) {
    if (!actualByKey.has(key)) {
      continue;
    }

    const expected = expectedByKey.get(key);
    const actual = actualByKey.get(key);
    const differences = [];

    for (const field of options.compareFields) {
      if (normalizeText(expected[field]) !== normalizeText(actual[field])) {
        differences.push({ field });
      }
    }

    if (differences.length > 0) {
      stale.push({ key, differences });
    }
  }

  return {
    missing,
    unexpected,
    stale: stale.sort((left, right) => left.key.localeCompare(right.key)),
  };
}

function compareGovernanceAuxiliaryState(expected, actual) {
  const sections = {
    repositoryCommands: compareImportRows(expected.repositoryCommands, actual.repositoryCommands, {
      keyOf: (row) => row.commandId,
      compareFields: ['commandText', 'sourcePath', 'sourceContentSha256'],
    }),
    commandQueryRails: compareImportRows(expected.commandQueryRails, actual.commandQueryRails, {
      keyOf: (row) => row.railId,
      compareFields: [
        'featureId',
        'railName',
        'railType',
        'dddOwner',
        'railStatus',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
    frontendMechanicalTruthSurfaces: compareImportRows(
      expected.frontendMechanicalTruthSurfaces,
      actual.frontendMechanicalTruthSurfaces,
      {
        keyOf: (row) => row.surfaceId,
        compareFields: [
          'surfaceKind',
          'routePath',
          'screenState',
          'frontendOwner',
          'sourcePath',
          'sourceContentSha256',
        ],
      }
    ),
    frontendComponents: compareImportRows(expected.frontendComponents, actual.frontendComponents, {
      keyOf: (row) => row.componentId,
      compareFields: [
        'componentName',
        'componentKind',
        'componentStatus',
        'reuseDecision',
        'frontendOwner',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
    codeSymbols: compareImportRows(expected.codeSymbols, actual.codeSymbols, {
      keyOf: (row) => row.symbolId,
      compareFields: [
        'symbolName',
        'symbolKind',
        'componentId',
        'filePath',
        'startLine',
        'endLine',
        'bodySha256',
        'sourcePath',
        'sourceContentSha256',
      ],
    }),
    prReadinessChecks: compareImportRows(expected.prReadinessChecks, actual.prReadinessChecks, {
      keyOf: (row) => row.readinessId,
      compareFields: ['sourcePath', 'sourceContentSha256', 'effectiveArcLevel', 'blocking'],
    }),
    docDispositionDocuments: compareImportRows(
      expected.docDispositionDocuments,
      actual.docDispositionDocuments,
      {
        keyOf: (row) => row.documentPath,
        compareFields: [
          'status',
          'planningType',
          'pendingMarkerCount',
          'taskLikeReferenceCount',
          'sourceContentSha256',
        ],
      }
    ),
    docDispositionMarkers: compareImportRows(
      expected.docDispositionMarkers,
      actual.docDispositionMarkers,
      {
        keyOf: (row) => row.markerId,
        compareFields: ['documentPath', 'markerKind', 'occurrenceCount', 'sourceContentSha256'],
      }
    ),
    docTaskLikeReferences: compareImportRows(
      expected.docTaskLikeReferences,
      actual.docTaskLikeReferences,
      {
        keyOf: (row) => row.referenceId,
        compareFields: [
          'documentPath',
          'referenceText',
          'classification',
          'occurrenceCount',
          'sourceContentSha256',
        ],
      }
    ),
    knowledgeIntakeRepositoryReferences: compareImportRows(
      expected.knowledgeIntakeRepositoryReferences,
      actual.knowledgeIntakeRepositoryReferences,
      {
        keyOf: (row) => row.referenceId,
        compareFields: [
          'targetDocumentPath',
          'sourcePath',
          'relationType',
          'lineNumber',
          'sourceContentSha256',
        ],
      }
    ),
    docDispositionActions: compareImportRows(
      expected.docDispositionActions,
      actual.docDispositionActions,
      {
        keyOf: (row) => row.actionId,
        compareFields: [
          'priority',
          'actionKind',
          'documentPath',
          'referenceText',
          'reason',
          'blocking',
          'sourceContentSha256',
        ],
      }
    ),
    riskDebtItems: compareImportRows(expected.riskDebtItems, actual.riskDebtItems, {
      keyOf: (row) => row.riskId,
      compareFields: [
        'sourcePath',
        'title',
        'status',
        'severity',
        'probability',
        'priority',
        'componentUnit',
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

async function buildGovernanceAuxiliaryExpectedState(options = {}) {
  const repositoryCommandSnapshot =
    options.repositoryCommandSnapshot || (await buildRepositoryCommandSnapshot());
  const commandQueryRailSnapshot =
    options.commandQueryRailSnapshot || buildCommandQueryRailSnapshot();
  const frontendMechanicalTruthSnapshot =
    options.frontendMechanicalTruthSnapshot || buildFrontendMechanicalTruthSnapshot();
  const frontendComponentReflectionSnapshot =
    options.frontendComponentReflectionSnapshot || buildFrontendComponentReflectionSnapshot();
  const governanceSnapshot = options.governanceSnapshot || buildGovernanceFileSnapshot();
  const codeSymbolSnapshot =
    options.codeSymbolSnapshot || buildCodeSymbolSnapshot({ governanceSnapshot });
  const prReadinessSnapshot = options.prReadinessSnapshot || buildPrReadinessSnapshot();
  const docsDispositionSnapshot = options.docsDispositionSnapshot || buildDocsDispositionSnapshot();
  const knowledgeIntakeRepositoryReferenceSnapshot =
    options.knowledgeIntakeRepositoryReferenceSnapshot ||
    buildKnowledgeIntakeRepositoryReferenceSnapshot();

  return {
    repositoryCommands: repositoryCommandSnapshot.commands.map((command) => ({
      commandId: command.commandId,
      commandText: command.commandText,
      sourcePath: command.sourcePath,
      sourceContentSha256: command.sourceContentSha256,
    })),
    commandQueryRails: commandQueryRailSnapshot.rails.map((rail) => ({
      railId: rail.railId,
      featureId: rail.featureId,
      railName: rail.railName,
      railType: rail.railType,
      dddOwner: rail.dddOwner,
      railStatus: rail.railStatus,
      sourcePath: rail.sourcePath,
      sourceContentSha256: rail.sourceContentSha256,
    })),
    frontendMechanicalTruthSurfaces: frontendMechanicalTruthSnapshot.surfaces.map((surface) => ({
      surfaceId: surface.surfaceId,
      surfaceKind: surface.surfaceKind,
      routePath: surface.routePath,
      screenState: surface.screenState,
      frontendOwner: surface.frontendOwner,
      sourcePath: surface.sourcePath,
      sourceContentSha256: surface.sourceContentSha256,
    })),
    frontendComponents: frontendComponentReflectionSnapshot.components.map((component) => ({
      componentId: component.componentId,
      componentName: component.componentName,
      componentKind: component.componentKind,
      componentStatus: component.componentStatus,
      reuseDecision: component.reuseDecision,
      frontendOwner: component.frontendOwner,
      sourcePath: component.sourcePath,
      sourceContentSha256: component.sourceContentSha256,
    })),
    codeSymbols: codeSymbolSnapshot.symbols.map((symbol) => ({
      symbolId: symbol.symbolId,
      symbolName: symbol.symbolName,
      symbolKind: symbol.symbolKind,
      componentId: symbol.componentId,
      filePath: symbol.filePath,
      startLine: symbol.startLine,
      endLine: symbol.endLine,
      bodySha256: symbol.bodySha256,
      sourcePath: symbol.sourcePath,
      sourceContentSha256: symbol.sourceContentSha256,
    })),
    prReadinessChecks: [
      {
        readinessId: prReadinessSnapshot.readiness.readinessId,
        sourcePath: prReadinessSnapshot.readiness.sourcePath,
        sourceContentSha256: prReadinessSnapshot.readiness.sourceContentSha256,
        effectiveArcLevel: prReadinessSnapshot.readiness.effectiveArcLevel,
        blocking: prReadinessSnapshot.readiness.blocking,
      },
    ],
    docDispositionDocuments: docsDispositionSnapshot.documents.map((document) => ({
      documentPath: document.documentPath,
      status: document.status,
      planningType: document.planningType,
      pendingMarkerCount: document.pendingMarkerCount,
      taskLikeReferenceCount: document.taskLikeReferenceCount,
      sourceContentSha256: document.sourceContentSha256,
    })),
    docDispositionMarkers: docsDispositionSnapshot.markers.map((marker) => ({
      markerId: marker.markerId,
      documentPath: marker.documentPath,
      markerKind: marker.markerKind,
      occurrenceCount: marker.occurrenceCount,
      sourceContentSha256: marker.sourceContentSha256,
    })),
    docTaskLikeReferences: docsDispositionSnapshot.references.map((reference) => ({
      referenceId: reference.referenceId,
      documentPath: reference.documentPath,
      referenceText: reference.referenceText,
      classification: reference.classification,
      occurrenceCount: reference.occurrenceCount,
      sourceContentSha256: reference.sourceContentSha256,
    })),
    knowledgeIntakeRepositoryReferences: knowledgeIntakeRepositoryReferenceSnapshot.references.map(
      (reference) => ({
        referenceId: reference.referenceId,
        targetDocumentPath: reference.targetDocumentPath,
        sourcePath: reference.sourcePath,
        relationType: reference.relationType,
        lineNumber: reference.lineNumber,
        sourceContentSha256: reference.sourceContentSha256,
      })
    ),
    docDispositionActions: docsDispositionSnapshot.actions.map((action) => ({
      actionId: action.actionId,
      priority: action.priority,
      actionKind: action.actionKind,
      documentPath: action.documentPath,
      referenceText: action.referenceText,
      reason: action.reason,
      blocking: action.blocking,
      sourceContentSha256: action.sourceContentSha256,
    })),
    riskDebtItems: governanceSnapshot.riskDebtItems.map((debt) => ({
      riskId: debt.riskId,
      sourcePath: debt.sourcePath,
      title: debt.title,
      status: debt.status,
      severity: debt.severity,
      probability: debt.probability,
      priority: debt.priority,
      componentUnit: debt.componentUnit,
      sourceContentSha256: debt.sourceContentSha256,
    })),
  };
}

async function readGovernanceAuxiliaryState(client) {
  const [
    repositoryCommands,
    commandQueryRails,
    prReadinessChecks,
    docDispositionDocuments,
    docDispositionMarkers,
    docTaskLikeReferences,
    knowledgeIntakeRepositoryReferences,
    docDispositionActions,
    riskDebtItems,
    frontendMechanicalTruthSurfaces,
    frontendComponents,
    codeSymbols,
  ] = await Promise.all([
    client.query(`
      select
        command_id as "commandId",
        command_text as "commandText",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.repository_commands
      order by command_id
    `),
    client.query(`
      select
        rail_id as "railId",
        feature_id as "featureId",
        rail_name as "railName",
        rail_type as "railType",
        ddd_owner as "dddOwner",
        rail_status as "railStatus",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.command_query_rails
      order by rail_id
    `),
    client.query(`
      select
        readiness_id as "readinessId",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256",
        effective_arc_level as "effectiveArcLevel",
        blocking
      from ${schemaName}.pr_readiness_checks
      order by readiness_id
    `),
    client.query(`
      select
        document_path as "documentPath",
        status,
        planning_type as "planningType",
        pending_marker_count::int as "pendingMarkerCount",
        task_like_reference_count::int as "taskLikeReferenceCount",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.doc_disposition_documents
      order by document_path
    `),
    client.query(`
      select
        marker_id as "markerId",
        document_path as "documentPath",
        marker_kind as "markerKind",
        occurrence_count::int as "occurrenceCount",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.doc_disposition_markers
      order by marker_id
    `),
    client.query(`
      select
        reference_id as "referenceId",
        document_path as "documentPath",
        reference_text as "referenceText",
        classification,
        occurrence_count::int as "occurrenceCount",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.doc_task_like_references
      order by reference_id
    `),
    client.query(`
      select
        reference_id as "referenceId",
        target_document_path as "targetDocumentPath",
        source_path as "sourcePath",
        relation_type as "relationType",
        line_number::int as "lineNumber",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.knowledge_intake_repository_references
      order by reference_id
    `),
    client.query(`
      select
        action_id as "actionId",
        priority,
        action_kind as "actionKind",
        document_path as "documentPath",
        reference_text as "referenceText",
        reason,
        blocking,
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.doc_disposition_actions
      order by action_id
    `),
    client.query(`
      select
        risk_id as "riskId",
        source_path as "sourcePath",
        title,
        status,
        severity,
        probability,
        priority,
        component_unit as "componentUnit",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.risk_debt_items
      order by risk_id
    `),
    client.query(`
      select
        surface_id as "surfaceId",
        surface_kind as "surfaceKind",
        route_path as "routePath",
        screen_state as "screenState",
        frontend_owner as "frontendOwner",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.frontend_mechanical_truth_surfaces
      order by surface_id
    `),
    client.query(`
      select
        component_id as "componentId",
        component_name as "componentName",
        component_kind as "componentKind",
        component_status as "componentStatus",
        reuse_decision as "reuseDecision",
        frontend_owner as "frontendOwner",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.frontend_components
      order by component_id
    `),
    client.query(`
      select
        symbol_id as "symbolId",
        symbol_name as "symbolName",
        symbol_kind as "symbolKind",
        component_id as "componentId",
        file_path as "filePath",
        start_line::int as "startLine",
        end_line::int as "endLine",
        body_sha256 as "bodySha256",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.code_symbols
      order by symbol_id
    `),
  ]);

  return {
    repositoryCommands: repositoryCommands.rows,
    commandQueryRails: commandQueryRails.rows,
    prReadinessChecks: prReadinessChecks.rows,
    docDispositionDocuments: docDispositionDocuments.rows,
    docDispositionMarkers: docDispositionMarkers.rows,
    docTaskLikeReferences: docTaskLikeReferences.rows,
    knowledgeIntakeRepositoryReferences: knowledgeIntakeRepositoryReferences.rows,
    docDispositionActions: docDispositionActions.rows,
    riskDebtItems: riskDebtItems.rows,
    frontendMechanicalTruthSurfaces: frontendMechanicalTruthSurfaces.rows,
    frontendComponents: frontendComponents.rows,
    codeSymbols: codeSymbols.rows,
  };
}

async function checkGovernanceAuxiliaryProjections(options = {}) {
  const expected =
    options.expected || (await buildGovernanceAuxiliaryExpectedState(options.expectedOptions));
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const actual = await readGovernanceAuxiliaryState(client);
    return compareGovernanceAuxiliaryState(expected, actual);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

function uniqueSourceHashRows(rows, options = {}) {
  const pathField = options.pathField || 'sourcePath';
  const hashField = options.hashField || 'sourceContentSha256';
  const normalizedRows = new Map();

  for (const row of rows || []) {
    const sourcePath = normalizeText(row[pathField]);
    if (!sourcePath) {
      continue;
    }

    normalizedRows.set(sourcePath, {
      sourcePath,
      sourceContentSha256: normalizeText(row[hashField]),
    });
  }

  return [...normalizedRows.values()].sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath)
  );
}

function documentSourceHashRows(documents) {
  return uniqueSourceHashRows(
    (documents || []).map((document) => {
      const raw = normalizeText(document.raw);
      return {
        sourcePath: toPosix(normalizeText(document.sourcePath)),
        sourceContentSha256: normalizeText(document.contentSha256) || sha256(raw),
      };
    })
  );
}

function isKnowledgeDocumentSourcePath(sourcePath) {
  const normalizedPath = toPosix(normalizeText(sourcePath));
  return (
    /^buzon\/.*\.md$/i.test(normalizedPath) ||
    /^docs\/planning\/proposals\/.*\.md$/i.test(normalizedPath) ||
    /^docs\/planning\/reviews\/.*\.md$/i.test(normalizedPath) ||
    /^docs\/adr\/.*\.md$/i.test(normalizedPath) ||
    /^docs\/evidence\/.*\.md$/i.test(normalizedPath) ||
    /^docs\/risk-register\/.*\.md$/i.test(normalizedPath)
  );
}

function knowledgeDocumentSourceHashRows(documents) {
  return documentSourceHashRows(
    normalizeArray(documents).filter((document) =>
      isKnowledgeDocumentSourcePath(document.sourcePath)
    )
  );
}

function compareGovernanceAuxiliarySourceState(expected, actual) {
  const sourceHashComparison = {
    compareFields: ['sourceContentSha256'],
    keyOf: (row) => row.sourcePath,
  };
  const sections = {
    repositoryCommandSources: compareImportRows(
      expected.repositoryCommandSources,
      actual.repositoryCommandSources,
      sourceHashComparison
    ),
    commandQueryRailSources: compareImportRows(
      expected.commandQueryRailSources,
      actual.commandQueryRailSources,
      sourceHashComparison
    ),
    codeSymbolSources: compareImportRows(
      expected.codeSymbolSources,
      actual.codeSymbolSources,
      sourceHashComparison
    ),
    docDispositionDocuments: compareImportRows(
      expected.docDispositionDocuments,
      actual.docDispositionDocuments,
      sourceHashComparison
    ),
    knowledgeDocuments: compareImportRows(
      expected.knowledgeDocuments,
      actual.knowledgeDocuments,
      sourceHashComparison
    ),
    knowledgeIntakeRepositoryReferenceSources: compareImportRows(
      expected.knowledgeIntakeRepositoryReferenceSources,
      actual.knowledgeIntakeRepositoryReferenceSources,
      sourceHashComparison
    ),
    riskDebtItems: compareImportRows(
      expected.riskDebtItems,
      actual.riskDebtItems,
      sourceHashComparison
    ),
    prReadinessChecks: compareImportRows(expected.prReadinessChecks, actual.prReadinessChecks, {
      keyOf: (row) => row.readinessId,
      compareFields: ['sourcePath', 'sourceContentSha256', 'effectiveArcLevel', 'blocking'],
    }),
  };
  const ok = Object.values(sections).every(
    (section) =>
      section.missing.length === 0 && section.unexpected.length === 0 && section.stale.length === 0
  );

  return { ok, sections };
}

function compareGovernanceSourceState(expected, actual) {
  const sections = {
    files: compareImportRows(expected.files, actual.files, {
      keyOf: (row) => row.path,
      compareFields: [
        'contentHash',
        'governanceHash',
        'stateFingerprint',
        'owningUnit',
        'componentUnit',
        'isDrift',
        'isLegacy',
      ],
    }),
    components: compareImportRows(expected.components, actual.components, {
      keyOf: (row) => row.componentId,
      compareFields: ['governanceState', 'isDrift', 'isLegacy', 'fileCount'],
    }),
    generatedReportSources: compareImportRows(
      expected.generatedReportSources,
      actual.generatedReportSources,
      {
        keyOf: (row) => row.sourcePath,
        compareFields: ['sourceContentSha256'],
      }
    ),
  };
  const ok = Object.values(sections).every(
    (section) =>
      section.missing.length === 0 && section.unexpected.length === 0 && section.stale.length === 0
  );

  return { ok, sections };
}

function generatedReportSourceHashRows(generatedInputs = buildGovernanceGeneratedInputs()) {
  return [generatedInputs.coverageReportSource, generatedInputs.remediationQueueSource]
    .filter(Boolean)
    .map((source) => ({
      sourcePath: source.sourcePath,
      sourceContentSha256: source.contentSha256,
    }))
    .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

function buildGovernanceSourceExpectedState(options = {}) {
  const fileComponentOutputs =
    options.fileComponentOutputs || buildGovernanceFileComponentOutputs();
  const generatedInputs =
    options.generatedInputs ||
    buildGovernanceGeneratedInputs({
      fileComponentOutputs,
      documentOutputs: options.documentOutputs,
    });
  const generatedFileComponentOutputs =
    generatedInputs.fileComponentOutputs || fileComponentOutputs;

  return {
    files: generatedFileComponentOutputs.fileEntries.map((file) => ({
      path: file.path,
      contentHash: file.contentHash,
      governanceHash: file.governanceHash,
      stateFingerprint: file.stateFingerprint,
      owningUnit: file.owningUnit,
      componentUnit: file.componentUnit,
      isDrift: file.isDrift,
      isLegacy: file.isLegacy,
    })),
    components: generatedFileComponentOutputs.componentIndexManifest.components.map(
      (component) => ({
        componentId: component.id,
        governanceState: component.governanceState,
        isDrift: component.isDrift,
        isLegacy: component.isLegacy,
        fileCount: component.fileCount,
      })
    ),
    generatedReportSources:
      options.generatedReportSources === undefined
        ? generatedReportSourceHashRows(generatedInputs)
        : options.generatedReportSources,
  };
}

async function buildGovernanceAuxiliarySourceExpectedState(options = {}) {
  const repositoryCommandSnapshot =
    options.repositoryCommandSnapshot || (await buildRepositoryCommandSnapshot());
  const commandQueryRailSnapshot =
    options.commandQueryRailSnapshot || buildCommandQueryRailSnapshot();
  const governanceSnapshot = options.governanceSnapshot || buildGovernanceFileSnapshot();
  const codeSymbolSnapshot =
    options.codeSymbolSnapshot || buildCodeSymbolSnapshot({ governanceSnapshot });
  const prReadinessSnapshot = options.prReadinessSnapshot || buildPrReadinessSnapshot();
  const markdownDocuments = options.markdownDocuments || listTrackedMarkdownDocuments();
  const knowledgeDocuments =
    options.knowledgeDocuments || listTrackedKnowledgeDocuments({ markdownDocuments });
  const knowledgeIntakeRepositoryReferenceSnapshot =
    options.knowledgeIntakeRepositoryReferenceSnapshot ||
    buildKnowledgeIntakeRepositoryReferenceSnapshot();

  return {
    repositoryCommandSources: uniqueSourceHashRows(repositoryCommandSnapshot.commands),
    commandQueryRailSources: uniqueSourceHashRows(commandQueryRailSnapshot.rails),
    codeSymbolSources: uniqueSourceHashRows(codeSymbolSnapshot.symbols, {
      pathField: 'sourcePath',
      hashField: 'sourceContentSha256',
    }),
    docDispositionDocuments: documentSourceHashRows(markdownDocuments),
    knowledgeDocuments: options.knowledgeSnapshotDocuments
      ? uniqueSourceHashRows(options.knowledgeSnapshotDocuments, {
          pathField: 'documentPath',
        })
      : knowledgeDocumentSourceHashRows(knowledgeDocuments),
    knowledgeIntakeRepositoryReferenceSources: uniqueSourceHashRows(
      knowledgeIntakeRepositoryReferenceSnapshot.references,
      {
        pathField: 'sourcePath',
      }
    ),
    riskDebtItems: documentSourceHashRows(options.riskDocuments || listTrackedRiskDocuments()),
    prReadinessChecks: [
      {
        readinessId: prReadinessSnapshot.readiness.readinessId,
        sourcePath: prReadinessSnapshot.readiness.sourcePath,
        sourceContentSha256: prReadinessSnapshot.readiness.sourceContentSha256,
        effectiveArcLevel: prReadinessSnapshot.readiness.effectiveArcLevel,
        blocking: prReadinessSnapshot.readiness.blocking,
      },
    ],
  };
}

async function readGovernanceSourceState(client) {
  const [files, components, generatedReportSources] = await Promise.all([
    client.query(`
      select
        path,
        content_hash as "contentHash",
        governance_hash as "governanceHash",
        state_fingerprint as "stateFingerprint",
        owning_unit as "owningUnit",
        component_unit as "componentUnit",
        is_drift as "isDrift",
        is_legacy as "isLegacy"
      from ${schemaName}.governance_files
      order by path
    `),
    client.query(`
      select
        component_id as "componentId",
        governance_state as "governanceState",
        is_drift as "isDrift",
        is_legacy as "isLegacy",
        file_count::int as "fileCount"
      from ${schemaName}.governance_components
      order by component_id
    `),
    client.query(`
      select
        source_path as "sourcePath",
        content_sha256 as "sourceContentSha256"
      from ${schemaName}.governance_sources
      where source_type in ('governance_coverage_report', 'governance_remediation_queue')
      order by source_path
    `),
  ]);

  return {
    files: files.rows,
    components: components.rows,
    generatedReportSources: generatedReportSources.rows,
  };
}

async function checkGovernanceSourceFreshness(options = {}) {
  const expected = options.expected || buildGovernanceSourceExpectedState(options.expectedOptions);
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const actual = options.actual || (await readGovernanceSourceState(client));
    return compareGovernanceSourceState(expected, actual);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function readGovernanceAuxiliarySourceState(client) {
  const [
    repositoryCommandSources,
    commandQueryRailSources,
    codeSymbolSources,
    prReadinessChecks,
    docDispositionDocuments,
    knowledgeDocuments,
    knowledgeIntakeRepositoryReferenceSources,
    riskDebtItems,
  ] = await Promise.all([
    client.query(`
      select distinct
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.repository_commands
      order by source_path
    `),
    client.query(`
      select distinct
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.command_query_rails
      order by source_path
    `),
    client.query(`
      select distinct
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.code_symbols
      order by source_path
    `),
    client.query(`
      select
        readiness_id as "readinessId",
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256",
        effective_arc_level as "effectiveArcLevel",
        blocking
      from ${schemaName}.pr_readiness_checks
      order by readiness_id
    `),
    client.query(`
      select
        document_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.doc_disposition_documents
      order by document_path
    `),
    client.query(`
      select
        document_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.knowledge_documents
      order by document_path
    `),
    client.query(`
      select distinct
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.knowledge_intake_repository_references
      order by source_path
    `),
    client.query(`
      select
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.risk_debt_items
      order by source_path
    `),
  ]);

  return {
    repositoryCommandSources: repositoryCommandSources.rows,
    commandQueryRailSources: commandQueryRailSources.rows,
    codeSymbolSources: codeSymbolSources.rows,
    prReadinessChecks: prReadinessChecks.rows,
    docDispositionDocuments: docDispositionDocuments.rows,
    knowledgeDocuments: knowledgeDocuments.rows,
    knowledgeIntakeRepositoryReferenceSources: knowledgeIntakeRepositoryReferenceSources.rows,
    riskDebtItems: riskDebtItems.rows,
  };
}

async function checkGovernanceAuxiliarySourceFreshness(options = {}) {
  const expected =
    options.expected ||
    (await buildGovernanceAuxiliarySourceExpectedState(options.expectedOptions));
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const actual = options.actual || (await readGovernanceAuxiliarySourceState(client));
    return compareGovernanceAuxiliarySourceState(expected, actual);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function isGovernanceFresh(options, deps) {
  try {
    const hasGovernanceDatabaseOverride = typeof deps.checkGovernanceDatabase === 'function';
    const shouldTryGovernanceSourceFreshness =
      typeof deps.checkGovernanceSourceFreshness === 'function' || !hasGovernanceDatabaseOverride;
    if (shouldTryGovernanceSourceFreshness) {
      const sourceFreshness = deps.checkGovernanceSourceFreshness || checkGovernanceSourceFreshness;
      const sourceFreshnessReport = await sourceFreshness({
        databaseUrl: options.databaseUrl,
      });
      if (!sourceFreshnessReport.ok) {
        return false;
      }
    } else {
      const checkGovernanceDatabase = deps.checkGovernanceDatabase;
      const report = await checkGovernanceDatabase({ databaseUrl: options.databaseUrl });
      if (!report.ok) {
        return false;
      }
    }

    const hasAuxiliaryProjectionOverride =
      typeof deps.checkGovernanceAuxiliaryProjections === 'function';
    const shouldTrySourceFreshness =
      typeof deps.checkGovernanceAuxiliarySourceFreshness === 'function' ||
      !hasAuxiliaryProjectionOverride;
    if (shouldTrySourceFreshness) {
      const checkAuxiliarySourceFreshness =
        deps.checkGovernanceAuxiliarySourceFreshness || checkGovernanceAuxiliarySourceFreshness;
      const sourceFreshnessReport = await checkAuxiliarySourceFreshness({
        databaseUrl: options.databaseUrl,
      });
      if (sourceFreshnessReport.ok) {
        return true;
      }
      return false;
    }

    const checkAuxiliary = hasAuxiliaryProjectionOverride
      ? deps.checkGovernanceAuxiliaryProjections
      : checkGovernanceAuxiliaryProjections;
    const auxiliaryReport = await checkAuxiliary({ databaseUrl: options.databaseUrl });
    return auxiliaryReport.ok;
  } catch {
    return false;
  }
}

async function runPlanningImport(options = {}, deps = {}) {
  const actualDeps = {
    importContent,
    logger: console,
    ...deps,
  };
  const skippedScopes = [];

  if (options.ifStale && (await isGovernanceFresh(options, actualDeps))) {
    skippedScopes.push('governance');
  }

  if (skippedScopes.length > 0) {
    actualDeps.logger.log(`[planning:db:import] skipped fresh scopes: ${skippedScopes.join(', ')}`);
  }

  const importedScopes = skippedScopes.length === 0 ? ['governance'] : [];

  if (importedScopes.length === 0) {
    return {
      governanceFiles: 0,
      governanceComponents: 0,
      governanceComponentFiles: 0,
      governanceFingerprints: 0,
      governanceCoverageRows: 0,
      governanceRemediationTasks: 0,
      riskDebtItems: 0,
      repositoryCommands: 0,
      commandQueryRails: 0,
      frontendMechanicalTruthSurfaces: 0,
      prReadinessChecks: 0,
      docsDispositionDocuments: 0,
      docsDispositionActions: 0,
      docsTaskLikeReferences: 0,
      knowledgeIntakeRepositoryReferences: 0,
      importedScopes,
      skippedScopes,
    };
  }

  const importOptions = {
    databaseUrl: options.databaseUrl,
  };
  if (options.silent === true) {
    importOptions.silent = true;
  }

  const result = await actualDeps.importContent(importOptions);

  return {
    ...result,
    importedScopes,
    skippedScopes,
  };
}

async function main() {
  const options = parseArgs();
  if (options.help) {
    printHelp();
    return;
  }

  await runPlanningImport(options);
}

module.exports = {
  beginImportTransaction,
  buildDocsDispositionSnapshot,
  buildGovernanceAuxiliaryExpectedState,
  buildGovernanceAuxiliarySourceExpectedState,
  buildCodeSymbolSnapshot,
  buildGovernanceFileSnapshot,
  buildGovernanceGeneratedInputs,
  buildGovernanceSourceExpectedState,
  buildCommandQueryRailSnapshot,
  buildFrontendComponentReflectionSnapshot,
  buildFrontendMechanicalTruthSnapshot,
  buildKnowledgeDocumentSnapshot,
  buildKnowledgeIntakeRepositoryReferenceSnapshot,
  buildPrReadinessSnapshot,
  buildRiskDebtSnapshot,
  buildRepositoryCommandSnapshot,
  checkGovernanceAuxiliarySourceFreshness,
  checkGovernanceAuxiliaryProjections,
  checkGovernanceSourceFreshness,
  clearGovernanceSnapshotTables,
  compareGovernanceAuxiliarySourceState,
  compareGovernanceAuxiliaryState,
  compareGovernanceSourceState,
  databaseUrl,
  evaluateArcPolicyReadiness,
  governanceImportDeleteTables,
  importContent,
  insertGovernanceSnapshot,
  insertCodeSymbolSnapshot,
  insertRows,
  insertDocsDispositionSnapshot,
  insertCommandQueryRailSnapshot,
  insertFrontendComponentReflectionSnapshot,
  insertFrontendMechanicalTruthSnapshot,
  insertKnowledgeSnapshot,
  insertKnowledgeIntakeRepositoryReferences,
  insertPrReadinessSnapshot,
  insertRepositoryCommandSnapshot,
  listChangedFiles,
  normalizeText,
  parseArgs,
  readTrackedDocumentPaths,
  readDbGovernanceSurfaceCatalog,
  readDbtProjectRoundtripCapabilityCatalog,
  readGovernanceSourceState,
  readGovernanceAuxiliarySourceState,
  readGovernanceAuxiliaryState,
  readYamlSource,
  refreshCodeSymbolMaterializedProjection,
  refreshComponentTreeMaterializedProjection,
  refreshComponentFileOwnershipMaterializedProjection,
  refreshComponentRuleEvaluationMaterializedProjection,
  restoreDbGovernanceSurfaceCatalog,
  restoreDbtProjectRoundtripCapabilityCatalog,
  runPlanningImport,
  sha256,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:import] ${error.message}`);
    process.exit(1);
  });
}
