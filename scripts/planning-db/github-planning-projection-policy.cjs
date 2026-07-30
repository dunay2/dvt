/**
 * @file GitHub collaboration projection policy owned by Planning Governance.
 * Planning DB is authoritative; GitHub issues are a fail-closed collaboration projection.
 */

const planningIssueLabels = new Set(['epic', 'story', 'task']);
const supportedTaskStatuses = new Set(['blocked', 'done', 'in_progress', 'queued', 'review']);
const terminalTaskStatuses = new Set(['done']);

const GitHubPlanningProjectionReadModel = Object.freeze({
  version: 1,
  classifications: Object.freeze([
    'ambiguous',
    'close_required',
    'missing_issue',
    'reopen_required',
    'synchronized',
    'unmapped',
  ]),
});

const GitHubPlanningReconciliationCommand = Object.freeze({
  version: 1,
  allowedActions: Object.freeze(['close', 'reopen']),
  authority: 'Planning DB effective task state',
});

function normalizeRepository(repository) {
  const normalized = String(repository || '').trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(normalized)) {
    throw new Error(`Invalid GitHub repository "${repository}". Expected owner/name.`);
  }
  return normalized;
}

function parseGitHubIssueReference(reference, repository) {
  const expectedRepository = normalizeRepository(repository).toLowerCase();
  let parsed;
  try {
    parsed = new URL(String(reference || ''));
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' || parsed.hostname.toLowerCase() !== 'github.com') {
    return null;
  }

  const pathParts = parsed.pathname.split('/').filter(Boolean);
  if (pathParts.length !== 4 || pathParts[2] !== 'issues') {
    return null;
  }
  if (`${pathParts[0]}/${pathParts[1]}`.toLowerCase() !== expectedRepository) {
    return null;
  }

  const issueNumber = Number(pathParts[3]);
  return Number.isSafeInteger(issueNumber) && issueNumber > 0 ? issueNumber : null;
}

function normalizeTask(task) {
  const normalized = {
    laneId: String(task.laneId || ''),
    taskId: String(task.taskId || ''),
    status: String(task.status || ''),
    evidenceRefs: Array.isArray(task.evidenceRefs) ? task.evidenceRefs : [],
  };
  if (!supportedTaskStatuses.has(normalized.status)) {
    throw new Error(`Unsupported Planning DB task status "${normalized.status}".`);
  }
  return normalized;
}

function normalizeIssue(issue, repository) {
  const number = Number(issue.number);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`Invalid GitHub issue number "${issue.number}".`);
  }

  const normalized = {
    number,
    state: String(issue.state || '').toUpperCase(),
    title: String(issue.title || ''),
    url: String(issue.url || `https://github.com/${repository}/issues/${number}`),
    labels: (Array.isArray(issue.labels) ? issue.labels : []).map((label) =>
      String(typeof label === 'string' ? label : label?.name || '').toLowerCase()
    ),
  };
  if (!['CLOSED', 'OPEN'].includes(normalized.state)) {
    throw new Error(`Unsupported GitHub issue state "${normalized.state}".`);
  }
  return normalized;
}

function collectTaskLinks(tasks, repository) {
  const linksByIssue = new Map();
  for (const rawTask of tasks) {
    const task = normalizeTask(rawTask);
    const linkedIssueNumbers = new Set(
      task.evidenceRefs
        .map((reference) => parseGitHubIssueReference(reference, repository))
        .filter((issueNumber) => issueNumber !== null)
    );

    for (const issueNumber of linkedIssueNumbers) {
      const taskRefs = linksByIssue.get(issueNumber) || [];
      taskRefs.push({
        laneId: task.laneId,
        taskId: task.taskId,
        status: task.status,
      });
      linksByIssue.set(issueNumber, taskRefs);
    }
  }

  for (const taskRefs of linksByIssue.values()) {
    taskRefs.sort((left, right) => left.taskId.localeCompare(right.taskId));
  }
  return linksByIssue;
}

function isPlanningIssue(issue) {
  return issue.labels.some((label) => planningIssueLabels.has(label));
}

function classifyLinkedIssue(issue, taskRefs) {
  if (taskRefs.length > 1) {
    return { classification: 'ambiguous', action: null };
  }

  const taskIsTerminal = terminalTaskStatuses.has(taskRefs[0].status);
  if (taskIsTerminal && issue.state === 'OPEN') {
    return { classification: 'close_required', action: 'close' };
  }
  if (!taskIsTerminal && issue.state === 'CLOSED') {
    return { classification: 'reopen_required', action: 'reopen' };
  }
  return { classification: 'synchronized', action: null };
}

