#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { resolveGeneratedDate } = require('./generated-doc-date.cjs');

const repoRoot = path.resolve(__dirname, '..');
const stateDir = path.join(repoRoot, 'docs', 'planning', 'state');
const workboardPath = path.join(stateDir, 'execution-workboard.md');
const openTaskPath = path.join(stateDir, 'open-task-route.md');

const LANE_DOMAIN = {
  A: 'Execution Runtime',
  B: 'Event Contract And Traceability',
  C: 'Runtime Safety And Admission',
  D: 'Scale And Go-To-Market',
  E: 'Frontend And UI',
};

function normalizeStatus(status) {
  return String(status || 'queued')
    .trim()
    .toLowerCase();
}

function loadLanes() {
  const laneFiles = fs
    .readdirSync(stateDir)
    .filter((f) => /^agent-lane-[a-z]\.yaml$/i.test(f))
    .sort();

  return laneFiles.map((file) => {
    const raw = fs.readFileSync(path.join(stateDir, file), 'utf8');
    return yaml.load(raw);
  });
}

function normalizeComplexity(task) {
  const complexity = String(task.complexity || '-').trim().toUpperCase();
  return complexity.length > 0 ? complexity : '-';
}

function normalizeEffort(task) {
  return Number.isFinite(task.effort_points) ? String(task.effort_points) : '-';
}

function normalizeProgress(task) {
  if (Number.isFinite(task.progress_pct)) {
    return `${Math.max(0, Math.min(100, Math.round(task.progress_pct)))}%`;
  }
  return normalizeStatus(task.status) === 'done' ? '100%' : '0%';
}

function summarizeLane(lane) {
  const tasks = Array.isArray(lane.tasks) ? lane.tasks : [];
  const totalEffort = tasks.reduce(
    (sum, task) => sum + (Number.isFinite(task.effort_points) ? task.effort_points : 0),
    0
  );
  const completedWeighted = tasks.reduce((sum, task) => {
    const effort = Number.isFinite(task.effort_points) ? task.effort_points : 0;
    const progress = Number.isFinite(task.progress_pct)
      ? task.progress_pct
      : normalizeStatus(task.status) === 'done'
        ? 100
        : 0;
    return sum + (effort * progress) / 100;
  }, 0);

  const computed = {
    status_model: 'evidence-backed lane registry',
    done_rule: 'done only with accepted evidence or equivalent verifiable closure',
    verified_on: lane.last_reviewed || '-',
    total_tasks: tasks.length,
    total_effort_points: totalEffort,
    completed_weighted_points: Number(completedWeighted.toFixed(2)),
    lane_progress_pct:
      totalEffort > 0 ? Math.round((completedWeighted / totalEffort) * 100) : 0,
    notes:
      'Weighted progress uses effort_points. Parent umbrella tasks with subtasks carry coordination-only effort.',
  };

  if (!lane.verification_summary || typeof lane.verification_summary !== 'object') {
    return computed;
  }

  return {
    ...computed,
    ...lane.verification_summary,
    verified_on:
      lane.verification_summary.verified_on ||
      lane.verification_summary.last_verified ||
      computed.verified_on,
  };
}

function collectTasks(lanes) {
  const tasks = [];
  for (const lane of lanes) {
    for (const task of lane.tasks ?? []) {
      tasks.push({
        ...task,
        lane_id: lane.lane_id,
        lane_title: lane.title,
        domain: LANE_DOMAIN[lane.lane_id] ?? lane.title,
      });
    }
  }
  return tasks;
}

function buildDoneSet(tasks) {
  return new Set(tasks.filter((t) => normalizeStatus(t.status) === 'done').map((t) => t.task_id));
}

