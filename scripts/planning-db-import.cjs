const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const yaml = require('js-yaml');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const { runMigrations, schemaName } = require('./planning-db-migrate.cjs');

const repoRoot = path.resolve(__dirname, '..');
const laneDirectory = path.join(repoRoot, 'docs', 'planning', 'state');
const governanceFileIndexPath = path.join(
  repoRoot,
  'docs',
  'planning',
  'status',
  'system-governance-file-index.files.yaml'
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
      tasks.push({
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
      });
    }
  }

  return { sources, lanes, tasks };
}

function buildGovernanceFileSnapshot() {
  const indexSource = readYamlSource(governanceFileIndexPath);
  const index = indexSource.parsed;
  const sources = [
    {
      sourcePath: indexSource.sourcePath,
      sourceType: 'governance_file_index',
      contentSha256: indexSource.contentSha256,
      sourceBytes: indexSource.sourceBytes,
      metadata: {
        fileCount: index.fileCount,
        shardCount: Array.isArray(index.shards) ? index.shards.length : 0,
      },
    },
  ];
  const fileShards = [];
  const files = [];

  for (const shard of index.shards || []) {
    const shardSource = readYamlSource(path.join(repoRoot, shard.path));
    const shardDoc = shardSource.parsed;

    sources.push({
      sourcePath: shardSource.sourcePath,
      sourceType: 'governance_file_shard',
      contentSha256: shardSource.contentSha256,
      sourceBytes: shardSource.sourceBytes,
      metadata: {
        shardId: shardDoc.shardId,
        fileCount: shardDoc.fileCount,
      },
    });

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

  return { index, sources, fileShards, files };
}

async function insertPlanningSnapshot(client, snapshot) {
  await client.query(`delete from ${schemaName}.planning_sources`);

  for (const source of snapshot.sources) {
    await client.query(
      `insert into ${schemaName}.planning_sources
        (source_path, source_type, content_sha256, source_bytes, metadata)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [
        source.sourcePath,
        source.sourceType,
        source.contentSha256,
        source.sourceBytes,
        toJson(source.metadata),
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
        (source_path, source_type, content_sha256, source_bytes, metadata)
       values ($1, $2, $3, $4, $5::jsonb)`,
      [
        source.sourcePath,
        source.sourceType,
        source.contentSha256,
        source.sourceBytes,
        toJson(source.metadata),
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
}

async function importContent(options = {}) {
  const url = options.databaseUrl || databaseUrl();
  const silent = options.silent === true;
  const planningSnapshot = buildPlanningContentSnapshot();
  const governanceSnapshot = buildGovernanceFileSnapshot();
  const client = options.client || new Client({ connectionString: url });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    await runMigrations({ client, silent: true });
    await client.query('begin');
    await insertPlanningSnapshot(client, planningSnapshot);
    await insertGovernanceSnapshot(client, governanceSnapshot);
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
    lanes: planningSnapshot.lanes.length,
    tasks: planningSnapshot.tasks.length,
    governanceFiles: governanceSnapshot.files.length,
  };

  if (!silent) {
    console.log(
      `[planning:db:import] lanes=${result.lanes} tasks=${result.tasks} governanceFiles=${result.governanceFiles}`
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
  buildGovernanceFileSnapshot,
  buildPlanningContentSnapshot,
  databaseUrl,
  importContent,
  normalizeText,
  readYamlSource,
  sha256,
};
