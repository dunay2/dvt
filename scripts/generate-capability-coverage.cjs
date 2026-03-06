#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'docs', 'planning', 'status', 'generated-capability-coverage.md');
const rootPkgPath = path.join(repoRoot, 'package.json');

function fileExists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
}

function countFiles(relDir, pattern) {
  const absDir = path.join(repoRoot, relDir);
  if (!fs.existsSync(absDir)) return 0;
  const out = [];
  const stack = [absDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'site') continue;
        stack.push(abs);
        continue;
      }
      if (!pattern || pattern.test(entry.name)) out.push(abs);
    }
  }
  return out.length;
}

function readRootScripts() {
  try {
    const raw = fs.readFileSync(rootPkgPath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.scripts || {};
  } catch {
    return {};
  }
}

function scoreCapability(checks) {
  const totalWeight = checks.reduce((acc, c) => acc + c.weight, 0);
  const earned = checks.reduce((acc, c) => acc + (c.ok ? c.weight : 0), 0);
  const percent = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);
  return { percent, earned, totalWeight };
}

function markdownTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const row = (cells) => `| ${cells.map((c, i) => String(c).padEnd(widths[i], ' ')).join(' | ')} |`;
  const sep = `| ${widths.map((w) => '-'.repeat(Math.max(3, w))).join(' | ')} |`;
  return [row(headers), sep, ...rows.map((r) => row(r))];
}

function evaluateCapabilities() {
  const scripts = readRootScripts();
  const hasScript = (name) => typeof scripts[name] === 'string' && scripts[name].trim().length > 0;

  const capabilities = [
    {
      name: 'Engine Core',
      checks: [
        { label: 'engine source exists', ok: countFiles('packages/@dvt/engine/src', /\.(ts|tsx)$/) > 0, weight: 35 },
        { label: 'engine tests exist', ok: countFiles('packages/@dvt/engine/test', /\.(ts|tsx)$/) > 0, weight: 35 },
        { label: 'test:engine script', ok: hasScript('test:engine'), weight: 30 },
      ],
    },
    {
      name: 'Planner',
      checks: [
        { label: 'planner source exists', ok: countFiles('packages/@dvt/planner/src', /\.(ts|tsx)$/) > 0, weight: 35 },
        { label: 'planner tests exist', ok: countFiles('packages/@dvt/planner/test', /\.(ts|tsx)$/) > 0, weight: 35 },
        { label: 'planner package exists', ok: fileExists('packages/@dvt/planner/package.json'), weight: 30 },
      ],
    },
    {
      name: 'Contracts',
      checks: [
        { label: 'contracts source exists', ok: countFiles('packages/@dvt/contracts/src', /\.(ts|tsx|json)$/) > 0, weight: 40 },
        { label: 'contracts specs exist', ok: countFiles('specs/contracts', /\.(md|json)$/) > 0, weight: 30 },
        { label: 'validate:contracts script', ok: hasScript('validate:contracts'), weight: 30 },
      ],
    },
    {
      name: 'Traceability',
      checks: [
        { label: 'traceability source exists', ok: countFiles('packages/@dvt/traceability-service/src', /\.(ts|tsx)$/) > 0, weight: 40 },
        { label: 'traceability tests exist', ok: countFiles('packages/@dvt/traceability-service/test', /\.(ts|tsx)$/) > 0, weight: 35 },
        { label: 'traceability package exists', ok: fileExists('packages/@dvt/traceability-service/package.json'), weight: 25 },
      ],
    },
    {
      name: 'Adapters',
      checks: [
        { label: 'temporal adapter source exists', ok: countFiles('packages/@dvt/adapter-temporal/src', /\.(ts|tsx)$/) > 0, weight: 35 },
        { label: 'postgres adapter source exists', ok: countFiles('packages/@dvt/adapter-postgres/src', /\.(ts|tsx)$/) > 0, weight: 35 },
        { label: 'adapter test scripts exist', ok: hasScript('test:adapter-temporal') && hasScript('test:adapter-postgres'), weight: 30 },
      ],
    },
    {
      name: 'Applications',
      checks: [
        { label: 'web app exists', ok: fileExists('apps/web/package.json'), weight: 35 },
        { label: 'api app exists', ok: fileExists('apps/api/package.json'), weight: 35 },
        { label: 'build:apps script', ok: hasScript('build:apps'), weight: 30 },
      ],
    },
  ];

  return capabilities.map((capability) => {
    const score = scoreCapability(capability.checks);
    const passing = capability.checks.filter((c) => c.ok).length;
    return {
      ...capability,
      score,
      passing,
      totalChecks: capability.checks.length,
    };
  });
}

function renderDoc(capabilities) {
  const generatedAt = new Date().toISOString().slice(0, 10);
  const avg =
    capabilities.length === 0
      ? 0
      : Math.round(
          capabilities.reduce((acc, c) => acc + c.score.percent, 0) / capabilities.length
        );

  const summaryRows = [
    ['Capabilities assessed', String(capabilities.length)],
    ['Average implementation coverage', `${avg}%`],
    ['Method', 'Code-signal weighted score (source/tests/scripts/package presence)'],
    ['Generated on', generatedAt],
  ];

  const capabilityRows = capabilities.map((c) => [
    c.name,
    `${c.score.percent}%`,
    `${c.passing}/${c.totalChecks}`,
    `${c.score.earned}/${c.score.totalWeight}`,
  ]);

  const detailLines = [];
  for (const c of capabilities) {
    detailLines.push(`### ${c.name}`);
    detailLines.push('');
    const rows = c.checks.map((check) => [
      check.ok ? 'yes' : 'no',
      check.label,
      String(check.weight),
    ]);
    detailLines.push(...markdownTable(['Signal', 'Check', 'Weight'], rows));
    detailLines.push('');
  }

  const lines = [
    '---',
    'title: Generated Capability Coverage',
    'status: Active',
    'owner: docs',
    `last_reviewed: ${generatedAt}`,
    'planning_type: status',
    '---',
    '',
    '# Generated Capability Coverage',
    '',
    `Generated automatically from repository code signals on ${generatedAt}.`,
    '',
    '## Summary',
    '',
    ...markdownTable(['Metric', 'Value'], summaryRows),
    '',
    '## Capability Coverage',
    '',
    ...markdownTable(['Capability', 'Coverage', 'Checks Passing', 'Weighted Score'], capabilityRows),
    '',
    '## Signals',
    '',
    ...detailLines,
    '> This page is auto-generated by `pnpm docs:capability:generate`. Do not edit manually.',
    '',
  ];

  return `${lines.join('\n')}`;
}

function writeIfChanged(absPath, content) {
  const current = fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf8') : null;
  if (current === content) return false;
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, content, 'utf8');
  return true;
}

function main() {
  const capabilities = evaluateCapabilities();
  const content = renderDoc(capabilities);
  const changed = writeIfChanged(outputPath, content);
  if (changed) {
    console.log('[docs:capability:generate] Updated docs/planning/status/generated-capability-coverage.md');
  } else {
    console.log('[docs:capability:generate] docs/planning/status/generated-capability-coverage.md already up to date.');
  }
}

main();
