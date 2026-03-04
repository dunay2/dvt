#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const docsIndex = path.join(repoRoot, 'docs', 'index.md');
const docsIndexUpper = path.join(repoRoot, 'docs', 'INDEX.md');
const mkdocsPath = path.join(repoRoot, 'mkdocs.yml');
const adrDir = path.join(repoRoot, 'docs', 'adr');
const adrLandingPath = path.join(adrDir, 'index.md');

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function ensureCanonicalDocsHome() {
  const lower = readIfExists(docsIndex);
  const upper = readIfExists(docsIndexUpper);

  if (lower === null && upper === null) {
    throw new Error('Missing docs home file: expected docs/index.md.');
  }

  if (lower === null && upper !== null) {
    fs.copyFileSync(docsIndexUpper, docsIndex);
    console.log('[docs:sync] Created docs/index.md from docs/INDEX.md');
    return;
  }

  if (lower !== null && upper !== null) {
    if (lower !== upper) {
      throw new Error(
        'Detected divergent docs/index.md and docs/INDEX.md. Keep only docs/index.md to avoid homepage routing issues.'
      );
    }
    console.log(
      '[docs:sync] docs/INDEX.md duplicate detected with identical content. Keeping docs/index.md as canonical.'
    );
    return;
  }

  console.log('[docs:sync] docs/index.md is canonical.');
}

function ensureMkdocsHomeRoot() {
  const source = readIfExists(mkdocsPath);
  if (source === null) {
    throw new Error('Missing mkdocs.yml');
  }

  const lines = source.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().startsWith('- Home:')) {
      const indent = lines[i].match(/^\s*/)[0];
      const target = `${indent}- Home: /`;
      if (lines[i] !== target) {
        lines[i] = target;
        changed = true;
      }
      break;
    }
  }

  if (changed) {
    fs.writeFileSync(mkdocsPath, `${lines.join('\n')}\n`, 'utf8');
    console.log('[docs:sync] Normalized mkdocs Home nav to "/"');
  } else {
    console.log('[docs:sync] mkdocs Home nav already normalized.');
  }
}

function toIsoDateUTC() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapePipes(text) {
  return text.replace(/\|/g, '\\|');
}

function adrSortKey(fileName) {
  const match = /^ADR-(\d{4})([A-Za-z]?)/.exec(fileName);
  if (!match) {
    return { num: -1, suffix: '' };
  }
  return {
    num: Number(match[1]),
    suffix: (match[2] || '').toUpperCase(),
  };
}

function extractAdrTitle(content, fileName) {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading) {
    return heading[1]
      .replace(/^ADR-\d{4}[A-Za-z]?\s*(:|-|–|—|â€“|â€”)\s*/i, '')
      .trim();
  }

  const nonEmpty = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (nonEmpty.length >= 2 && /^ADR-\d{4}[A-Za-z]?$/i.test(nonEmpty[0])) {
    return nonEmpty[1];
  }

  return fileName.replace(/\.md$/i, '');
}

function extractField(content, fieldName) {
  const bulletPattern = new RegExp(
    `^-\\s*\\*\\*${fieldName}\\*\\*:\\s*(.+)$`,
    'im'
  );
  const plainPattern = new RegExp(`^${fieldName}:\\s*(.+)$`, 'im');
  const bulletMatch = content.match(bulletPattern);
  if (bulletMatch) {
    return bulletMatch[1].trim();
  }
  const plainMatch = content.match(plainPattern);
  if (plainMatch) {
    return plainMatch[1].trim();
  }
  return '-';
}

function generateAdrLanding() {
  if (!fs.existsSync(adrDir)) {
    throw new Error('Missing docs/adr directory.');
  }

  const entries = fs
    .readdirSync(adrDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^ADR-.*\.md$/i.test(name))
    .filter(
      (name) =>
        !/^ADR-(Index|Implementation Status|Status_Board_Extensive)\.md$/i.test(
          name
        )
    );

  const adrRows = entries
    .map((name) => {
      const fullPath = path.join(adrDir, name);
      const content = fs.readFileSync(fullPath, 'utf8');
      const key = adrSortKey(name);
      const adrIdMatch = /^ADR-\d{4}[A-Za-z]?/i.exec(name);
      const adrId = adrIdMatch ? adrIdMatch[0].toUpperCase() : name;
      return {
        fileName: name,
        adrId,
        title: extractAdrTitle(content, name),
        status: extractField(content, 'Status'),
        date: extractField(content, 'Date'),
        sortKey: key,
      };
    })
    .sort((a, b) => {
      if (a.sortKey.num !== b.sortKey.num) {
        return b.sortKey.num - a.sortKey.num;
      }
      return a.sortKey.suffix.localeCompare(b.sortKey.suffix);
    });

  const lines = [
    '---',
    'title: ADRs',
    'status: Active',
    'owner: docs',
    `last_reviewed: ${toIsoDateUTC()}`,
    '---',
    '',
    '# ADRs',
    '',
    'Canonical catalog of architecture decisions in this repository.',
    '',
    '## ADR Catalog',
    '',
    '| ADR | Title | Status | Date | File |',
    '| --- | ----- | ------ | ---- | ---- |',
    ...adrRows.map(
      (row) =>
        `| ${escapePipes(row.adrId)} | ${escapePipes(row.title)} | ${escapePipes(row.status)} | ${escapePipes(row.date)} | [${row.fileName}](${encodeURI(row.fileName)}) |`
    ),
    '',
    '## Related',
    '',
    '- [Full ADR catalog details](ADR-Index.md)',
    '- [ADR implementation status](ADR-Implementation%20Status.md)',
    '- [Draft ADRs](_drafts/index.md)',
    '- [Archived ADRs](_archive/index.md)',
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];

  const next = lines.join('\n');
  const current = readIfExists(adrLandingPath);
  if (current !== next) {
    fs.writeFileSync(adrLandingPath, next, 'utf8');
    console.log('[docs:sync] Regenerated docs/adr/index.md');
  } else {
    console.log('[docs:sync] docs/adr/index.md already up to date.');
  }
}

function main() {
  ensureCanonicalDocsHome();
  ensureMkdocsHomeRoot();
  generateAdrLanding();
  console.log('[docs:sync] Completed.');
}

try {
  main();
} catch (error) {
  console.error(`[docs:sync] ERROR: ${error.message}`);
  process.exit(1);
}
