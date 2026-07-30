#!/usr/bin/env node

'use strict';

const dependencies = (() => {
  const path = require('node:path');

  return {
    childProcess: require('node:child_process'),
    crypto: require('node:crypto'),
    fs: require('node:fs'),
    os: require('node:os'),
    path,
    yaml: require('js-yaml'),
    Client: require('pg').Client,
    defaultPgUrl: require('./planning-db-run.cjs').defaultPgUrl,
    schemaName: require('./planning-db-migrate.cjs').schemaName,
    repoRoot: path.resolve(__dirname, '..'),
  };
})();

const exportedArtifactPaths = [
  'docs/planning/state/execution-workboard.md',
  'docs/planning/state/open-task-route.md',
];
const canonicalStateArtifactPath = 'tools/planning-db/state/canonical-state.json';
const planningLaneFilePattern = /^agent-lane-[a-z]\.yaml$/iu;

class PlanningDbExportRunner {
  constructor(deps = dependencies) {
    this.deps = deps;
  }

  databaseUrl(value) {
    return (
      value || process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || this.deps.defaultPgUrl
    );
  }

  parseArgs(argv) {
    const options = {
      check: false,
      outputRoot: null,
    };

    for (let index = 0; index < argv.length; index += 1) {
      const token = argv[index];

      if (token === '--check') {
        options.check = true;
        continue;
      }

      if (token === '--output-root') {
        const next = argv[index + 1];
        if (!next) {
          throw new Error('Missing value for --output-root');
        }
        options.outputRoot = this.deps.path.resolve(this.deps.repoRoot, next);
        index += 1;
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

      if (token === '--help' || token === '-h') {
        options.help = true;
        continue;
      }

      throw new Error(`Unknown planning DB export option "${token}".`);
    }

    options.outputRoot =
      options.outputRoot ||
      this.deps.path.join(this.deps.repoRoot, '.generated-docs', 'planning-db-export');

    return options;
  }

  printHelp() {
    console.log('Usage: pnpm planning:db:export [--check] [--output-root <path>]');
  }

  cloneJson(value) {
    if (value === undefined || value === null) {
      return null;
    }

    return JSON.parse(JSON.stringify(value));
  }

  applyEffectiveTaskFields(task, row) {
    if (row.status !== undefined && row.status !== null) {
      task.status = row.status;
    }

    if (row.progressPct !== undefined && row.progressPct !== null) {
      task.progress_pct = Number(row.progressPct);
    }

    if (row.evidenceRefs !== undefined && row.evidenceRefs !== null) {
      task.evidence_refs = this.cloneJson(row.evidenceRefs);
    }

    if (row.statusReason !== undefined) {
      if (row.statusReason === null) {
        delete task.status_reason;
      } else {
        task.status_reason = row.statusReason;
      }
    }
  }

  readVersionedLaneDocument(row) {
    const sourcePath = String(row.sourcePath || '').trim();
    if (!sourcePath) {
      return null;
    }

    const absolutePath = this.deps.path.resolve(this.deps.repoRoot, sourcePath);
    const relativePath = this.deps.path.relative(this.deps.repoRoot, absolutePath);
    if (
      relativePath.startsWith('..') ||
      this.deps.path.isAbsolute(relativePath) ||
      !this.deps.fs.existsSync(absolutePath)
    ) {
      return null;
    }

    const parsed = this.deps.yaml.load(this.deps.fs.readFileSync(absolutePath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  }

  buildLaneDocuments(rows) {
    const laneById = new Map();
    const taskOrderByLaneId = new Map();
    const sourceTaskByLaneId = new Map();
    const lanes = [...(rows.lanes || [])].sort((left, right) =>
      String(left.laneId).localeCompare(String(right.laneId))
    );

    for (const row of lanes) {
      const lane = this.cloneJson(this.readVersionedLaneDocument(row) || row.rawLane);
      if (!lane || typeof lane !== 'object' || Array.isArray(lane)) {
        throw new Error(`Lane ${row.laneId} has no raw lane document.`);
      }

      const originalTasks = Array.isArray(lane.tasks) ? lane.tasks : [];
      const taskOrder = new Map();
      const sourceTasks = new Map();
      for (const [index, task] of originalTasks.entries()) {
        const taskId = task && typeof task === 'object' ? task.task_id : null;
        if (taskId && !taskOrder.has(taskId)) {
          taskOrder.set(String(taskId), index);
          sourceTasks.set(String(taskId), task);
        }
      }

      lane.lane_id = lane.lane_id || row.laneId;
      lane.tasks = [];
      laneById.set(row.laneId, lane);
      taskOrderByLaneId.set(row.laneId, taskOrder);
      sourceTaskByLaneId.set(row.laneId, sourceTasks);
    }

    const tasks = [...(rows.tasks || [])].sort((left, right) => {
      const laneComparison = String(left.laneId).localeCompare(String(right.laneId));
      if (laneComparison !== 0) {
        return laneComparison;
      }

      const leftOrder =
        taskOrderByLaneId.get(left.laneId)?.get(String(left.taskId)) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder =
        taskOrderByLaneId.get(right.laneId)?.get(String(right.taskId)) ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return String(left.taskId).localeCompare(String(right.taskId));
    });

    for (const row of tasks) {
      const lane = laneById.get(row.laneId);
      if (!lane) {
        throw new Error(`Task ${row.taskId} references missing lane ${row.laneId}.`);
      }

      const task = this.cloneJson(
        sourceTaskByLaneId.get(row.laneId)?.get(String(row.taskId)) || row.rawTask
      );
      if (!task || typeof task !== 'object' || Array.isArray(task)) {
        throw new Error(`Task ${row.laneId}/${row.taskId} has no raw task document.`);
      }

      task.task_id = task.task_id || row.taskId;
      this.applyEffectiveTaskFields(task, row);
      lane.tasks.push(task);
    }

    return [...laneById.values()];
  }

  async readPlanningRows(client) {
    const [lanes, tasks] = await Promise.all([
      client.query(`
        select
          lane_id as "laneId",
          source_path as "sourcePath",
          raw_lane as "rawLane"
        from ${this.deps.schemaName}.planning_lanes
        order by lane_id
      `),
      client.query(`
        select
          lane_id as "laneId",
          task_id as "taskId",
          raw_task as "rawTask",
          status,
          progress_pct as "progressPct",
          evidence_refs as "evidenceRefs",
          status_reason as "statusReason",
          claimed_by as "claimedBy"
        from ${this.deps.schemaName}.planning_effective_tasks
        order by lane_id, task_id
      `),
    ]);

    return {
      lanes: lanes.rows,
      tasks: tasks.rows,
    };
  }

  async readCanonicalStateRows(client) {
    const [featureMechanizationRails, featureMechanizationRailOperations] = await Promise.all([
      client.query(`
        select
          rail.rail_id as "railId",
          rail.feature_id as "featureId",
          rail.mechanization_status as "mechanizationStatus",
          rail.rail_name as "railName",
          rail.normalized_rail_name as "normalizedRailName",
          rail.rail_type as "railType",
          rail.ddd_owner as "dddOwner",
          rail.rail_status as "railStatus",
          rail.symbol_refs as "symbolRefs",
          rail.implementation_refs as "implementationRefs",
          rail.documentation_refs as "documentationRefs",
          rail.governing_sources as "governingSources",
          rail.allowed_implementation_surfaces as "allowedImplementationSurfaces",
          rail.architecture_guards as "architectureGuards",
          rail.completion_gate as "completionGate",
          rail.source_path as "sourcePath",
          rail.source_content_sha256 as "sourceContentSha256",
          rail.raw_rail as "rawRail",
          rail.raw_manifest as "rawManifest",
          rail.revision,
          rail.created_by as "createdBy",
          rail.created_at as "createdAt"
        from ${this.deps.schemaName}.feature_mechanization_local_rails rail
        where rail.source_path not like 'tools/planning-db/migrations/%'
          and exists (
            select 1
            from ${this.deps.schemaName}.feature_mechanization_local_operations operation
            where operation.rail_id = rail.rail_id
          )
        order by rail.rail_id
      `),
      client.query(`
        select
          operation.operation_id as "operationId",
          operation.idempotency_key as "idempotencyKey",
          operation.operation_type as "operationType",
          operation.actor,
          operation.rail_id as "railId",
          operation.source_path as "sourcePath",
          operation.source_content_sha256 as "sourceContentSha256",
          operation.expected_revision as "expectedRevision",
          operation.previous_revision as "previousRevision",
          operation.resulting_revision as "resultingRevision",
          operation.payload,
          operation.created_at as "createdAt"
        from ${this.deps.schemaName}.feature_mechanization_local_operations operation
        where exists (
          select 1
          from ${this.deps.schemaName}.feature_mechanization_local_rails rail
          where rail.rail_id = operation.rail_id
            and rail.source_path not like 'tools/planning-db/migrations/%'
        )
        order by operation.created_at, operation.operation_id
      `),
    ]);

    return {
      featureMechanizationRails: featureMechanizationRails.rows,
      featureMechanizationRailOperations: featureMechanizationRailOperations.rows,
    };
  }

  writeCanonicalState(snapshotRows, outputRoot) {
    const artifactPath = this.deps.path.join(outputRoot, canonicalStateArtifactPath);
    this.deps.fs.mkdirSync(this.deps.path.dirname(artifactPath), { recursive: true });
    this.deps.fs.writeFileSync(
      artifactPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          featureMechanizationRails: snapshotRows.featureMechanizationRails,
          featureMechanizationRailOperations: snapshotRows.featureMechanizationRailOperations,
        },
        null,
        2
      )}\n`,
      'utf8'
    );
  }

  writeLaneYamlFiles(lanes, sourceStateDir) {
    this.deps.fs.mkdirSync(sourceStateDir, { recursive: true });

    for (const lane of lanes) {
      const laneId = String(lane.lane_id || '').trim();
      if (!laneId) {
        throw new Error('Cannot export a lane without lane_id.');
      }

      const fileName = `agent-lane-${laneId.toLowerCase()}.yaml`;
      const filePath = this.deps.path.join(sourceStateDir, fileName);
      const content = this.deps.yaml.dump(lane, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });
      this.deps.fs.writeFileSync(filePath, content, 'utf8');
    }
  }

  planningLaneArtifactPaths(lanes) {
    return lanes.map((lane) => {
      const laneId = String(lane.lane_id || '').trim();
      if (!laneId) {
        throw new Error('Cannot resolve an artifact path for a lane without lane_id.');
      }

      return `docs/planning/state/agent-lane-${laneId.toLowerCase()}.yaml`;
    });
  }

  listExistingPlanningLaneArtifactPaths(root) {
    const sourceStateDir = this.deps.path.join(root, 'docs', 'planning', 'state');
    if (!this.deps.fs.existsSync(sourceStateDir)) {
      return [];
    }

    return this.deps.fs
      .readdirSync(sourceStateDir)
      .filter((fileName) => planningLaneFilePattern.test(fileName))
      .sort()
      .map((fileName) => `docs/planning/state/${fileName}`);
  }

  ensureExistingArtifacts(root, artifactPaths = exportedArtifactPaths) {
    const missing = artifactPaths.filter(
      (artifactPath) => !this.deps.fs.existsSync(this.deps.path.join(root, artifactPath))
    );

    if (missing.length > 0) {
      throw new Error(
        `Missing generated planning artifact(s): ${missing.join(', ')}. Run pnpm docs:workboard:generate first.`
      );
    }
  }

  copyExistingArtifacts(targetRoot, artifactPaths = exportedArtifactPaths) {
    this.ensureExistingArtifacts(this.deps.repoRoot, artifactPaths);

    for (const artifactPath of artifactPaths) {
      const sourcePath = this.deps.path.join(this.deps.repoRoot, artifactPath);
      const targetPath = this.deps.path.join(targetRoot, artifactPath);
      this.deps.fs.mkdirSync(this.deps.path.dirname(targetPath), { recursive: true });
      this.deps.fs.copyFileSync(sourcePath, targetPath);
    }
  }

  sha256(value) {
    return this.deps.crypto.createHash('sha256').update(value).digest('hex');
  }

  async recordPlanningArtifacts(client, outputRoot) {
    for (const artifactPath of exportedArtifactPaths) {
      const absolutePath = this.deps.path.join(outputRoot, artifactPath);
      if (!this.deps.fs.existsSync(absolutePath)) {
        continue;
      }

      const content = this.deps.fs.readFileSync(absolutePath, 'utf8');
      await client.query(
        `insert into ${this.deps.schemaName}.planning_artifacts
          (artifact_path, artifact_kind, source_table, content_sha256, metadata, exported_at)
         values ($1, $2, $3, $4, $5::jsonb, now())
         on conflict (artifact_path) do update set
          artifact_kind = excluded.artifact_kind,
          source_table = excluded.source_table,
          content_sha256 = excluded.content_sha256,
          metadata = excluded.metadata,
          exported_at = now()`,
        [
          artifactPath,
          artifactPath.endsWith('execution-workboard.md') ? 'workboard' : 'open-task-route',
          'planning_effective_tasks',
          this.sha256(content),
          JSON.stringify({ outputMode: 'planning-db-export' }),
        ]
      );
    }
  }

  runWorkboardGenerator({ outputRoot, databaseUrl }) {
    const generatorPath = this.deps.path.join(
      this.deps.repoRoot,
      'scripts',
      'generate-workboard.cjs'
    );
    const result = this.deps.childProcess.spawnSync(
      process.execPath,
      [generatorPath, '--source', 'db', '--database-url', databaseUrl, '--output-root', outputRoot],
      {
        cwd: this.deps.repoRoot,
        encoding: 'utf8',
        env: process.env,
      }
    );

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      const stderr = String(result.stderr || '').trim();
      const stdout = String(result.stdout || '').trim();
      const details = [stderr, stdout].filter(Boolean).join('\n');
      throw new Error(
        `Planning workboard generation failed with exit code ${result.status}.${details ? `\n${details}` : ''}`
      );
    }
  }

  readArtifact(root, artifactPath) {
    const absolutePath = this.deps.path.join(root, artifactPath);
    if (!this.deps.fs.existsSync(absolutePath)) {
      return null;
    }

    return this.deps.fs.readFileSync(absolutePath, 'utf8');
  }

  canonicalizeStructuredValue(value) {
    if (Array.isArray(value)) {
      return value.map((item) => this.canonicalizeStructuredValue(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, this.canonicalizeStructuredValue(value[key])])
      );
    }

    return value;
  }

  normalizeArtifactForComparison(artifactPath, content) {
    if (planningLaneFilePattern.test(this.deps.path.basename(artifactPath))) {
      return JSON.stringify(this.canonicalizeStructuredValue(this.deps.yaml.load(content)));
    }

    if (artifactPath === canonicalStateArtifactPath) {
      return JSON.stringify(this.canonicalizeStructuredValue(JSON.parse(content)));
    }

    return content;
  }

  compareGeneratedArtifacts({ expectedRoot, actualRoot, artifactPaths = exportedArtifactPaths }) {
    const missing = [];
    const changed = [];

    for (const artifactPath of artifactPaths) {
      const expected = this.readArtifact(expectedRoot, artifactPath);
      const actual = this.readArtifact(actualRoot, artifactPath);

      if (expected === null || actual === null) {
        missing.push(artifactPath);
        continue;
      }

      if (
        this.normalizeArtifactForComparison(artifactPath, expected) !==
        this.normalizeArtifactForComparison(artifactPath, actual)
      ) {
        changed.push(artifactPath);
      }
    }

    return {
      ok: missing.length === 0 && changed.length === 0,
      missing,
      changed,
    };
  }

  formatDiffReport(report) {
    if (report.ok) {
      return '[planning:db:export] OK';
    }

    const lines = [
      '[planning:db:export] DB-rendered planning artifacts drift from current generated files.',
    ];

    for (const artifactPath of report.missing) {
      lines.push(`- missing: ${artifactPath}`);
    }

    for (const artifactPath of report.changed) {
      lines.push(`- changed: ${artifactPath}`);
    }

    return lines.join('\n');
  }

  async exportPlanningDerivedSurfaces(options = {}) {
    const client =
      options.client ||
      new this.deps.Client({ connectionString: this.databaseUrl(options.databaseUrl) });
    const ownsClient = !options.client;
    const cleanupDirs = [];

    if (ownsClient) {
      await client.connect();
    }

    try {
      const [rows, canonicalStateRows] = await Promise.all([
        this.readPlanningRows(client),
        this.readCanonicalStateRows(client),
      ]);
      const lanes = this.buildLaneDocuments(rows);

      const outputRoot = options.check
        ? this.deps.fs.mkdtempSync(
            this.deps.path.join(this.deps.os.tmpdir(), 'planning-db-export-output-')
          )
        : this.deps.path.resolve(options.outputRoot || this.parseArgs([]).outputRoot);

      if (options.check) {
        cleanupDirs.push(outputRoot);
        this.copyExistingArtifacts(outputRoot);
      } else {
        this.deps.fs.mkdirSync(outputRoot, { recursive: true });
      }

      this.writeLaneYamlFiles(lanes, this.deps.path.join(outputRoot, 'docs', 'planning', 'state'));
      this.writeCanonicalState(canonicalStateRows, outputRoot);
      const canonicalArtifactPaths = [
        ...new Set([
          canonicalStateArtifactPath,
          ...exportedArtifactPaths,
          ...this.planningLaneArtifactPaths(lanes),
          ...this.listExistingPlanningLaneArtifactPaths(this.deps.repoRoot),
        ]),
      ].sort();
      this.runWorkboardGenerator({
        outputRoot,
        databaseUrl: this.databaseUrl(options.databaseUrl),
      });

      const report = options.check
        ? this.compareGeneratedArtifacts({
            expectedRoot: this.deps.repoRoot,
            actualRoot: outputRoot,
            artifactPaths: canonicalArtifactPaths,
          })
        : { ok: true, missing: [], changed: [] };

      if (options.check && !report.ok) {
        throw new Error(this.formatDiffReport(report));
      }

      await this.recordPlanningArtifacts(client, outputRoot);

      return {
        lanes: lanes.length,
        tasks: rows.tasks.length,
        canonicalFeatureMechanizationRails: canonicalStateRows.featureMechanizationRails.length,
        outputRoot,
        canonicalArtifactPaths,
        report,
      };
    } finally {
      for (const dir of cleanupDirs.reverse()) {
        this.deps.fs.rmSync(dir, { recursive: true, force: true });
      }

      if (ownsClient) {
        await client.end();
      }
    }
  }
}

async function main() {
  const runner = new PlanningDbExportRunner();
  const options = runner.parseArgs(process.argv.slice(2));

  if (options.help) {
    runner.printHelp();
    return;
  }

  const result = await runner.exportPlanningDerivedSurfaces(options);
  console.log(
    `[planning:db:export] lanes=${result.lanes} tasks=${result.tasks} outputRoot=${dependencies.path.relative(
      dependencies.repoRoot,
      result.outputRoot
    )}`
  );
  console.log(runner.formatDiffReport(result.report));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:export] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  PlanningDbExportRunner,
  canonicalStateArtifactPath,
  exportedArtifactPaths,
};
