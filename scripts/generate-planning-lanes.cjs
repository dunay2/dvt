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

function isDoneStatus(status) {
  return String(status || '').trim().toLowerCase() === 'done';
}

function renderTaskLine(task) {
  const checked = isDoneStatus(task.status) ? '[x]' : '[ ]';
  const priority = task.priority ? `\`${task.priority}\`` : '`P?`';
  const taskId = task.task_id ? `\`${task.task_id}\`` : '`unassigned-task`';
  const objective = String(task.objective || '').trim().replace(/\s+/g, ' ');
  return `- ${checked} ${priority} ${taskId}: ${objective}`;
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

function replaceSection(content, startHeading, endHeading, replacement) {
  const start = content.indexOf(startHeading);
  if (start === -1) {
    throw new Error(`Could not find "${startHeading}" in lane document.`);
  }
  const end = endHeading ? content.indexOf(endHeading, start + startHeading.length) : -1;
  if (end === -1) {
    return `${content.slice(0, start)}${replacement}`;
  }
  return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
}

function renderTasksSection(spec, yamlFileName) {
  const lines = [
    '## Tasks',
    '',
    `> Source of truth: \`${yamlFileName}\`. Edit the YAML and run \`pnpm docs:sync\`.`,
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

function updateLaneDoc(yamlFileName) {
  const yamlPath = path.join(stateDir, yamlFileName);
  const mdPath = yamlPath.replace(/\.yaml$/i, '.md');
  const spec = loadYaml(yamlPath);

  if (!spec || typeof spec !== 'object') {
    throw new Error(`Planning lane YAML is not an object: ${yamlFileName}`);
  }

  const current = readIfExists(mdPath);
  if (current === null) {
    throw new Error(`Missing planning lane markdown: ${path.relative(repoRoot, mdPath)}`);
  }

  let next = current;
  next = replaceSection(next, '## Tasks', '## Dependencies', renderTasksSection(spec, yamlFileName));
  next = replaceSection(
    next,
    '## Dependencies',
    '## Expected Outcome',
    renderDependenciesSection(spec)
  );
  next = replaceSection(next, '## Expected Outcome', null, renderExpectedOutcomeSection(spec));

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
