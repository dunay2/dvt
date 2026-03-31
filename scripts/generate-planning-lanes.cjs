#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const stateDir = path.join(repoRoot, 'docs', 'planning', 'state');

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function writeIfChanged(filePath, next) {
  const current = readIfExists(filePath);
  const eol = current && current.includes('\r\n') ? '\r\n' : '\n';
  const normalizedNext = next.replace(/\r?\n/g, eol);
  if (current === normalizedNext) {
    return false;
  }
  fs.writeFileSync(filePath, normalizedNext, 'utf8');
  return true;
}

function loadYaml(filePath) {
  const content = readIfExists(filePath);
  if (content === null) {
    throw new Error(`Missing planning lane YAML: ${path.relative(repoRoot, filePath)}`);
  }
  return yaml.load(content);
}

function normalizeStatus(status) {
  return String(status || 'queued')
    .trim()
    .toLowerCase();
}

function isDoneStatus(status) {
  return normalizeStatus(status) === 'done';
}

function formatStatus(status) {
  const normalized = normalizeStatus(status);
  return normalized.length > 0 ? normalized : 'queued';
}

function coerceComplexity(task) {
  const complexity = String(task.complexity || '-').trim().toUpperCase();
  return complexity.length > 0 ? complexity : '-';
}

function coerceEffort(task) {
  return Number.isFinite(task.effort_points) ? String(task.effort_points) : '-';
}

function coerceProgress(task) {
  if (Number.isFinite(task.progress_pct)) {
    const clamped = Math.max(0, Math.min(100, Math.round(task.progress_pct)));
    return String(clamped);
  }
  return isDoneStatus(task.status) ? '100' : '0';
}

function summarizeTasks(tasks, lastVerified) {
  const normalizedTasks = Array.isArray(tasks) ? tasks : [];
  const totalTasks = normalizedTasks.length;
  const totalEffortPoints = normalizedTasks.reduce(
    (sum, task) => sum + (Number.isFinite(task.effort_points) ? task.effort_points : 0),
    0
  );
  const completedWeightedPoints = normalizedTasks.reduce((sum, task) => {
    const effort = Number.isFinite(task.effort_points) ? task.effort_points : 0;
    const progress = Number.parseFloat(coerceProgress(task));
    return sum + (effort * progress) / 100;
  }, 0);
  const laneProgressPct =
    totalEffortPoints > 0 ? Math.round((completedWeightedPoints / totalEffortPoints) * 100) : 0;

  return {
    status_model: 'evidence-backed lane registry',
    done_rule: 'done only with accepted evidence or equivalent verifiable closure',
    verified_on: lastVerified || '-',
    total_tasks: totalTasks,
    total_effort_points: totalEffortPoints,
    completed_weighted_points: Number(completedWeightedPoints.toFixed(2)),
    lane_progress_pct: laneProgressPct,
    notes:
      'Weighted progress uses effort_points. Parent umbrella tasks with subtasks carry coordination-only effort.',
  };
}

function normalizeVerificationSummary(spec) {
  const computed = summarizeTasks(spec.tasks, spec.last_reviewed);
  const raw = spec.verification_summary && typeof spec.verification_summary === 'object'
    ? spec.verification_summary
    : {};

  return {
    status_model: raw.status_model || computed.status_model,
    done_rule: raw.done_rule || computed.done_rule,
    verified_on: raw.verified_on || raw.last_verified || computed.verified_on,
    total_tasks: raw.total_tasks ?? computed.total_tasks,
    total_effort_points: raw.total_effort_points ?? computed.total_effort_points,
    completed_weighted_points:
      raw.completed_weighted_points ?? computed.completed_weighted_points,
    lane_progress_pct: raw.lane_progress_pct ?? computed.lane_progress_pct,
    notes: raw.notes || computed.notes,
  };
}

function renderBulletList(items) {
  if (typeof items === 'string') {
    return items
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => (line.startsWith('- ') ? line : `- ${line}`));
  }
  if (!Array.isArray(items) || items.length === 0) {
    return ['- None.'];
  }
  return items.map((item) => `- ${String(item).trim()}`);
}

function renderTaskLine(task) {
  const checked = isDoneStatus(task.status) ? '[x]' : '[ ]';
  const priority = task.priority ? `\`${task.priority}\`` : '`P?`';
  const taskId = task.task_id ? `\`${task.task_id}\`` : '`unassigned-task`';
  const status = `\`${formatStatus(task.status)}\``;
  const complexity = `\`${coerceComplexity(task)}\``;
  const effort = `\`${coerceEffort(task)}pt\``;
  const progress = `\`${coerceProgress(task)}%\``;
  const parentTask = task.parent_task ? ` parent:\`${task.parent_task}\`` : '';
  const objective = String(task.objective || '')
    .trim()
    .replace(/\s+/g, ' ');

  return `- ${checked} ${priority} ${taskId} ${status} ${complexity} ${effort} ${progress}${parentTask}: ${objective}`;
}

