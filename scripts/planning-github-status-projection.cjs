#!/usr/bin/env node

/**
 * @file CLI adapter for the Planning DB to GitHub collaboration projection.
 * The adapter never infers links and delegates every mutation decision to the projection policy.
 */

const { execFileSync } = require('node:child_process');

const { Client } = require('pg');

const {
  ListGitHubPlanningProjectionDrift,
  ReconcileGitHubPlanningProjection,
} = require('./planning-db/github-planning-projection-policy.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');

const defaultRepository = 'dunay2/dvt';

function validateMode(mode) {
  if (!['check', 'reconcile'].includes(mode)) {
    throw new Error('Expected check or reconcile.');
  }
  return mode;
}

function parseCliArguments(argv) {
  const [rawMode, ...rest] = argv;
  const mode = validateMode(rawMode);

  let repository = defaultRepository;
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] !== '--repository' || !rest[index + 1]) {
      throw new Error(`Unknown or incomplete option "${rest[index]}".`);
    }
    repository = rest[index + 1];
    index += 1;
  }

  return { mode, repository };
}

class PlanningDbEffectiveTaskReader {
  constructor(client) {
    this.client = client;
  }

  async readEffectiveTasks() {
    const result = await this.client.query(`
      select lane_id, task_id, status, evidence_refs
      from planning_query_store.planning_effective_tasks
      order by lane_id, task_id
    `);

    return result.rows.map((row) => ({
      laneId: row.lane_id,
      taskId: row.task_id,
      status: row.status,
      evidenceRefs: Array.isArray(row.evidence_refs) ? row.evidence_refs : [],
    }));
  }
}

function runGitHubCli(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

class GitHubCliIssueGateway {
  constructor({ repository, runGh = runGitHubCli }) {
    this.repository = repository;
    this.runGh = runGh;
  }

  async listIssues() {
    const output = await this.runGh([
      'api',
      '--method',
      'GET',
      '--paginate',
      `repos/${this.repository}/issues`,
      '-f',
      'state=all',
      '-f',
      'per_page=100',
      '--jq',
      '.[] | select(.pull_request == null) | {number, state, title, url: .html_url, labels: [.labels[].name]}',
    ]);
    const issues = output
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    return issues.map((issue) => ({
      number: issue.number,
      state: String(issue.state || '').toUpperCase(),
      title: issue.title,
      url: issue.url,
      labels: (issue.labels || []).map(String),
    }));
  }

  async closeIssue(issueNumber, comment) {
    await this.runGh([
      'issue',
      'close',
      String(issueNumber),
      '--repo',
      this.repository,
      '--reason',
      'completed',
      '--comment',
      comment,
    ]);
  }

  async reopenIssue(issueNumber, comment) {
    await this.runGh([
      'issue',
      'reopen',
      String(issueNumber),
      '--repo',
      this.repository,
      '--comment',
      comment,
    ]);
  }
}

async function runGitHubPlanningProjection({
  mode,
  repository,
  taskReader,
  issueGateway,
  writeOutput = console.log,
}) {
  const validatedMode = validateMode(mode);
  const projectionQuery = new ListGitHubPlanningProjectionDrift({
    repository,
    taskReader,
    issueGateway,
  });
  const result =
    validatedMode === 'check'
      ? await projectionQuery.execute()
      : await new ReconcileGitHubPlanningProjection({
          projectionQuery,
          issueGateway,
        }).execute();

  writeOutput(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const options = parseCliArguments(process.argv.slice(2));
  const client = new Client({
    connectionString: process.env.DVT_PLANNING_DB_URL || defaultPgUrl,
  });
  await client.connect();

  try {
    const issueGateway = new GitHubCliIssueGateway({
      repository: options.repository,
    });
    await runGitHubPlanningProjection({
      ...options,
      taskReader: new PlanningDbEffectiveTaskReader(client),
      issueGateway,
    });
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  GitHubCliIssueGateway,
  PlanningDbEffectiveTaskReader,
  parseCliArguments,
  runGitHubPlanningProjection,
};
