#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const appsRoot = path.join(repoRoot, 'apps');
const outputPath = path.join(repoRoot, 'docs', 'planning', 'status', 'generated-code-state.md');

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function relFromRepo(abs) {
  return toPosix(path.relative(repoRoot, abs));
}

function walk(dir, predicate) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'site') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs, predicate));
      continue;
    }
    if (!predicate || predicate(abs, entry.name)) out.push(abs);
  }
  return out;
}

function safeReadJson(absPath) {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function markdownTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const row = (cells) => `| ${cells.map((c, i) => String(c).padEnd(widths[i], ' ')).join(' | ')} |`;
  const sep = `| ${widths.map((w) => '-'.repeat(Math.max(3, w))).join(' | ')} |`;
  return [row(headers), sep, ...rows.map((r) => row(r))];
}

function collectWorkspaceDirs(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const direct = fs
    .readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(rootDir, d.name));

  const out = [];
  for (const dir of direct) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      out.push(dir);
      continue;
    }
    const nested = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(dir, d.name))
      .filter((child) => fs.existsSync(path.join(child, 'package.json')));
    out.push(...nested);
  }

  return out.sort((a, b) => relFromRepo(a).localeCompare(relFromRepo(b), 'en'));
}

function collectWorkspaceStats(dir) {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = safeReadJson(pkgPath) || {};
  const scripts = pkg.scripts || {};

  const srcFiles = fs.existsSync(path.join(dir, 'src'))
    ? walk(path.join(dir, 'src'), (_, name) => /\.(ts|tsx|js|jsx|json)$/.test(name))
    : [];
  const testFiles = fs.existsSync(path.join(dir, 'test'))
    ? walk(path.join(dir, 'test'), (_, name) => /\.(ts|tsx|js|jsx)$/.test(name))
    : [];

  const exportedSymbols = (() => {
    const indexTs = path.join(dir, 'src', 'index.ts');
    if (!fs.existsSync(indexTs)) return '-';
    const content = fs.readFileSync(indexTs, 'utf8');
    const exportLines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('export ')).length;
    return String(exportLines);
  })();

  return {
    workspace: pkg.name || relFromRepo(dir),
    path: relFromRepo(dir),
    src: srcFiles.length,
    tests: testFiles.length,
    hasBuild: scripts.build ? 'yes' : 'no',
    hasTest: scripts.test ? 'yes' : 'no',
    hasTypecheck: scripts.typecheck || scripts['type-check'] ? 'yes' : 'no',
    exports: exportedSymbols,
  };
}

function renderDoc(workspaces) {
  const utcDate = process.env.DOCS_STATUS_DATE || new Date().toISOString().slice(0, 10);
  const totalSrc = workspaces.reduce((acc, w) => acc + w.src, 0);
  const totalTests = workspaces.reduce((acc, w) => acc + w.tests, 0);
  const withBuild = workspaces.filter((w) => w.hasBuild === 'yes').length;
  const withTest = workspaces.filter((w) => w.hasTest === 'yes').length;

  const summaryRows = [
    ['Total workspaces', String(workspaces.length)],
    ['Total source files', String(totalSrc)],
    ['Total test files', String(totalTests)],
    ['Workspaces with build script', `${withBuild}/${workspaces.length}`],
    ['Workspaces with test script', `${withTest}/${workspaces.length}`],
  ];

  const workspaceRows = workspaces.map((w) => [
    w.workspace,
    `\`${w.path}\``,
    String(w.src),
    String(w.tests),
    w.hasBuild,
    w.hasTest,
    w.hasTypecheck,
    w.exports,
  ]);

  const lines = [
    '---',
    'title: Generated Code State',
    'status: Active',
    'owner: docs',
    `last_reviewed: ${utcDate}`,
    'planning_type: status',
    '---',
    '',
    '# Generated Code State',
    '',
    `Generated automatically from repository code on ${utcDate}.`,
    '',
    '## Summary',
    '',
    ...markdownTable(['Metric', 'Value'], summaryRows),
    '',
    '## Workspace Matrix',
    '',
    ...markdownTable(
      [
        'Workspace',
        'Path',
        'Src Files',
        'Test Files',
        'Build',
        'Test',
        'Typecheck',
        'Exports in src/index.ts',
      ],
      workspaceRows
    ),
    '',
    '> This page is auto-generated by `pnpm docs:status:generate`. Do not edit manually.',
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
  const workspaceDirs = [
    ...collectWorkspaceDirs(packagesRoot),
    ...collectWorkspaceDirs(appsRoot),
  ].sort((a, b) => relFromRepo(a).localeCompare(relFromRepo(b), 'en'));

  const stats = workspaceDirs.map(collectWorkspaceStats);
  const content = renderDoc(stats);
  const changed = writeIfChanged(outputPath, content);
  if (changed) {
    console.log(`[docs:status:generate] Updated ${relFromRepo(outputPath)}`);
  } else {
    console.log(`[docs:status:generate] ${relFromRepo(outputPath)} already up to date.`);
  }
}

main();