function buildProjectionRecord(issue, taskRefs) {
  if (taskRefs.length === 0) {
    return {
      issueNumber: issue.number,
      issueUrl: issue.url,
      title: issue.title,
      issueState: issue.state,
      classification: 'unmapped',
      action: null,
      taskRefs,
    };
  }

  return {
    issueNumber: issue.number,
    issueUrl: issue.url,
    title: issue.title,
    issueState: issue.state,
    ...classifyLinkedIssue(issue, taskRefs),
    taskRefs,
  };
}

function buildGitHubPlanningProjection({ repository, tasks, issues }) {
  const normalizedRepository = normalizeRepository(repository);
  const normalizedIssues = (Array.isArray(issues) ? issues : []).map((issue) =>
    normalizeIssue(issue, normalizedRepository)
  );
  const issueByNumber = new Map(normalizedIssues.map((issue) => [issue.number, issue]));
  const taskLinks = collectTaskLinks(Array.isArray(tasks) ? tasks : [], normalizedRepository);
  const candidateNumbers = new Set(taskLinks.keys());
  let ignoredIssueCount = 0;

  for (const issue of normalizedIssues) {
    if (isPlanningIssue(issue)) {
      candidateNumbers.add(issue.number);
    } else if (!taskLinks.has(issue.number)) {
      ignoredIssueCount += 1;
    }
  }

  const records = [...candidateNumbers]
    .sort((left, right) => left - right)
    .map((issueNumber) => {
      const issue = issueByNumber.get(issueNumber);
      const taskRefs = taskLinks.get(issueNumber) || [];
      if (!issue) {
        return {
          issueNumber,
          issueUrl: `https://github.com/${normalizedRepository}/issues/${issueNumber}`,
          title: '',
          issueState: 'MISSING',
          classification: 'missing_issue',
          action: null,
          taskRefs,
        };
      }
      return buildProjectionRecord(issue, taskRefs);
    });

  const count = (classification) =>
    records.filter((record) => record.classification === classification).length;

  return {
    repository: normalizedRepository,
    records,
    summary: {
      planningIssueCount: records.length,
      linkedIssueCount: records.filter((record) => record.taskRefs.length > 0).length,
      actionableCount: records.filter((record) => record.action !== null).length,
      ambiguousCount: count('ambiguous'),
      unmappedCount: count('unmapped'),
      missingIssueCount: count('missing_issue'),
      ignoredIssueCount,
    },
  };
}

class ListGitHubPlanningProjectionDrift {
  constructor({ repository, taskReader, issueGateway }) {
    this.repository = normalizeRepository(repository);
    this.taskReader = taskReader;
    this.issueGateway = issueGateway;
  }

  async execute() {
    const tasks = await this.taskReader.readEffectiveTasks();
    const issues = await this.issueGateway.listIssues();
    return buildGitHubPlanningProjection({
      repository: this.repository,
      tasks,
      issues,
    });
  }
}

function reconciliationComment(record) {
  const task = record.taskRefs[0];
  const taskRef = `${task.laneId}/${task.taskId}`;
  if (record.action === 'close') {
    return `Planning DB marks ${taskRef} as done. Closing this collaboration projection; Planning DB remains the lifecycle authority.`;
  }
  return `Planning DB marks ${taskRef} as ${task.status}. Reopening this collaboration projection; Planning DB remains the lifecycle authority.`;
}

class ReconcileGitHubPlanningProjection {
  constructor({ projectionQuery, issueGateway }) {
    this.projectionQuery = projectionQuery;
    this.issueGateway = issueGateway;
  }

  async execute() {
    const projection = await this.projectionQuery.execute();
    if (projection.summary.ambiguousCount > 0) {
      throw new Error(
        'GITHUB_PLANNING_PROJECTION_AMBIGUOUS: one or more issues link to multiple effective tasks.'
      );
    }

    const applied = [];
    for (const record of projection.records) {
      if (record.action === 'close') {
        await this.issueGateway.closeIssue(record.issueNumber, reconciliationComment(record));
      } else if (record.action === 'reopen') {
        await this.issueGateway.reopenIssue(record.issueNumber, reconciliationComment(record));
      } else {
        continue;
      }
      applied.push({ action: record.action, issueNumber: record.issueNumber });
    }

    return {
      repository: projection.repository,
      applied,
      appliedCount: applied.length,
      unmappedCount: projection.summary.unmappedCount,
      missingIssueCount: projection.summary.missingIssueCount,
    };
  }
}

module.exports = {
  GitHubPlanningProjectionReadModel,
  GitHubPlanningReconciliationCommand,
  ListGitHubPlanningProjectionDrift,
  ReconcileGitHubPlanningProjection,
  buildGitHubPlanningProjection,
  parseGitHubIssueReference,
};