function parseDependencyTokens(dep) {
  if (!dep || dep === 'none') return [];
  return String(dep)
    .split(/,|\band\b/)
    .map((s) => s.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function isUnblocked(task, doneSet) {
  if (normalizeStatus(task.status) !== 'queued') return false;
  const tokens = parseDependencyTokens(task.dependency);
  return tokens.every((token) => doneSet.has(token));
}

function pad(s, len) {
  return String(s).padEnd(len);
}

function buildLaneSummaryTable(lanes) {
  const rows = lanes.map((lane) => {
    const summary = summarizeLane(lane);
    return [
      `\`${lane.lane_id}\``,
      lane.title,
      `${summary.lane_progress_pct ?? 0}%`,
      String(summary.completed_weighted_points ?? 0),
      String(summary.total_effort_points ?? 0),
      String(summary.total_tasks ?? 0),
      String(summary.last_verified ?? lane.last_reviewed ?? '-'),
    ];
  });

  const headers = [
    'Lane',
    'Title',
      'Progress',
      'Completed weighted pts',
      'Total effort',
      'Tasks',
      'Verified on',
    ];
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const sep = widths.map((w) => '-'.repeat(w));
  const fmt = (row) => '| ' + row.map((c, i) => pad(c, widths[i])).join(' | ') + ' |';

  return [fmt(headers), fmt(sep), ...rows.map(fmt), ''].join('\n');
}

function buildWorkboard(tasks, lanes, date) {
  const statusOrder = { in_progress: 0, review: 1, queued: 2, blocked: 3, done: 4 };
  const sorted = [...tasks].sort((a, b) => {
    const sa = statusOrder[normalizeStatus(a.status)] ?? 9;
    const sb = statusOrder[normalizeStatus(b.status)] ?? 9;
    if (sa !== sb) return sa - sb;

    const pa = Number.parseInt(String(a.priority ?? 'P9').replace('P', ''), 10);
    const pb = Number.parseInt(String(b.priority ?? 'P9').replace('P', ''), 10);
    if (pa !== pb) return pa - pb;

    const ga = a.parent_task ?? a.task_id;
    const gb = b.parent_task ?? b.task_id;
    if (ga !== gb) return ga.localeCompare(gb);
    return String(a.task_id).localeCompare(String(b.task_id));
  });

  const rows = sorted.map((task) => [
    `\`${task.task_id}\``,
    String(task.objective ?? '').replace(/\n/g, ' '),
    task.domain,
    task.lane_title,
    String(task.parent_task ?? 'none'),
    String(task.dependency ?? 'none'),
    normalizeStatus(task.status),
    normalizeComplexity(task),
    normalizeEffort(task),
    normalizeProgress(task),
    String(task.target ?? '').replace(/\n/g, ' '),
  ]);

  const headers = [
    'Task ID',
    'Objective',
    'Domain',
    'Lane',
    'Parent',
    'Dependencies',
    'Status',
    'Complexity',
    'Effort',
    'Progress',
    'Next action',
  ];
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const sep = widths.map((w) => '-'.repeat(w));
  const fmt = (row) => '| ' + row.map((c, i) => pad(c, widths[i])).join(' | ') + ' |';

  return [
    '---',
    'title: Execution Workboard',
    'status: generated',
    'owner: generated',
    `last_reviewed: ${date}`,
    'planning_type: status',
    '---',
    '',
    '<!-- This file is generated by `pnpm docs:workboard:generate`. Do not edit by hand. -->',
    '',
    '# Execution Workboard',
    '',
    `Generated from verified agent-lane YAML files on ${date}.`,
    '',
    '## Status Legend',
    '',
    '- `in_progress`: active implementation.',
    '- `review`: implementation exists but closure evidence or dependency lock is still pending.',
    '- `queued`: agreed but not started.',
    '- `blocked`: cannot proceed until dependencies close.',
    '- `done`: closed with accepted evidence or equivalent verified closure.',
    '',
    '## Lane Verification Snapshot',
    '',
    buildLaneSummaryTable(lanes).trimEnd(),
    '',
    '## Active Work Items',
    '',
    fmt(headers),
    fmt(sep),
    ...rows.map(fmt),
    '',
  ].join('\n');
}

function buildOpenTaskRoute(tasks, lanes, doneSet, date) {
  const unblocked = tasks.filter((task) => isUnblocked(task, doneSet));
  const priorityOrder = (priority) => Number.parseInt(String(priority ?? 'P9').replace('P', ''), 10);

  unblocked.sort((a, b) => {
    const pa = priorityOrder(a.priority);
    const pb = priorityOrder(b.priority);
    if (pa !== pb) return pa - pb;
    const ga = a.parent_task ?? a.task_id;
    const gb = b.parent_task ?? b.task_id;
    if (ga !== gb) return ga.localeCompare(gb);
    return String(a.task_id).localeCompare(String(b.task_id));
  });

  const inProgress = tasks.filter((task) => normalizeStatus(task.status) === 'in_progress');
  const review = tasks.filter((task) => normalizeStatus(task.status) === 'review');

  const counts = {
    in_progress: tasks.filter((task) => normalizeStatus(task.status) === 'in_progress').length,
    review: tasks.filter((task) => normalizeStatus(task.status) === 'review').length,
    queued: tasks.filter((task) => normalizeStatus(task.status) === 'queued').length,
    blocked: tasks.filter((task) => normalizeStatus(task.status) === 'blocked').length,
  };

  const fmtRow = (task) =>
    `| \`${task.priority ?? '-'}\` | \`${task.task_id}\` | ${String(task.parent_task ?? 'none')} | ${normalizeComplexity(task)} | ${normalizeEffort(task)} | ${normalizeProgress(task)} | ${String(task.objective ?? '').replace(/\n/g, ' ')} | ${String(task.target ?? '').replace(/\n/g, ' ')} |`;

  const activeSection = (label, list) => {
    if (list.length === 0) return [];
    return [
      `### ${label}`,
      '',
      '| Priority | Task ID | Parent | Complexity | Effort | Progress | Objective | Next action |',
      '| -------- | ------- | ------ | ---------- | ------ | -------- | --------- | ----------- |',
      ...list.map(fmtRow),
      '',
    ];
  };

  const laneSummaryLines = lanes.map((lane) => {
    const summary = summarizeLane(lane);
    return `- \`${lane.lane_id}\` ${lane.title}: \`${summary.lane_progress_pct ?? 0}%\` progress, \`${summary.completed_weighted_points ?? 0}/${summary.total_effort_points ?? 0}\` weighted points`;
  });

  return [
    '---',
    'title: Open Task Route',
    'status: generated',
    'owner: generated',
    `last_reviewed: ${date}`,
    'planning_type: status',
    '---',
    '',
    '<!-- This file is generated by `pnpm docs:workboard:generate`. Do not edit by hand. -->',
    '',
    '# Open Task Route',
    '',
    `Fast execution route for selecting the next task. Generated on ${date}.`,
    '',
    'Verified task registry source: [agent-lane YAML files](./agent-lane-a.yaml).',
    '',
    '## Current Open Snapshot',
    '',
    `- \`in_progress\`: ${counts.in_progress}`,
    `- \`review\`: ${counts.review}`,
    `- \`queued\`: ${counts.queued}`,
    `- \`blocked\`: ${counts.blocked}`,
    '- `done`: tracked in closeouts and evidence (not listed here)',
    '',
    '## Lane Progress Snapshot',
    '',
    ...laneSummaryLines,
    '',
    '## Active',
    '',
    ...activeSection('In Progress', inProgress),
    ...activeSection('In Review', review),
    '## Actionable Now (Strictly Unblocked)',
    '',
    '| Priority | Task ID | Parent | Complexity | Effort | Progress | Objective | Next action |',
    '| -------- | ------- | ------ | ---------- | ------ | -------- | --------- | ----------- |',
    ...unblocked.map(fmtRow),
    '',
  ].join('\n');
}

function main() {
  const lanes = loadLanes();
  const tasks = collectTasks(lanes);
  const doneSet = buildDoneSet(tasks);

  const workboardDate = resolveGeneratedDate(workboardPath, (date) => buildWorkboard(tasks, lanes, date));
  const openTaskDate = resolveGeneratedDate(openTaskPath, (date) =>
    buildOpenTaskRoute(tasks, lanes, doneSet, date)
  );

  fs.writeFileSync(workboardPath, buildWorkboard(tasks, lanes, workboardDate), 'utf8');
  fs.writeFileSync(openTaskPath, buildOpenTaskRoute(tasks, lanes, doneSet, openTaskDate), 'utf8');

  console.log('[docs:workboard:generate] Updated execution-workboard.md and open-task-route.md');
}

main();
