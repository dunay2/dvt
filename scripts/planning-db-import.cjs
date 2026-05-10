const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const yaml = require('js-yaml');

const { governanceGeneratedPath } = require('./governance-generated-paths.cjs');
const { buildFingerprintBaseline } = require('./check-governance-file-fingerprint-baseline.cjs');
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

function databaseUrl() {
  return process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl;
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
      fingerprintBaseline
    ),
    coverageReportSource: buildGeneratedYamlSource(
      repoRelative(governanceCoverageReportPath),
      coverageReport
    ),
    remediationQueueSource: buildGeneratedYamlSource(
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
    inMemorySourceMetadata({
      totals: coverageReport.totals || {},
    })
  );
  addGovernanceSource(
    sources,
    remediationQueueSource,
    'governance_remediation_queue',
    inMemorySourceMetadata({
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

  for (const fingerprint of fingerprintBaseline.files || []) {
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

async function insertGovernanceSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.governance_sources`);

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
  };

  if (!silent) {
    console.log(
      `[planning:db:import] lanes=${result.lanes} tasks=${result.tasks} governanceFiles=${result.governanceFiles} governanceComponents=${result.governanceComponents} governanceRemediationTasks=${result.governanceRemediationTasks}`
    );
  }

  return result;
}

async function main() {
  await importContent();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:import] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  beginImportTransaction,
  buildGovernanceFileSnapshot,
  buildPlanningContentSnapshot,
  databaseUrl,
  importContent,
  normalizeText,
  readYamlSource,
  sha256,
};
