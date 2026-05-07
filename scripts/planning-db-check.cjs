const { Client } = require('pg');

const { buildPlanningContentSnapshot, databaseUrl } = require('./planning-db-import.cjs');
const { schemaName } = require('./planning-db-migrate.cjs');

function normalizeComparable(value) {
  if (value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value) || (value && typeof value === 'object')) {
    return JSON.stringify(value);
  }

  return value;
}

function formatValue(value) {
  const normalized = normalizeComparable(value);

  if (normalized === null) {
    return 'null';
  }

  const text = String(normalized);
  return text.length > 96 ? `${text.slice(0, 93)}...` : text;
}

function sortUnique(values) {
  return [...new Set(values)].sort();
}

function indexBy(rows, keyOf) {
  const index = new Map();

  for (const row of rows || []) {
    index.set(keyOf(row), row);
  }

  return index;
}

function compareRows(expectedRows, actualRows, options) {
  const expectedByKey = indexBy(expectedRows, options.keyOf);
  const actualByKey = indexBy(actualRows, options.keyOf);
  const expectedKeys = [...expectedByKey.keys()];
  const actualKeys = [...actualByKey.keys()];
  const missing = sortUnique(expectedKeys.filter((key) => !actualByKey.has(key)));
  const unexpected = sortUnique(actualKeys.filter((key) => !expectedByKey.has(key)));
  const stale = [];

  for (const key of expectedKeys) {
    if (!actualByKey.has(key)) {
      continue;
    }

    const expected = expectedByKey.get(key);
    const actual = actualByKey.get(key);
    const differences = [];

    for (const field of options.compareFields) {
      const expectedValue = normalizeComparable(expected[field]);
      const actualValue = normalizeComparable(actual[field]);

      if (expectedValue !== actualValue) {
        differences.push({
          field,
          expected: expectedValue,
          actual: actualValue,
        });
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

function buildPlanningExpectedState(snapshot = buildPlanningContentSnapshot()) {
  return {
    sources: (snapshot.sources || []).map((source) => ({
      sourcePath: source.sourcePath,
      sourceType: source.sourceType,
      contentSha256: source.contentSha256,
      sourceBytes: source.sourceBytes,
    })),
    lanes: (snapshot.lanes || []).map((lane) => ({
      laneId: lane.laneId,
      sourcePath: lane.sourcePath,
      title: lane.title,
      owner: lane.owner,
      status: lane.status,
      lastReviewed: lane.lastReviewed,
      sourceContentSha256: lane.sourceContentSha256,
    })),
    tasks: (snapshot.tasks || []).map((task) => ({
      laneId: task.laneId,
      taskId: task.taskId,
      parentTaskId: task.parentTaskId,
      priority: task.priority,
      status: task.status,
      objective: task.objective,
      dependency: task.dependency,
      target: task.target,
      complexity: task.complexity,
      sourcePath: task.sourcePath,
      sourceContentSha256: task.sourceContentSha256,
    })),
  };
}

function comparePlanningDatabaseState(expected, actual) {
  const sections = {
    sources: compareRows(expected.sources, actual.sources, {
      keyOf: (row) => row.sourcePath,
      compareFields: ['sourceType', 'contentSha256', 'sourceBytes'],
    }),
    lanes: compareRows(expected.lanes, actual.lanes, {
      keyOf: (row) => row.laneId,
      compareFields: [
        'sourcePath',
        'title',
        'owner',
        'status',
        'lastReviewed',
        'sourceContentSha256',
      ],
    }),
    tasks: compareRows(expected.tasks, actual.tasks, {
      keyOf: (row) => `${row.laneId}::${row.taskId}`,
      compareFields: [
        'parentTaskId',
        'priority',
        'status',
        'objective',
        'dependency',
        'target',
        'complexity',
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

async function readPlanningDatabaseState(client) {
  const [sources, lanes, tasks] = await Promise.all([
    client.query(`
      select
        source_path as "sourcePath",
        source_type as "sourceType",
        content_sha256 as "contentSha256",
        source_bytes::int as "sourceBytes"
      from ${schemaName}.planning_sources
      order by source_path
    `),
    client.query(`
      select
        lane_id as "laneId",
        source_path as "sourcePath",
        title,
        owner,
        status,
        last_reviewed::text as "lastReviewed",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.planning_lanes
      order by lane_id
    `),
    client.query(`
      select
        lane_id as "laneId",
        task_id as "taskId",
        parent_task_id as "parentTaskId",
        priority,
        status,
        objective,
        dependency,
        target,
        complexity,
        source_path as "sourcePath",
        source_content_sha256 as "sourceContentSha256"
      from ${schemaName}.planning_tasks
      order by lane_id, task_id
    `),
  ]);

  return {
    sources: sources.rows,
    lanes: lanes.rows,
    tasks: tasks.rows,
  };
}

function formatSection(name, section) {
  const lines = [
    `- ${name}: missing rows: ${section.missing.length}; unexpected rows: ${section.unexpected.length}; stale rows: ${section.stale.length}`,
  ];

  for (const key of section.missing.slice(0, 10)) {
    lines.push(`  missing: ${key}`);
  }

  for (const key of section.unexpected.slice(0, 10)) {
    lines.push(`  unexpected: ${key}`);
  }

  for (const stale of section.stale.slice(0, 10)) {
    const differences = stale.differences
      .map(
        (difference) =>
          `${difference.field} expected=${formatValue(difference.expected)} actual=${formatValue(difference.actual)}`
      )
      .join('; ');
    lines.push(`  stale: ${stale.key} (${differences})`);
  }

  return lines.join('\n');
}

function formatDriftReport(commandName, report) {
  if (report.ok) {
    return `[${commandName}] OK`;
  }

  const sections = Object.entries(report.sections).map(([name, section]) =>
    formatSection(name, section)
  );

  return [`[${commandName}] Drift detected:`, ...sections].join('\n');
}

async function checkPlanningDatabase(options = {}) {
  const expected = buildPlanningExpectedState(options.snapshot);
  const client =
    options.client || new Client({ connectionString: options.databaseUrl || databaseUrl() });
  const ownsClient = !options.client;

  if (ownsClient) {
    await client.connect();
  }

  try {
    const actual = await readPlanningDatabaseState(client);
    return comparePlanningDatabaseState(expected, actual);
  } finally {
    if (ownsClient) {
      await client.end();
    }
  }
}

async function main() {
  const report = await checkPlanningDatabase();

  if (!report.ok) {
    console.error(formatDriftReport('planning:db:check', report));
    process.exit(1);
  }

  console.log(formatDriftReport('planning:db:check', report));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`[planning:db:check] ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  buildPlanningExpectedState,
  checkPlanningDatabase,
  comparePlanningDatabaseState,
  compareRows,
  formatDriftReport,
  formatSection,
  indexBy,
  readPlanningDatabaseState,
  sortUnique,
};