function renderVerificationSummarySection(spec) {
  const summary = normalizeVerificationSummary(spec);
  const lines = ['## Verification Summary', ''];

  if (summary.status_model) {
    lines.push(`- Status model: \`${summary.status_model}\``);
  }
  if (summary.done_rule) {
    lines.push(`- Done rule: \`${summary.done_rule}\``);
  }
  lines.push(`- Verified on: \`${summary.verified_on ?? spec.last_reviewed ?? '-'}\``);
  lines.push(`- Total tasks: \`${summary.total_tasks ?? 0}\``);
  lines.push(`- Total effort points: \`${summary.total_effort_points ?? 0}\``);
  lines.push(`- Completed weighted points: \`${summary.completed_weighted_points ?? 0}\``);
  lines.push(`- Lane progress: \`${summary.lane_progress_pct ?? 0}%\``);
  if (summary.notes) {
    lines.push(`- Notes: ${String(summary.notes).trim()}`);
  }
  lines.push('');
  return lines.join('\n');
}

function renderTasksSection(spec, yamlFileName) {
  const lines = [
    '## Tasks',
    '',
    `> Verified registry source: \`${yamlFileName}\`. Edit the YAML and run \`pnpm docs:planning:lanes:generate\` plus \`pnpm docs:workboard:generate\`.`,
    '',
  ];
  for (const task of spec.tasks || []) {
    lines.push(renderTaskLine(task));
  }
  lines.push('', '');
  return lines.join('\n');
}

function renderDependenciesSection(spec) {
  const lines = ['## Dependencies', ''];
  lines.push(...renderBulletList(spec.dependency_notes || spec.dependencies));
  lines.push('', '');
  return lines.join('\n');
}

function renderExpectedOutcomeSection(spec) {
  const lines = ['## Expected Outcome', ''];
  lines.push(...renderBulletList(spec.expected_outcome));
  lines.push('');
  return lines.join('\n');
}

function renderLaneMarkdown(spec, yamlFileName) {
  const title = `Agent Lane ${spec.lane_id} - ${spec.title}`;
  const headerMarkdown =
    typeof spec.header_markdown === 'string' && spec.header_markdown.trim().length > 0
      ? `${spec.header_markdown.trim()}\n\n`
      : '';

  return [
    '---',
    `title: ${title}`,
    `status: ${spec.status || 'Active'}`,
    `owner: ${spec.owner || 'generated'}`,
    `last_reviewed: ${spec.last_reviewed || '-'}`,
    'planning_type: status',
    '---',
    '',
    headerMarkdown.trimEnd(),
    headerMarkdown ? '' : null,
    `# ${title}`,
    '',
    `Generated from the verified lane registry \`${yamlFileName}\`. Use this file when assigning Agent ${spec.lane_id}.`,
    '',
    '## Goal',
    '',
    String(spec.goal || '').trim(),
    '',
    renderVerificationSummarySection(spec).trimEnd(),
    '',
    renderTasksSection(spec, yamlFileName).trimEnd(),
    '',
    renderDependenciesSection(spec).trimEnd(),
    '',
    renderExpectedOutcomeSection(spec).trimEnd(),
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');
}

function updateLaneDoc(yamlFileName) {
  const yamlPath = path.join(stateDir, yamlFileName);
  const mdPath = yamlPath.replace(/\.yaml$/i, '.md');
  const spec = loadYaml(yamlPath);

  if (!spec || typeof spec !== 'object') {
    throw new Error(`Planning lane YAML is not an object: ${yamlFileName}`);
  }

  const next = renderLaneMarkdown(spec, yamlFileName);
  if (writeIfChanged(mdPath, next)) {
    console.log(`[planning:lanes] Regenerated ${path.relative(repoRoot, mdPath)}`);
  } else {
    console.log(`[planning:lanes] ${path.relative(repoRoot, mdPath)} already up to date.`);
  }
}

function main() {
  if (!fs.existsSync(stateDir)) {
    throw new Error('Missing docs/planning/state directory.');
  }

  const laneFiles = fs
    .readdirSync(stateDir)
    .filter((name) => /^agent-lane-[a-z]\.yaml$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (laneFiles.length === 0) {
    console.log('[planning:lanes] No lane YAML files found.');
    return;
  }

  for (const yamlFileName of laneFiles) {
    updateLaneDoc(yamlFileName);
  }
}

main();
