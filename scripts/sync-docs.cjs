#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');
const docsIndex = path.join(docsRoot, 'index.md');
const docsIndexUpper = path.join(docsRoot, 'INDEX.md');
const mkdocsPath = path.join(repoRoot, 'mkdocs.yml');
const adrDir = path.join(docsRoot, 'adr');
const adrLandingPath = path.join(adrDir, 'index.md');

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf8');
}

function writeIfChanged(filePath, next) {
  const current = readIfExists(filePath);
  if (current === next) {
    return false;
  }
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function toIsoDateUTC() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseFrontmatter(source) {
  const result = {};
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return result;
  }

  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      result[kv[1]] = kv[2];
    }
  }
  return result;
}

function frontmatterWithDefaults(currentContent, defaults) {
  const current = currentContent ? parseFrontmatter(currentContent) : {};
  return {
    title: current.title || defaults.title || 'Index',
    status: current.status || defaults.status || 'Active',
    owner: current.owner || defaults.owner || 'docs',
    last_reviewed:
      current.last_reviewed || defaults.last_reviewed || toIsoDateUTC(),
  };
}

function renderFrontmatter(meta) {
  return [
    '---',
    `title: ${meta.title}`,
    `status: ${meta.status}`,
    `owner: ${meta.owner}`,
    `last_reviewed: ${meta.last_reviewed}`,
    '---',
    '',
  ].join('\n');
}

function humanizeName(fileName) {
  const stem = fileName.replace(/\.[^.]+$/i, '');
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractFirstHeading(content) {
  const heading = content.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : null;
}

function scanSectionEntries(sectionRelativePath) {
  const dirAbs = path.join(docsRoot, sectionRelativePath);
  if (!fs.existsSync(dirAbs)) {
    return [];
  }

  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const rows = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const absPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      const lowerIndex = path.join(absPath, 'index.md');
      const upperIndex = path.join(absPath, 'INDEX.md');
      if (fs.existsSync(lowerIndex)) {
        rows.push({
          type: 'dir',
          label: humanizeName(entry.name),
          link: `${entry.name}/index.md`,
        });
      } else if (fs.existsSync(upperIndex)) {
        rows.push({
          type: 'dir',
          label: humanizeName(entry.name),
          link: `${entry.name}/INDEX.md`,
        });
      }
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.md' && ext !== '.txt') {
      continue;
    }

    if (/^index\.md$/i.test(entry.name)) {
      continue;
    }

    const fileContent = readIfExists(absPath) || '';
    const heading = ext === '.md' ? extractFirstHeading(fileContent) : null;
    rows.push({
      type: 'file',
      label: heading || humanizeName(entry.name),
      link: entry.name,
    });
  }

  rows.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'dir' ? -1 : 1;
    }
    return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
  });

  return rows;
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

function adrSortKey(fileName) {
  const match = /^ADR-(\d{4})([A-Za-z]?)/.exec(fileName);
  if (!match) {
    return { num: -1, suffix: '' };
  }
  return { num: Number(match[1]), suffix: (match[2] || '').toUpperCase() };
}

function extractAdrTitle(content, fileName) {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading) {
    return heading[1]
      .replace(/^ADR-\d{4}[A-Za-z]?\s*(:|-|--|–|—|â€“|â€”)\s*/i, '')
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
      return {
        fileName: name,
        adrId: adrIdMatch ? adrIdMatch[0].toUpperCase() : name,
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

  const current = readIfExists(adrLandingPath);
  const meta = frontmatterWithDefaults(current, {
    title: 'ADRs',
    status: 'Active',
    owner: 'docs',
  });

  const lines = [
    renderFrontmatter(meta),
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
        `| ${row.adrId} | ${row.title.replace(/\|/g, '\\|')} | ${row.status.replace(/\|/g, '\\|')} | ${row.date.replace(/\|/g, '\\|')} | [${row.fileName}](${encodeURI(row.fileName)}) |`
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
  if (writeIfChanged(adrLandingPath, next)) {
    console.log('[docs:sync] Regenerated docs/adr/index.md');
  } else {
    console.log('[docs:sync] docs/adr/index.md already up to date.');
  }
}

const sectionConfigs = [
  {
    relPath: 'architecture',
    defaults: {
      title: 'Architecture',
      status: 'Active',
      owner: 'docs',
    },
    intro:
      'Technical architecture specifications (normative when marked Accepted/Active).',
  },
  {
    relPath: 'contracts',
    defaults: {
      title: 'Contracts',
      status: 'Active',
      owner: 'docs',
    },
    intro: 'Normative contracts (schemas, version matrices, API/event contracts).',
  },
  {
    relPath: 'planning',
    defaults: {
      title: 'Planning',
      status: 'Review',
      owner: 'docs',
    },
    intro: 'Roadmaps, proposals, reviews, and non-normative planning artifacts.',
  },
  {
    relPath: 'guides',
    defaults: {
      title: 'Guides',
      status: 'Active',
      owner: 'docs',
    },
    intro: 'Developer guides, contribution guides, and quality standards.',
  },
  {
    relPath: 'runbooks',
    defaults: {
      title: 'Runbooks',
      status: 'Active',
      owner: 'docs',
    },
    intro: 'Operational runbooks for incidents, recovery, and maintenance.',
  },
  {
    relPath: 'archive',
    defaults: {
      title: 'Archive',
      status: 'Archived',
      owner: 'docs',
    },
    intro: 'Frozen historical documentation retained for reference.',
  },
  {
    relPath: 'adr/_drafts',
    defaults: {
      title: 'ADR Drafts',
      status: 'Draft',
      owner: 'docs',
    },
    intro: 'Work-in-progress ADRs. Not normative.',
  },
  {
    relPath: 'adr/_archive',
    defaults: {
      title: 'ADR Archive',
      status: 'Archived',
      owner: 'docs',
    },
    intro: 'Superseded or retired ADRs. Historical reference only.',
  },
];

function generateSectionIndexes() {
  for (const section of sectionConfigs) {
    const indexPath = path.join(docsRoot, section.relPath, 'index.md');
    const current = readIfExists(indexPath);
    const meta = frontmatterWithDefaults(current, section.defaults);
    const rows = scanSectionEntries(section.relPath);

    const lines = [
      renderFrontmatter(meta),
      `# ${meta.title}`,
      '',
      section.intro,
      '',
      '## Index',
      '',
      ...rows.map((row) => `- [${row.label}](${encodeURI(row.link)})`),
      '',
      '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
      '',
    ];

    const next = lines.join('\n');
    if (writeIfChanged(indexPath, next)) {
      console.log(`[docs:sync] Regenerated ${path.relative(repoRoot, indexPath)}`);
    } else {
      console.log(
        `[docs:sync] ${path.relative(repoRoot, indexPath)} already up to date.`
      );
    }
  }
}

function main() {
  ensureCanonicalDocsHome();
  ensureMkdocsHomeRoot();
  generateAdrLanding();
  generateSectionIndexes();
  console.log('[docs:sync] Completed.');
}

try {
  main();
} catch (error) {
  console.error(`[docs:sync] ERROR: ${error.message}`);
  process.exit(1);
}
