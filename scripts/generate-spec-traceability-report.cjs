#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');
const outputPath = path.join(
  repoRoot,
  'docs',
  'planning',
  'status',
  'generated-spec-traceability.md'
);

const CANONICAL_SECTIONS = new Set([
  'adr',
  'architecture',
  'contracts',
  'guides',
  'runbooks',
  'planning',
  'evidence',
  'risk-register',
]);

const CODE_ROOT_PREFIXES = ['packages/', 'apps/', 'scripts/', 'tools/'];

function toPosix(value) {
  return value.replace(/\\/g, '/');
}

function relFromRepo(absPath) {
  return toPosix(path.relative(repoRoot, absPath));
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

function markdownTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => String(row[index]).length))
  );
  const renderRow = (cells) =>
    `| ${cells.map((cell, index) => String(cell).padEnd(widths[index], ' ')).join(' | ')} |`;
  const separator = `| ${widths.map((width) => '-'.repeat(Math.max(3, width))).join(' | ')} |`;
  return [renderRow(headers), separator, ...rows.map((row) => renderRow(row))];
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function extractFirstHeading(raw) {
  const match = raw.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function findMarkdownLinks(raw) {
  const results = [];
  const regex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match = regex.exec(raw);
  while (match) {
    results.push(match[1]);
    match = regex.exec(raw);
  }
  return results;
}

function normalizeMarkdownTarget(fromFile, target) {
  if (!target || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#')) {
    return null;
  }
  const cleanTarget = target.split('#')[0].split('?')[0];
  if (cleanTarget.length === 0) return null;
  const resolved = path.resolve(path.dirname(fromFile), cleanTarget);
  if (!resolved.startsWith(repoRoot)) return null;
  if (!fs.existsSync(resolved)) return null;
  return relFromRepo(resolved);
}

function sectionOf(relPath) {
  const parts = relPath.split('/');
  return parts[1] || 'unknown';
}

function isCanonicalDoc(relPath) {
  const parts = relPath.split('/');
  return parts[0] === 'docs' && CANONICAL_SECTIONS.has(parts[1]);
}

function percentage(part, total) {
  if (total === 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function collectDocs() {
  const files = walk(docsRoot, (abs, name) => name.endsWith('.md'));
  return files.map((absPath) => {
    const relPath = relFromRepo(absPath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const frontmatter = parseFrontmatter(raw);
    const links = findMarkdownLinks(raw)
      .map((link) => normalizeMarkdownTarget(absPath, link))
      .filter(Boolean);

    const codeLinks = links.filter((link) => CODE_ROOT_PREFIXES.some((prefix) => link.startsWith(prefix)));
    const adrLinks = links.filter((link) => link.startsWith('docs/adr/'));
    const title = frontmatter.title || extractFirstHeading(raw) || path.basename(absPath, '.md');

    return {
      absPath,
      relPath,
      section: sectionOf(relPath),
      canonical: isCanonicalDoc(relPath),
      title,
      status: frontmatter.status || '-',
      owner: frontmatter.owner || '-',
      codeLinks,
      adrLinks,
      hasCodeLinks: codeLinks.length > 0,
      hasAdrLinks: adrLinks.length > 0,
    };
  });
}

function collectCode() {
  const roots = ['packages', 'apps'];
  const files = roots.flatMap((root) =>
    walk(path.join(repoRoot, root), (abs, name) => /\.(ts|tsx|js|jsx)$/.test(name))
  );

  return files.map((absPath) => {
    const relPath = relFromRepo(absPath);
    const raw = fs.readFileSync(absPath, 'utf8');
    const hasFileTag = /@file\s+/m.test(raw);
    const baselineMatches = [...raw.matchAll(/@baseline\s+(ADR-[0-9]{4}[A-Za-z]?)/g)].map((match) =>
      match[1].toUpperCase()
    );
    const docMatches = [...raw.matchAll(/@docs?\s+([^\s*]+)/g)].map((match) => match[1]);
    return {
      relPath,
      workspace: workspaceOf(relPath),
      hasFileTag,
      baselineAdrs: baselineMatches,
      docRefs: docMatches,
      hasBaseline: baselineMatches.length > 0,
      hasDocRefs: docMatches.length > 0,
    };
  });
}

function workspaceOf(relPath) {
  const parts = relPath.split('/');
  if (parts[0] === 'apps' && parts.length >= 2) {
    return parts.slice(0, 2).join('/');
  }
  if (parts[0] === 'packages' && parts[1] && parts[1].startsWith('@') && parts.length >= 3) {
    return parts.slice(0, 3).join('/');
  }
  if (parts[0] === 'packages' && parts.length >= 2) {
    return parts.slice(0, 2).join('/');
  }
  return parts.slice(0, Math.min(parts.length, 2)).join('/') || relPath;
}

function renderDoc(docs, code) {
  const generatedAt = new Date().toISOString().slice(0, 10);
  const canonicalDocs = docs.filter((doc) => doc.canonical);
  const docsWithCodeLinks = canonicalDocs.filter((doc) => doc.hasCodeLinks);
  const docsWithAdrLinks = canonicalDocs.filter((doc) => doc.hasAdrLinks);
  const codeWithBaseline = code.filter((file) => file.hasBaseline);
  const codeWithDocRefs = code.filter((file) => file.hasDocRefs);

  const sectionRows = [...new Set(canonicalDocs.map((doc) => doc.section))]
    .sort((left, right) => left.localeCompare(right))
    .map((section) => {
      const sectionDocs = canonicalDocs.filter((doc) => doc.section === section);
      const withCodeLinks = sectionDocs.filter((doc) => doc.hasCodeLinks).length;
      const withAdrLinks = sectionDocs.filter((doc) => doc.hasAdrLinks).length;
      return [
        section,
        sectionDocs.length,
        `${withCodeLinks} (${percentage(withCodeLinks, sectionDocs.length)})`,
        `${withAdrLinks} (${percentage(withAdrLinks, sectionDocs.length)})`,
      ];
    });

  const workspaceRows = [...new Set(code.map((file) => file.workspace))]
    .sort((left, right) => left.localeCompare(right))
    .map((workspace) => {
      const workspaceFiles = code.filter((file) => file.workspace === workspace);
      const withBaseline = workspaceFiles.filter((file) => file.hasBaseline).length;
      const withDocRefs = workspaceFiles.filter((file) => file.hasDocRefs).length;
      return [
        workspace,
        workspaceFiles.length,
        `${withBaseline} (${percentage(withBaseline, workspaceFiles.length)})`,
        `${withDocRefs} (${percentage(withDocRefs, workspaceFiles.length)})`,
      ];
    });

  const missingCodeLinkRows = canonicalDocs
    .filter((doc) => !doc.hasCodeLinks && doc.status.toLowerCase() !== 'archived')
    .sort((left, right) => left.relPath.localeCompare(right.relPath))
    .slice(0, 40)
    .map((doc) => [doc.section, `[${doc.title}](${path.posix.relative('docs/planning/status', doc.relPath)})`, doc.status]);

  const duplicateLanguageRows = docs
    .filter((doc) => doc.relPath.endsWith('.en.md'))
    .map((doc) => {
      const baseRel = doc.relPath.replace(/\.en\.md$/i, '.md');
      return {
        english: doc.relPath,
        canonicalPairExists: docs.some((candidate) => candidate.relPath === baseRel),
        pair: baseRel,
      };
    })
    .filter((entry) => entry.canonicalPairExists)
    .sort((left, right) => left.english.localeCompare(right.english))
    .map((entry) => [entry.english, entry.pair]);

  const lines = [
    '---',
    'title: Generated Spec Traceability',
    'status: Active',
    'owner: docs',
    `last_reviewed: ${generatedAt}`,
    'planning_type: status',
    '---',
    '',
    '# Generated Spec Traceability',
    '',
    `Generated automatically from repository documentation and source-code signals on ${generatedAt}.`,
    '',
    '## Summary',
    '',
    ...markdownTable(
      ['Metric', 'Value'],
      [
        ['Canonical docs scanned', canonicalDocs.length],
        ['Canonical docs with code links', `${docsWithCodeLinks.length} (${percentage(docsWithCodeLinks.length, canonicalDocs.length)})`],
        ['Canonical docs with ADR links', `${docsWithAdrLinks.length} (${percentage(docsWithAdrLinks.length, canonicalDocs.length)})`],
        ['Code files scanned', code.length],
        ['Code files with ADR baseline tags', `${codeWithBaseline.length} (${percentage(codeWithBaseline.length, code.length)})`],
        ['Code files with explicit doc refs', `${codeWithDocRefs.length} (${percentage(codeWithDocRefs.length, code.length)})`],
      ]
    ),
    '',
    '## Canonical Doc Coverage By Section',
    '',
    ...markdownTable(['Section', 'Docs', 'Docs With Code Links', 'Docs With ADR Links'], sectionRows),
    '',
    '## Source Traceability By Workspace',
    '',
    ...markdownTable(['Workspace', 'Files', 'Files With ADR Baselines', 'Files With Doc Refs'], workspaceRows),
    '',
    '## Canonical Docs Missing Code Links',
    '',
    ...(missingCodeLinkRows.length > 0
      ? markdownTable(['Section', 'Document', 'Status'], missingCodeLinkRows)
      : ['All canonical docs currently link to source files.']),
    '',
    '## Duplicate Language Pairs Detected',
    '',
    ...(duplicateLanguageRows.length > 0
      ? markdownTable(['English Variant', 'Base Variant'], duplicateLanguageRows)
      : ['No `.en.md` / base-language pairs detected.']),
    '',
    '## Recommended Convention',
    '',
    '- Canonical docs SHOULD declare source-code references through markdown links and frontmatter metadata.',
    '- Source files SHOULD declare architectural traceability with `@baseline ADR-...` and MAY add `@docs ...` links.',
    '- Active specification documents SHOULD have at least one code reference or an explicit `reference-only` status model.',
    '',
    '> This page is auto-generated by `pnpm docs:traceability:generate`. Do not edit manually.',
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
  const docs = collectDocs();
  const code = collectCode();
  const content = renderDoc(docs, code);
  const changed = writeIfChanged(outputPath, content);
  if (changed) {
    console.log('[docs:traceability:generate] Updated docs/planning/status/generated-spec-traceability.md');
  } else {
    console.log('[docs:traceability:generate] docs/planning/status/generated-spec-traceability.md already up to date.');
  }
}

main();
