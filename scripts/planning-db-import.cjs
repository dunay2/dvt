const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
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
const { runMigrations, schemaName } = require('./planning-db-migrate.cjs');

const repoRoot = path.resolve(__dirname, '..');
const laneDirectory = path.join(repoRoot, 'docs', 'planning', 'state');
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
  'governance_component_files',
  'governance_component_file_shards',
  'governance_fingerprints',
  'governance_files',
  'governance_file_shards',
  'governance_components',
  'governance_coverage',
  'governance_remediation',
  'governance_sources',
];

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    databaseUrl: null,
    help: false,
    ifStale: false,
    includePlanning: true,
    includeGovernance: true,
  };
  let planningOnly = false;
  let governanceOnly = false;

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

    if (token === '--planning-only') {
      planningOnly = true;
      continue;
    }

    if (token === '--governance-only') {
      governanceOnly = true;
      continue;
    }

    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown planning DB import option "${token}".`);
  }

  if (planningOnly && governanceOnly) {
    throw new Error('--planning-only and --governance-only are mutually exclusive.');
  }

  if (planningOnly) {
    options.includePlanning = true;
    options.includeGovernance = false;
  }

  if (governanceOnly) {
    options.includePlanning = false;
    options.includeGovernance = true;
  }

  return options;
}

function printHelp() {
  console.log(
    [
      'Usage: pnpm planning:db:import [--if-stale] [--planning-only|--governance-only] [--database-url <url>]',
      '',
      '--if-stale       Skip selected scopes that already match the imported DB state.',
      '--planning-only  Import or check only planning lane/task bootstrap rows.',
      '--governance-only Import or check only governance/query projection rows.',
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
  return crypto.createHash('sha256').update(value).digest('hex');
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

function buildGeneratedYamlSource(sourcePath, parsed) {
  const absolutePath = path.join(repoRoot, sourcePath);
  const hasExistingGeneratedSource = fs.existsSync(absolutePath);
  const raw = renderYamlSourcePayload(parsed);
  const rawSourceText = hasExistingGeneratedSource ? fs.readFileSync(absolutePath, 'utf8') : raw;
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

function readGeneratedYamlSourceOrBuild(sourcePath, parsed) {
  const absolutePath = path.join(repoRoot, sourcePath);
  if (!fs.existsSync(absolutePath)) {
    return buildGeneratedYamlSource(sourcePath, parsed);
  }

  return {
    ...readYamlSource(absolutePath),
    sourceMode: 'generated-artifact',
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

function normalizeDate(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return String(value).slice(0, 10);
}

function normalizeDependencyTokens(value) {
  const text = normalizeText(value).trim();
  if (!text || text.toLowerCase() === 'none') {
    return [];
  }

  return text
    .split(/,|\band\b/i)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => ({
      dependencyTaskId: entry.split(/\s+/)[0] || null,
      dependencyText: entry,
    }))
    .filter((entry) => entry.dependencyTaskId && entry.dependencyTaskId.toLowerCase() !== 'none');
}

function buildTaskDependencyRows(task, sourceKind) {
  return normalizeDependencyTokens(task.dependency).map((dependency, index) => ({
    laneId: task.laneId,
    taskId: task.taskId,
    dependencyOrder: index + 1,
    dependencyTaskId: dependency.dependencyTaskId,
    dependencyText: dependency.dependencyText,
    sourceKind,
    sourcePath: task.sourcePath,
    sourceContentSha256: task.sourceContentSha256,
  }));
}

function buildTaskEvidenceRows(task, sourceKind) {
  return normalizeArray(task.evidenceRefs).map((evidenceRef, index) => ({
    laneId: task.laneId,
    taskId: task.taskId,
    evidenceOrder: index + 1,
    evidenceRef: normalizeText(evidenceRef),
    sourceKind,
    sourcePath: task.sourcePath,
    sourceContentSha256: task.sourceContentSha256,
  }));
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

function planningLaneFiles() {
  return fs
    .readdirSync(laneDirectory)
    .filter((fileName) => /^agent-lane-[a-z]\.yaml$/i.test(fileName))
    .sort()
    .map((fileName) => path.join(laneDirectory, fileName));
}

function buildPlanningContentSnapshot() {
  const sources = [];
  const lanes = [];
  const tasks = [];
  const dependencies = [];
  const evidenceRefs = [];

  for (const laneFile of planningLaneFiles()) {
    const source = readYamlSource(laneFile);
    const lane = source.parsed;
    const laneTasks = Array.isArray(lane.tasks) ? lane.tasks : [];

    sources.push({
      sourcePath: source.sourcePath,
      sourceType: 'planning_lane',
      contentSha256: source.contentSha256,
      sourceBytes: source.sourceBytes,
      metadata: {
        laneId: normalizeText(lane.lane_id),
        taskCount: laneTasks.length,
      },
      rawSource: lane,
      rawSourceText: source.rawSourceText,
    });

    lanes.push({
      laneId: normalizeText(lane.lane_id),
      sourcePath: source.sourcePath,
      title: normalizeText(lane.title),
      owner: normalizeText(lane.owner),
      status: normalizeText(lane.status),
      lastReviewed: normalizeDate(lane.last_reviewed),
      goal: normalizeText(lane.goal),
      expectedOutcome: normalizeArray(lane.expected_outcome),
      headerMarkdown: normalizeText(lane.header_markdown),
      sourceContentSha256: source.contentSha256,
      rawLane: lane,
    });

    for (const task of laneTasks) {
      const row = {
        laneId: normalizeText(lane.lane_id),
        taskId: normalizeText(task.task_id),
        parentTaskId: task.parent_task === undefined ? null : normalizeText(task.parent_task),
        priority: task.priority === undefined ? null : normalizeText(task.priority),
        status: normalizeText(task.status),
        objective: normalizeText(task.objective),
        dependency: task.dependency === undefined ? null : normalizeText(task.dependency),
        target: task.target === undefined ? null : normalizeText(task.target),
        complexity: task.complexity === undefined ? null : normalizeText(task.complexity),
        effortPoints: normalizeNumber(task.effort_points),
        progressPct: normalizeNumber(task.progress_pct),
        evidenceRefs: normalizeArray(task.evidence_refs),
        statusReason: task.status_reason === undefined ? null : normalizeText(task.status_reason),
        lastVerified: normalizeDate(task.last_verified),
        sourcePath: source.sourcePath,
        sourceContentSha256: source.contentSha256,
        rawTask: task,
      };
      tasks.push(row);

      for (const dependency of buildTaskDependencyRows(row, 'planning_task')) {
        dependencies.push(dependency);
      }

      for (const evidenceRef of buildTaskEvidenceRows(row, 'planning_task')) {
        evidenceRefs.push(evidenceRef);
      }
    }
  }

  return { sources, lanes, tasks, dependencies, evidenceRefs };
}

function buildGovernanceGeneratedInputs() {
  const fileComponentOutputs = buildGovernanceFileComponentOutputs();
  const documentOutputs = buildDocumentUnitOutputs();
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
    coverageReportSource: readGeneratedYamlSourceOrBuild(
      repoRelative(governanceCoverageReportPath),
      coverageReport
    ),
    remediationQueueSource: readGeneratedYamlSourceOrBuild(
      repoRelative(governanceRemediationQueuePath),
      remediationQueue
    ),
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

function buildGovernanceFileSnapshot() {
  const generatedInputs = buildGovernanceGeneratedInputs();
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

function listChangedFiles(baseRef, headRef) {
  const output = execFileSync('git', ['diff', '--name-only', `${baseRef}...${headRef}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return output
    .split('\n')
    .map((value) => normalizeText(value).trim())
    .filter(Boolean)
    .map(toPosix);
}

function listTrackedMarkdownDocuments() {
  const output = execFileSync('git', ['ls-files', '--', 'docs/*.md', 'docs/**/*.md'], {
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
    ),
  ]
    .sort()
    .map((sourcePath) => ({
      sourcePath,
      raw: fs.readFileSync(path.join(repoRoot, sourcePath), 'utf8'),
    }));
}

function parseMarkdownFrontmatter(raw) {
  const text = normalizeText(raw);
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
  /\b(?:ADR-\d{4}|ED-\d{8}-[A-Za-z0-9][A-Za-z0-9-]*|R-\d{8}-[A-Za-z0-9][A-Za-z0-9-]*|US-\d+[A-Za-z0-9-]*|[A-Z][A-Z0-9]{1,12}(?:-[A-Z0-9][A-Z0-9]{0,24})+)\b/g;

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

function classifyTaskLikeReference(referenceText, planningTaskIdSet) {
  const value = normalizeText(referenceText);
  const upperValue = value.toUpperCase();

  if (planningTaskIdSet.has(value) || planningTaskIdSet.has(upperValue)) {
    return { classification: 'registered_planning_task', registeredPlanningTask: true };
  }
  if (/^ADR-\d{4}$/.test(upperValue)) {
    return { classification: 'adr_id', registeredPlanningTask: false };
  }
  if (/^ARC-\d+$/.test(upperValue)) {
    return { classification: 'arc_level', registeredPlanningTask: false };
  }
  if (/^ED-\d{8}-/.test(upperValue)) {
    return { classification: 'evidence_id', registeredPlanningTask: false };
  }
  if (/^R-\d{8}-/.test(upperValue)) {
    return { classification: 'risk_id', registeredPlanningTask: false };
  }
  if (/^US-/.test(upperValue)) {
    return { classification: 'user_story', registeredPlanningTask: false };
  }
  if (/^(?:G\d+|F\d{2}|S\d{2})-/.test(upperValue)) {
    return { classification: 'historical_gap', registeredPlanningTask: false };
  }
  if (/^SHA-\d+$/.test(upperValue)) {
    return { classification: 'algorithm_reference', registeredPlanningTask: false };
  }
  if (/^(?:GAP|MVP|RESIDUAL|RISK|LEGACY|INV)-/.test(upperValue) || /^F-\d{2}/.test(upperValue)) {
    return { classification: 'historical_planning_reference', registeredPlanningTask: false };
  }
  if (/^SYS-/.test(upperValue)) {
    return { classification: 'governance_unit_reference', registeredPlanningTask: false };
  }
  if (/^CMD-/.test(upperValue)) {
    return { classification: 'command_reference', registeredPlanningTask: false };
  }
  if (/^PS-[CQ]\d+/.test(upperValue)) {
    return { classification: 'plan_store_matrix_reference', registeredPlanningTask: false };
  }

  return { classification: 'unknown_task_like_id', registeredPlanningTask: false };
}

function extractTaskLikeReferences(document, planningTaskIdSet) {
  const raw = normalizeText(document.raw);
  const grouped = new Map();

  function addReference(referenceText, occurrenceCount = 1) {
    const entry = grouped.get(referenceText) || {
      referenceText,
      occurrenceCount: 0,
    };
    entry.occurrenceCount += occurrenceCount;
    grouped.set(referenceText, entry);
  }

  for (const referenceText of raw.match(taskLikeReferencePattern) || []) {
    addReference(referenceText);
  }

  const planningTaskIds = [...new Set([...planningTaskIdSet].map((taskId) => taskId.toUpperCase()))]
    .filter(Boolean)
    .sort();
  for (const taskId of planningTaskIds) {
    const alreadyCaptured = [...grouped.keys()].some(
      (referenceText) => referenceText.toUpperCase() === taskId
    );
    if (alreadyCaptured) {
      continue;
    }

    const taskPattern = new RegExp(
      `(?<![A-Za-z0-9-])${escapeRegExp(taskId)}(?![A-Za-z0-9-])`,
      'gi'
    );
    const taskMatches = raw.match(taskPattern) || [];
    if (taskMatches.length === 0) {
      continue;
    }
    addReference(taskMatches[0], taskMatches.length);
  }

  return [...grouped.values()]
    .sort((left, right) => left.referenceText.localeCompare(right.referenceText))
    .map((entry) => {
      const classification = classifyTaskLikeReference(entry.referenceText, planningTaskIdSet);
      const escapedReference = escapeRegExp(entry.referenceText);
      const { sampleLines } = lineNumbersForPattern(
        raw,
        new RegExp(`\\b${escapedReference}\\b`, 'g')
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
        registeredPlanningTask: classification.registeredPlanningTask,
        occurrenceCount: entry.occurrenceCount,
        sampleLines,
        sourceContentSha256: document.contentSha256,
        rawReference: {
          referenceText: entry.referenceText,
          referencePrefix: referencePrefix(entry.referenceText),
          classification: classification.classification,
          occurrenceCount: entry.occurrenceCount,
          sampleLines,
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
      reason:
        'Task-like reference is not registered in planning lanes or a known governance ID family.',
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
  const planningTaskIdSet = new Set(
    normalizeArray(options.planningTaskIds).flatMap((taskId) => {
      const normalized = normalizeText(taskId);
      return [normalized, normalized.toUpperCase()];
    })
  );
  const sourceDocuments = normalizeArray(options.documents).length
    ? normalizeArray(options.documents)
    : listTrackedMarkdownDocuments();
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
    const contentSha256 = sha256(raw);
    const { frontmatter } = parseMarkdownFrontmatter(raw);
    const isArchive = isArchivedDocumentPath(sourcePath);
    const documentInput = { sourcePath, raw, contentSha256 };
    const documentMarkers = buildPendingMarkerRows(documentInput);
    const documentReferences = extractTaskLikeReferences(documentInput, planningTaskIdSet);
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

async function insertPlanningSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.planning_sources`);

  for (const source of snapshot.sources) {
    await client.query(
      `insert into ${schemaName}.planning_sources
        (source_path, source_type, content_sha256, source_bytes, metadata, raw_source, raw_source_text, source_authority)
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
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

  for (const lane of snapshot.lanes) {
    await client.query(
      `insert into ${schemaName}.planning_lanes
        (lane_id, source_path, title, owner, status, last_reviewed, goal,
         expected_outcome, header_markdown, source_content_sha256, raw_lane)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11::jsonb)`,
      [
        lane.laneId,
        lane.sourcePath,
        lane.title,
        lane.owner,
        lane.status,
        lane.lastReviewed,
        lane.goal,
        toJson(lane.expectedOutcome),
        lane.headerMarkdown,
        lane.sourceContentSha256,
        toJson(lane.rawLane),
      ]
    );
  }

  for (const task of snapshot.tasks) {
    await client.query(
      `insert into ${schemaName}.planning_tasks
        (lane_id, task_id, parent_task_id, priority, status, objective, dependency, target,
         complexity, effort_points, progress_pct, evidence_refs, status_reason, last_verified,
         source_path, source_content_sha256, raw_task)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17::jsonb)`,
      [
        task.laneId,
        task.taskId,
        task.parentTaskId,
        task.priority,
        task.status,
        task.objective,
        task.dependency,
        task.target,
        task.complexity,
        task.effortPoints,
        task.progressPct,
        toJson(task.evidenceRefs),
        task.statusReason,
        task.lastVerified,
        task.sourcePath,
        task.sourceContentSha256,
        toJson(task.rawTask),
      ]
    );
  }
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
       values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
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
       values ($1, $2, $3, $4, $5, $6::jsonb)`,
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

  for (const file of snapshot.files) {
    await client.query(
      `insert into ${schemaName}.governance_files
        (path, file_id, shard_id, source_path, path_hash, content_hash, governance_hash,
         state_fingerprint, owning_unit, root_unit, domain_unit, component_unit, owner_level,
         unit_status, governance_state, canonical_role, evidence_state, is_drift, is_legacy,
         ddd_owner, cq_rails, governance_refs, source_content_sha256, raw_file)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21, $22::jsonb, $23, $24::jsonb)`,
      [
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
      ]
    );
  }

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

  for (const file of snapshot.componentFiles) {
    await client.query(
      `insert into ${schemaName}.governance_component_files
        (component_id, path, file_id, owning_unit, unit_status, governance_state,
         is_drift, is_legacy, source_path, source_content_sha256, raw_component_file)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)`,
      [
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
  }

  for (const fingerprint of snapshot.fingerprints) {
    await client.query(
      `insert into ${schemaName}.governance_fingerprints
        (path, file_id, source_path, content_hash, governance_hash, state_fingerprint,
         root_unit, domain_unit, component_unit, owning_unit, source_content_sha256,
         raw_fingerprint)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
      [
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
  }

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
}

async function insertRepositoryCommandSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.repository_commands`);

  for (const command of snapshot.commands) {
    await client.query(
      `insert into ${schemaName}.repository_commands
        (command_id, command_type, command_name, command_path, command_text, domain, sensitivity,
         runtime_fanout, changed_file_validation_relevant, referenced_files, source_path,
         source_content_sha256, raw_command)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13::jsonb)`,
      [
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

  for (const document of snapshot.documents) {
    await client.query(
      `insert into ${schemaName}.doc_disposition_documents
        (document_path, title, status, planning_type, owner, is_active, is_archive,
         pending_marker_count, task_like_reference_count, source_content_sha256,
         raw_frontmatter, raw_document)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)`,
      [
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
  }

  for (const marker of snapshot.markers) {
    await client.query(
      `insert into ${schemaName}.doc_disposition_markers
        (marker_id, document_path, marker_kind, occurrence_count, sample_lines,
         source_content_sha256, raw_marker)
       values ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb)`,
      [
        marker.markerId,
        marker.documentPath,
        marker.markerKind,
        marker.occurrenceCount,
        toJson(marker.sampleLines),
        marker.sourceContentSha256,
        toJson(marker.rawMarker),
      ]
    );
  }

  for (const reference of snapshot.references) {
    await client.query(
      `insert into ${schemaName}.doc_task_like_references
        (reference_id, document_path, reference_text, reference_prefix, classification,
         registered_planning_task, occurrence_count, sample_lines, source_content_sha256,
         raw_reference)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)`,
      [
        reference.referenceId,
        reference.documentPath,
        reference.referenceText,
        reference.referencePrefix,
        reference.classification,
        reference.registeredPlanningTask,
        reference.occurrenceCount,
        toJson(reference.sampleLines),
        reference.sourceContentSha256,
        toJson(reference.rawReference),
      ]
    );
  }

  for (const action of snapshot.actions) {
    await client.query(
      `insert into ${schemaName}.doc_disposition_actions
        (action_id, priority, action_kind, document_path, reference_text, reason, blocking,
         evidence, source_content_sha256, raw_action)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)`,
      [
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
  const includePlanning = options.includePlanning !== false;
  const includeGovernance = options.includeGovernance !== false;
  const planningSnapshot = includePlanning ? buildPlanningContentSnapshot() : null;
  const governanceSnapshot = includeGovernance ? buildGovernanceFileSnapshot() : null;
  const repositoryCommandSnapshot = includeGovernance
    ? await buildRepositoryCommandSnapshot()
    : null;
  const prReadinessSnapshot = includeGovernance ? buildPrReadinessSnapshot() : null;
  const docsDispositionPlanningSnapshot =
    includeGovernance && !planningSnapshot ? buildPlanningContentSnapshot() : planningSnapshot;
  const docsDispositionSnapshot = includeGovernance
    ? buildDocsDispositionSnapshot({
        planningTaskIds: (docsDispositionPlanningSnapshot?.tasks || []).map((task) => task.taskId),
      })
    : null;
  const client = options.client || new Client({ connectionString: url });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await beginImportTransaction(client);
    if (includePlanning) {
      await insertPlanningSnapshot(client, planningSnapshot);
    }
    if (includeGovernance) {
      await insertGovernanceSnapshot(client, governanceSnapshot);
      await insertRepositoryCommandSnapshot(client, repositoryCommandSnapshot);
      await insertPrReadinessSnapshot(client, prReadinessSnapshot);
      await insertDocsDispositionSnapshot(client, docsDispositionSnapshot);
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

  const result = {
    lanes: planningSnapshot?.lanes.length ?? 0,
    tasks: planningSnapshot?.tasks.length ?? 0,
    governanceFiles: governanceSnapshot?.files.length ?? 0,
    governanceComponents: governanceSnapshot?.components.length ?? 0,
    governanceComponentFiles: governanceSnapshot?.componentFiles.length ?? 0,
    governanceFingerprints: governanceSnapshot?.fingerprints.length ?? 0,
    governanceCoverageRows: governanceSnapshot?.coverageRows.length ?? 0,
    governanceRemediationTasks: governanceSnapshot?.remediationTasks.length ?? 0,
    repositoryCommands: repositoryCommandSnapshot?.commands.length ?? 0,
    prReadinessChecks: prReadinessSnapshot ? 1 : 0,
    docsDispositionDocuments: docsDispositionSnapshot?.documents.length ?? 0,
    docsDispositionActions: docsDispositionSnapshot?.actions.length ?? 0,
    docsTaskLikeReferences: docsDispositionSnapshot?.references.length ?? 0,
  };

  if (!silent) {
    const message = [
      `[planning:db:import] lanes=${result.lanes}`,
      `tasks=${result.tasks}`,
      `governanceFiles=${result.governanceFiles}`,
      `governanceComponents=${result.governanceComponents}`,
      `governanceRemediationTasks=${result.governanceRemediationTasks}`,
      `repositoryCommands=${result.repositoryCommands}`,
      `prReadinessChecks=${result.prReadinessChecks}`,
      `docsDispositionActions=${result.docsDispositionActions}`,
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
          'registeredPlanningTask',
          'occurrenceCount',
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
  const prReadinessSnapshot = options.prReadinessSnapshot || buildPrReadinessSnapshot();
  const planningSnapshot = options.planningSnapshot || buildPlanningContentSnapshot();
  const docsDispositionSnapshot =
    options.docsDispositionSnapshot ||
    buildDocsDispositionSnapshot({
      planningTaskIds: planningSnapshot.tasks.map((task) => task.taskId),
    });

  return {
    repositoryCommands: repositoryCommandSnapshot.commands.map((command) => ({
      commandId: command.commandId,
      commandText: command.commandText,
      sourcePath: command.sourcePath,
      sourceContentSha256: command.sourceContentSha256,
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
      registeredPlanningTask: reference.registeredPlanningTask,
      occurrenceCount: reference.occurrenceCount,
      sourceContentSha256: reference.sourceContentSha256,
    })),
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
  };
}

async function readGovernanceAuxiliaryState(client) {
  const [
    repositoryCommands,
    prReadinessChecks,
    docDispositionDocuments,
    docDispositionMarkers,
    docTaskLikeReferences,
    docDispositionActions,
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
        registered_planning_task as "registeredPlanningTask",
        occurrence_count::int as "occurrenceCount",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.doc_task_like_references
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
  ]);

  return {
    repositoryCommands: repositoryCommands.rows,
    prReadinessChecks: prReadinessChecks.rows,
    docDispositionDocuments: docDispositionDocuments.rows,
    docDispositionMarkers: docDispositionMarkers.rows,
    docTaskLikeReferences: docTaskLikeReferences.rows,
    docDispositionActions: docDispositionActions.rows,
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

async function isScopeFresh(scope, options, deps) {
  try {
    if (scope === 'planning') {
      const checkPlanningDatabase =
        deps.checkPlanningDatabase || require('./planning-db-check.cjs').checkPlanningDatabase;
      const report = await checkPlanningDatabase({ databaseUrl: options.databaseUrl });
      return report.ok;
    }

    if (scope === 'governance') {
      const checkGovernanceDatabase =
        deps.checkGovernanceDatabase ||
        require('./governance-db-check.cjs').checkGovernanceDatabase;
      const report = await checkGovernanceDatabase({ databaseUrl: options.databaseUrl });
      if (!report.ok) {
        return false;
      }

      const checkAuxiliary =
        deps.checkGovernanceAuxiliaryProjections || checkGovernanceAuxiliaryProjections;
      const auxiliaryReport = await checkAuxiliary({ databaseUrl: options.databaseUrl });
      return auxiliaryReport.ok;
    }
  } catch {
    return false;
  }

  throw new Error(`Unknown import scope "${scope}".`);
}

async function runPlanningImport(options = {}, deps = {}) {
  const actualDeps = {
    importContent,
    logger: console,
    ...deps,
  };
  const selected = {
    planning: options.includePlanning !== false,
    governance: options.includeGovernance !== false,
  };
  const skippedScopes = [];

  if (options.ifStale) {
    for (const scope of ['planning', 'governance']) {
      if (!selected[scope]) {
        continue;
      }

      if (await isScopeFresh(scope, options, actualDeps)) {
        selected[scope] = false;
        skippedScopes.push(scope);
      }
    }
  }

  if (skippedScopes.length > 0) {
    actualDeps.logger.log(`[planning:db:import] skipped fresh scopes: ${skippedScopes.join(', ')}`);
  }

  const importedScopes = Object.entries(selected)
    .filter(([, enabled]) => enabled)
    .map(([scope]) => scope);

  if (importedScopes.length === 0) {
    return {
      lanes: 0,
      tasks: 0,
      governanceFiles: 0,
      governanceComponents: 0,
      governanceComponentFiles: 0,
      governanceFingerprints: 0,
      governanceCoverageRows: 0,
      governanceRemediationTasks: 0,
      repositoryCommands: 0,
      prReadinessChecks: 0,
      docsDispositionDocuments: 0,
      docsDispositionActions: 0,
      docsTaskLikeReferences: 0,
      importedScopes,
      skippedScopes,
    };
  }

  const result = await actualDeps.importContent({
    databaseUrl: options.databaseUrl,
    includePlanning: selected.planning,
    includeGovernance: selected.governance,
  });

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
  buildGovernanceFileSnapshot,
  buildPlanningContentSnapshot,
  buildPrReadinessSnapshot,
  buildRepositoryCommandSnapshot,
  checkGovernanceAuxiliaryProjections,
  clearGovernanceSnapshotTables,
  compareGovernanceAuxiliaryState,
  databaseUrl,
  evaluateArcPolicyReadiness,
  governanceImportDeleteTables,
  importContent,
  insertDocsDispositionSnapshot,
  insertPrReadinessSnapshot,
  insertRepositoryCommandSnapshot,
  normalizeText,
  parseArgs,
  readGovernanceAuxiliaryState,
  readYamlSource,
  runPlanningImport,
  sha256,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:import] ${error.message}`);
    process.exit(1);
  });
}
