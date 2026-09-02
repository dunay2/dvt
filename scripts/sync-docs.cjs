#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const { defaultPgUrl } = require('./planning-db-run.cjs');
const {
  readDocumentationLifecycleRows,
} = require('./planning-db/queries/documentation-lifecycle-query.cjs');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');

const docsIndex = path.join(docsRoot, 'index.md');
const docsIndexUpper = path.join(docsRoot, 'INDEX.md');
const adrDir = path.join(docsRoot, 'adr');
const adrLandingPath = path.join(adrDir, 'index.md');

const planningDir = path.join(docsRoot, 'planning');
const planningIndexPath = path.join(planningDir, 'index.md');
const planningProposalsPath = path.join(planningDir, 'proposals', 'index.md');
const planningReviewsPath = path.join(planningDir, 'reviews', 'index.md');
const planningStatusPath = path.join(planningDir, 'status', 'index.md');
const contractsDir = path.join(docsRoot, 'contracts');
const contractsEngineIndexPath = path.join(contractsDir, 'engine', 'index.md');
const contractsPlannerIndexPath = path.join(contractsDir, 'planner', 'index.md');
const contractsSharedIndexPath = path.join(contractsDir, 'shared', 'index.md');

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

function toIsoDateUTC() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function splitFrontmatter(source) {
  const normalizedSource = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const match = normalizedSource.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: {}, body: normalizedSource };
  }

  const frontmatter = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      frontmatter[kv[1]] = kv[2];
    }
  }

  return { frontmatter, body: normalizedSource.slice(match[0].length) };
}

function frontmatterWithDefaults(currentContent, defaults) {
  const current = currentContent ? splitFrontmatter(currentContent).frontmatter : {};
  return {
    title: current.title || defaults.title || 'Index',
    status: current.status || defaults.status || 'Active',
    owner: current.owner || defaults.owner || 'docs',
    last_reviewed: current.last_reviewed || defaults.last_reviewed || toIsoDateUTC(),
    planning_type: current.planning_type || defaults.planning_type || undefined,
  };
}

function renderFrontmatter(meta) {
  const lines = [
    '---',
    `title: ${meta.title}`,
    `status: ${meta.status}`,
    `owner: ${meta.owner}`,
    `last_reviewed: ${meta.last_reviewed}`,
  ];
  if (meta.planning_type) {
    lines.push(`planning_type: ${meta.planning_type}`);
  }
  lines.push('---', '');
  return lines.join('\n');
}

function humanizeName(fileName) {
  const stem = fileName.replace(/\.[^.]+$/i, '');
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderMarkdownTable(headers, rows) {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index].length))
  );
  const formatRow = (cells) =>
    `| ${cells.map((cell, index) => cell.padEnd(widths[index], ' ')).join(' | ')} |`;
  const separator = `| ${widths.map((width) => '-'.repeat(Math.max(width, 3))).join(' | ')} |`;
  return [formatRow(headers), separator, ...rows.map((row) => formatRow(row))];
}

function extractFirstHeading(content) {
  const heading = content.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : null;
}

function ensureCanonicalDocsHome() {
  const names = fs.existsSync(docsRoot) ? fs.readdirSync(docsRoot) : [];
  const hasLowerExact = names.includes('index.md');
  const hasUpperExact = names.includes('INDEX.md');
  const lower = hasLowerExact ? readIfExists(docsIndex) : null;
  const upper = hasUpperExact ? readIfExists(docsIndexUpper) : null;

  if (!hasLowerExact && !hasUpperExact) {
    throw new Error('Missing docs home file: expected docs/index.md.');
  }

  if (!hasLowerExact && hasUpperExact && upper !== null) {
    fs.renameSync(docsIndexUpper, docsIndex);
    console.log(
      '[docs:sync] Created docs/index.md from docs/INDEX.md and removed duplicate uppercase file.'
    );
    return;
  }

  if (hasLowerExact && hasUpperExact && lower !== null && upper !== null) {
    if (lower !== upper) {
      throw new Error(
        'Detected divergent docs/index.md and docs/INDEX.md. Keep only docs/index.md to avoid homepage routing issues.'
      );
    }
    fs.rmSync(docsIndexUpper);
    console.log('[docs:sync] Removed duplicate docs/INDEX.md; docs/index.md is canonical.');
    return;
  }

  console.log('[docs:sync] docs/index.md is canonical.');
}

function adrSortKey(fileName) {
  const match = /^ADR-(\d{4})([A-Za-z]?)/i.exec(fileName);
  if (!match) {
    return { num: -1, suffix: '' };
  }
  return { num: Number(match[1]), suffix: (match[2] || '').toUpperCase() };
}

function isExcludedAdrIndexFile(fileName) {
  const normalized = fileName.toLowerCase();
  return (
    normalized === 'adr-index.md' ||
    normalized === 'adr-implementation-status.md' ||
    normalized === 'adr-status_board_extensive.md'
  );
}

function extractAdrTitle(content, fileName) {
  const heading = content.match(/^#\s+(.+)$/m);
  if (heading) {
    return heading[1].trim();
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
  const bulletPattern = new RegExp(`^-\\s*\\*\\*${fieldName}\\*\\*:\\s*(.+)$`, 'im');
  const plainBulletPattern = new RegExp(`^-\\s*${fieldName}:\\s*(.+)$`, 'im');
  const plainPattern = new RegExp(`^${fieldName}:\\s*(.+)$`, 'im');
  const bulletMatch = content.match(bulletPattern);
  if (bulletMatch) {
    return bulletMatch[1].trim();
  }
  const plainBulletMatch = content.match(plainBulletPattern);
  if (plainBulletMatch) {
    return plainBulletMatch[1].trim();
  }
  const plainMatch = content.match(plainPattern);
  if (plainMatch) {
    return plainMatch[1].trim();
  }
  return '-';
}

function extractStructuredField(content, fieldName) {
  const { frontmatter } = splitFrontmatter(content);
  const frontmatterValue = frontmatter[fieldName];
  if (typeof frontmatterValue === 'string' && frontmatterValue.trim().length > 0) {
    return frontmatterValue.trim();
  }

  const topLevelPattern = new RegExp(`^${fieldName}:\\s*(.+)$`, 'im');
  const topLevelMatch = content.match(topLevelPattern);
  if (!topLevelMatch) {
    return null;
  }
  return topLevelMatch[1].trim();
}

function riskRegisterEntryKey(entryName, fileContent) {
  return (
    extractStructuredField(fileContent, 'id') || path.basename(entryName, path.extname(entryName))
  ).toLowerCase();
}

function riskRegisterEntryPrecedence(entryName) {
  switch (path.extname(entryName).toLowerCase()) {
    case '.yaml':
      return 4;
    case '.yml':
      return 3;
    case '.md':
      return 2;
    case '.txt':
      return 1;
    default:
      return 0;
  }
}

function generateAdrLanding(lifecycleAuthority) {
  if (!fs.existsSync(adrDir)) {
    throw new Error('Missing docs/adr directory.');
  }

  const entries = fs
    .readdirSync(adrDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /^ADR-.*\.md$/i.test(name))
    .filter((name) => !isExcludedAdrIndexFile(name))
    .filter((name) => shouldIncludeDocumentationPath(`docs/adr/${name}`, lifecycleAuthority));

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
      const suffixCompare = a.sortKey.suffix.localeCompare(b.sortKey.suffix, 'en', {
        sensitivity: 'base',
      });
      if (suffixCompare !== 0) {
        return suffixCompare;
      }
      return a.fileName.localeCompare(b.fileName, 'en', { sensitivity: 'base' });
    });

  const current = readIfExists(adrLandingPath);
  const meta = frontmatterWithDefaults(current, { title: 'ADRs', status: 'Active', owner: 'docs' });
  const adrTableRows = adrRows.map((row) => [
    row.adrId.replace(/\|/g, '\\|'),
    row.title.replace(/\|/g, '\\|'),
    row.status.replace(/\|/g, '\\|'),
    row.date.replace(/\|/g, '\\|'),
    `[${row.fileName}](${encodeURI(row.fileName)})`,
  ]);

  const lines = [
    renderFrontmatter(meta),
    '# ADRs',
    '',
    'Canonical catalog of architecture decisions in this repository.',
    '',
    '## ADR Catalog',
    '',
    ...renderMarkdownTable(['ADR', 'Title', 'Status', 'Date', 'File'], adrTableRows),
    '',
    '## Related',
    '',
    '- [Full ADR catalog details](adr-catalog.md)',
    '- [ADR implementation status](adr-implementation-status.md)',
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

function inferPlanningType(fileNameLower) {
  if (/(legacy|compatibility|historical)/.test(fileNameLower)) {
    return 'compatibility';
  }
  if (/(review|pass_2|architectural_review)/.test(fileNameLower)) {
    return 'review';
  }
  if (/(pending|debt|checklist|status|impact|rollback|estado)/.test(fileNameLower)) {
    return 'status';
  }
  if (
    /(proposal|specification|task|gap|plan|remediation|consumidor|migration|hito)/.test(
      fileNameLower
    )
  ) {
    return 'proposal';
  }
  return 'reference';
}

function shouldIncludePlanningDoc(status) {
  const normalized = String(status || '')
    .trim()
    .toLowerCase();
  return normalized !== 'superseded' && normalized !== 'archived';
}

function lifecycleStateIsPublishable(lifecycleRow = {}) {
  const lifecycleState = String(
    lifecycleRow.lifecycle_state || lifecycleRow.lifecycleState || lifecycleRow.status || ''
  )
    .trim()
    .toLowerCase();
  return ![
    'archive',
    'archived',
    'discarded',
    'disposable',
    'rejected',
    'retired',
    'superseded',
  ].includes(lifecycleState);
}

function lifecycleRowsByPath(authority) {
  return authority instanceof Map ? authority : authority?.rowsByPath;
}

function shouldIncludeDocumentationPath(documentPath, authority) {
  const normalizedPath = String(documentPath || '').replace(/\\/gu, '/');
  const rowsByPath = lifecycleRowsByPath(authority);
  if (!(rowsByPath instanceof Map)) return true;
  const lifecycleRow = rowsByPath.get(normalizedPath);
  if (!lifecycleRow) return true;
  return lifecycleStateIsPublishable(lifecycleRow);
}

async function readDocumentationLifecycleAuthority(options = {}) {
  const client =
    options.client ||
    new Client({
      connectionString:
        options.databaseUrl ||
        process.env.DVT_PLANNING_DB_URL ||
        process.env.DATABASE_URL ||
        defaultPgUrl,
    });
  const ownsClient = !options.client;
  if (ownsClient) await client.connect();
  try {
    const rows = await readDocumentationLifecycleRows(client, { limit: 100000 });
    const rowsByPath = new Map();
    for (const row of rows) {
      const documentPath = String(row.document_path ?? row.documentPath ?? '').replace(/\\/gu, '/');
      if (!documentPath) throw new Error('Planning DB lifecycle row has no document path.');
      if (rowsByPath.has(documentPath)) {
        throw new Error(`Ambiguous Planning DB lifecycle authority for ${documentPath}.`);
      }
      rowsByPath.set(documentPath, row);
    }
    return { rowsByPath };
  } finally {
    if (ownsClient) await client.end();
  }
}

function shouldSkipPlanningDocName(name) {
  return (
    /^index\.md$/i.test(name) ||
    /^TEMPLATE_PLANNING_DOC\.md$/i.test(name) ||
    /^non-english-docs-list\.md$/i.test(name)
  );
}

function normalizePlanningDocs(lifecycleAuthority) {
  if (!fs.existsSync(planningDir)) {
    return;
  }

  const managedDirs = [
    { dirPath: planningDir, forcedType: null },
    { dirPath: path.join(planningDir, 'proposals'), forcedType: 'proposal' },
    { dirPath: path.join(planningDir, 'reviews'), forcedType: 'review' },
    { dirPath: path.join(planningDir, 'status'), forcedType: 'status' },
  ];

  for (const managed of managedDirs) {
    const { dirPath, forcedType } = managed;
    if (!fs.existsSync(dirPath)) continue;
    const entries = fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.md$/i.test(name))
      .filter((name) => !shouldSkipPlanningDocName(name));

    for (const name of entries) {
      const fullPath = path.join(dirPath, name);
      const documentPath = path.relative(repoRoot, fullPath).replace(/\\/g, '/');
      if (!shouldIncludeDocumentationPath(documentPath, lifecycleAuthority)) continue;
      const original = fs.readFileSync(fullPath, 'utf8');
      const parts = splitFrontmatter(original);
      const heading = extractFirstHeading(parts.body);
      const inferredTitle = heading || humanizeName(name);
      const inferredType = forcedType || inferPlanningType(name.toLowerCase());

      const meta = {
        title: parts.frontmatter.title || inferredTitle,
        status: parts.frontmatter.status || 'Draft',
        owner: parts.frontmatter.owner || 'docs',
        last_reviewed: parts.frontmatter.last_reviewed || toIsoDateUTC(),
        planning_type: forcedType || parts.frontmatter.planning_type || inferredType,
      };

      const body = heading
        ? parts.body.trimStart()
        : `# ${inferredTitle}\n\n${parts.body.trimStart()}`;
      const next = `${renderFrontmatter(meta)}\n${body.trimEnd()}\n`;
      if (writeIfChanged(fullPath, next)) {
        const rel = path.relative(planningDir, fullPath).replace(/\\/g, '/');
        console.log(`[docs:sync] Normalized planning doc ${rel}`);
      }
    }
  }
}

function relativeMdLink(fromDir, target) {
  const rel = path.posix.relative(fromDir, target);
  return rel.length === 0 ? '.' : rel;
}

function scanFilesRecursive(dirAbs, predicate) {
  if (!fs.existsSync(dirAbs)) return [];
  const rows = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      if (predicate && !predicate(abs, entry.name)) continue;
      rows.push(abs);
    }
  };
  walk(dirAbs);
  rows.sort((a, b) => a.localeCompare(b));
  return rows;
}

function collectPlanningDocs(lifecycleAuthority) {
  const rows = [];
  const roots = [
    { dir: planningDir, prefix: 'planning' },
    {
      dir: path.join(planningDir, 'proposals'),
      prefix: 'planning/proposals',
      forcedType: 'proposal',
    },
    { dir: path.join(planningDir, 'reviews'), prefix: 'planning/reviews', forcedType: 'review' },
    { dir: path.join(planningDir, 'status'), prefix: 'planning/status', forcedType: 'status' },
  ];

  for (const root of roots) {
    if (!fs.existsSync(root.dir)) continue;
    const files = fs
      .readdirSync(root.dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((n) => /\.(md|txt)$/i.test(n))
      .filter((n) => !shouldSkipPlanningDocName(n));

    for (const name of files) {
      const abs = path.join(root.dir, name);
      const documentPath = path.relative(repoRoot, abs).replace(/\\/g, '/');
      if (!shouldIncludeDocumentationPath(documentPath, lifecycleAuthority)) continue;
      const content = fs.readFileSync(abs, 'utf8');
      const parsed = splitFrontmatter(content);
      if (!shouldIncludePlanningDoc(parsed.frontmatter.status)) {
        continue;
      }
      const title =
        parsed.frontmatter.title || extractFirstHeading(parsed.body) || humanizeName(name);
      const type =
        root.forcedType ||
        parsed.frontmatter.planning_type ||
        inferPlanningType(name.toLowerCase());
      rows.push({
        title,
        type,
        relPath: `${root.prefix}/${name}`.replace(/\\/g, '/'),
      });
    }
  }

  rows.sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }));
  return rows;
}

function collectPlanningReferenceDirs(lifecycleAuthority) {
  if (!fs.existsSync(planningDir)) return [];
  const skip = new Set(['proposals', 'reviews', 'status']);
  return fs
    .readdirSync(planningDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.'))
    .filter((entry) => !skip.has(entry.name.toLowerCase()))
    .filter((entry) => {
      const dirAbs = path.join(planningDir, entry.name);
      return (
        fs.existsSync(path.join(dirAbs, 'index.md')) || fs.existsSync(path.join(dirAbs, 'INDEX.md'))
      );
    })
    .filter((entry) =>
      shouldIncludeDocumentationPath(`docs/planning/${entry.name}/index.md`, lifecycleAuthority)
    )
    .map((entry) => ({
      label: humanizeName(entry.name),
      link: `${entry.name}/`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en', { sensitivity: 'base' }));
}

function bulletsFor(rows, fromDir) {
  return rows.map((row) => {
    const target = row.relPath.replace(/^planning\//, '');
    const link = relativeMdLink(fromDir, target);
    return `- [${row.title}](${encodeURI(link)})`;
  });
}

function generatePlanningIndexes(lifecycleAuthority) {
  const docs = collectPlanningDocs(lifecycleAuthority);
  const refDirs = collectPlanningReferenceDirs(lifecycleAuthority);
  const proposals = docs.filter((d) => d.type === 'proposal');
  const reviews = docs.filter((d) => d.type === 'review');
  const status = docs.filter((d) => d.type === 'status');
  const reference = docs.filter((d) => d.type === 'reference');
  const compatibility = docs.filter((d) => d.type === 'compatibility');

  const currentPlanning = readIfExists(planningIndexPath);
  const planningMeta = frontmatterWithDefaults(currentPlanning, {
    title: 'Planning',
    status: 'Review',
    owner: 'docs',
  });
  if (
    String(planningMeta.owner || '')
      .trim()
      .toLowerCase() === 'docs'
  ) {
    planningMeta.owner = 'Product / Architecture / Docs';
  }
  const planningLines = [
    renderFrontmatter(planningMeta),
    '# Planning',
    '',
    'Canonical planning surfaces, active gap tracking, proposals, reviews, and',
    'generated status artifacts.',
    '',
    'Use this section to distinguish roadmap, current status, execution gaps,',
    'and proposal work. Do not treat them as interchangeable surfaces.',
    '',
    'Concept anchors for this page:',
    '',
    '- [Glossary](../concepts/glossary.md) for `roadmap`, `status`, `gap`,',
    '  `canonical spec`, and `verification tuple`',
    '- [Domain Language](../concepts/domain-language.md) for the naming rules',
    '  shared across planning, architecture, and code',
    '',
    '## Navigation',
    '',
    '- [Roadmap Of Record](roadmap/index.md)',
    '- [Current Status](../architecture/system-delivery-status.md)',
    '- [Gaps](gaps/index.md)',
    '- [Proposals](proposals/index.md)',
    '- [Reviews](reviews/index.md)',
    '- [Status](status/index.md)',
    '',
    '## Canonical Planning Surfaces',
    '',
    '- [Roadmap Of Record](roadmap/index.md) for repository-wide sequencing and',
    '  planning order',
    '- [System Delivery Status](../architecture/system-delivery-status.md) for',
    '  what is currently true in implementation',
    '- [Planning Gaps](gaps/index.md) for current gap posture and archived gap',
    '  references',
    '- [Planning Status](status/index.md) for generated or curated status',
    '  artifacts',
    '',
    '## Proposals',
    '',
    ...bulletsFor(proposals, '.'),
    '',
    '## Reviews',
    '',
    ...bulletsFor(reviews, '.'),
    '',
    '## Status',
    '',
    ...bulletsFor(status, '.'),
    '',
    '## Reference',
    '',
    ...refDirs.map((row) => `- [${row.label}](${encodeURI(row.link)})`),
    ...(refDirs.length > 0 && reference.length > 0 ? [''] : []),
    ...bulletsFor(reference, '.'),
    ...((refDirs.length > 0 || reference.length > 0) && compatibility.length > 0 ? [''] : []),
    ...(compatibility.length > 0
      ? [
          '## Compatibility Notes',
          '',
          'Retained only for inbound links or historical continuity. Do not use',
          'these as the active planning source.',
          '',
          ...bulletsFor(compatibility, '.'),
          '',
        ]
      : ['']),
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(planningIndexPath, planningLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/planning/index.md');
  } else {
    console.log('[docs:sync] docs/planning/index.md already up to date.');
  }

  const currentProposals = readIfExists(planningProposalsPath);
  const proposalsMeta = frontmatterWithDefaults(currentProposals, {
    title: 'Planning Proposals',
    status: 'Draft',
    owner: 'docs',
  });
  if (
    String(proposalsMeta.owner || '')
      .trim()
      .toLowerCase() === 'docs'
  ) {
    proposalsMeta.owner = 'Product / Architecture / Docs';
  }
  const proposalsLines = [
    renderFrontmatter(proposalsMeta),
    '# Planning Proposals',
    '',
    'Draft proposals and candidate changes. Non-normative.',
    '',
    '## Index',
    '',
    ...bulletsFor(proposals, 'proposals'),
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(planningProposalsPath, proposalsLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/planning/proposals/index.md');
  } else {
    console.log('[docs:sync] docs/planning/proposals/index.md already up to date.');
  }

  const currentReviews = readIfExists(planningReviewsPath);
  const reviewsMeta = frontmatterWithDefaults(currentReviews, {
    title: 'Planning Reviews',
    status: 'Review',
    owner: 'docs',
  });
  if (
    String(reviewsMeta.owner || '')
      .trim()
      .toLowerCase() === 'docs'
  ) {
    reviewsMeta.owner = 'Product / Architecture / Docs';
  }
  const reviewsLines = [
    renderFrontmatter(reviewsMeta),
    '# Planning Reviews',
    '',
    'Architecture reviews, critiques, and analysis notes. Non-normative.',
    '',
    '## Index',
    '',
    ...bulletsFor(reviews, 'reviews'),
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(planningReviewsPath, reviewsLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/planning/reviews/index.md');
  } else {
    console.log('[docs:sync] docs/planning/reviews/index.md already up to date.');
  }

  const currentStatus = readIfExists(planningStatusPath);
  const statusMeta = frontmatterWithDefaults(currentStatus, {
    title: 'Planning Status',
    status: 'Review',
    owner: 'docs',
  });
  if (
    String(statusMeta.owner || '')
      .trim()
      .toLowerCase() === 'docs'
  ) {
    statusMeta.owner = 'Product / Architecture / Docs';
  }
  const statusLines = [
    renderFrontmatter(statusMeta),
    '# Planning Status',
    '',
    'Current status snapshots and implementation tracking.',
    '',
    '## Index',
    '',
    ...bulletsFor(status, 'status'),
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(planningStatusPath, statusLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/planning/status/index.md');
  } else {
    console.log('[docs:sync] docs/planning/status/index.md already up to date.');
  }
}

function renderContractSourceList(absFiles) {
  if (absFiles.length === 0) {
    return ['- No contracts detected yet.'];
  }
  return absFiles.map((abs) => {
    const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
    return `- \`${rel}\``;
  });
}

function renderContractDocsList(absFiles, fromDirAbs, lifecycleAuthority) {
  const publishableFiles = absFiles.filter((abs) =>
    shouldIncludeDocumentationPath(
      path.relative(repoRoot, abs).replace(/\\/g, '/'),
      lifecycleAuthority
    )
  );
  if (publishableFiles.length === 0) {
    return ['- No documentation references detected yet.'];
  }
  return publishableFiles.map((abs) => {
    const relFromDocs = path.relative(fromDirAbs, abs).replace(/\\/g, '/');
    const label = path.basename(abs);
    return `- [${label}](${encodeURI(relFromDocs)})`;
  });
}

function generateContractSubIndexes(lifecycleAuthority) {
  const contractsPkgSrc = path.join(repoRoot, 'packages', '@dvt', 'contracts', 'src');
  const engineOwnedSources = [
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'ports', 'IWorkflowEngine.ts'),
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'adapters', 'IProviderAdapter.ts'),
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'ports', 'IRunStateStore.ts'),
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'ports', 'IProjector.ts'),
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'ports', 'IStartRunIntentStore.ts'),
    path.join(repoRoot, 'packages', '@dvt', 'engine', 'src', 'domain', 'startRunIntentPolicy.ts'),
  ];
  const engineSrc = scanFilesRecursive(
    path.join(contractsPkgSrc, 'contracts', 'engine'),
    (abs, name) => /\.(ts|json)$/i.test(name) && !/\.d\.ts\.map$|\.js\.map$/i.test(name)
  );
  const engineSerializableSrc = engineSrc.filter(
    (abs) => path.basename(abs) !== 'IWorkflowEngine.v1.ts'
  );
  const plannerSrc = scanFilesRecursive(
    path.join(contractsPkgSrc, 'contracts', 'planner'),
    (abs, name) => /\.(ts|json)$/i.test(name) && !/\.d\.ts\.map$|\.js\.map$/i.test(name)
  );
  const sharedSrc = [
    ...scanFilesRecursive(
      path.join(contractsPkgSrc, 'adapters'),
      (abs, name) => /\.ts$/i.test(name) && !/\.d\.ts\.map$|\.js\.map$/i.test(name)
    ),
    ...scanFilesRecursive(
      path.join(contractsPkgSrc, 'types'),
      (abs, name) => /\.ts$/i.test(name) && !/\.d\.ts\.map$|\.js\.map$/i.test(name)
    ),
    ...scanFilesRecursive(contractsPkgSrc, (abs, name) =>
      /^(schemas|validation|planner-input|workflows)\.ts$/i.test(name)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const engineDocsRoot = path.join(docsRoot, 'architecture', 'components', 'engine', 'contracts');
  const engineDocs = scanFilesRecursive(engineDocsRoot, (abs, name) => /\.md$/i.test(name));

  const engineCurrent = readIfExists(contractsEngineIndexPath);
  const engineMeta = frontmatterWithDefaults(engineCurrent, {
    title: 'Engine Contracts',
    status: 'Active',
    owner: 'docs',
  });
  const engineLines = [
    renderFrontmatter(engineMeta),
    '# Engine Contracts',
    '',
    'Execution lifecycle, command, and event contracts for the workflow engine.',
    '',
    '## Engine-owned behavior sources (`@dvt/engine`)',
    '',
    ...renderContractSourceList(engineOwnedSources),
    '',
    '## Serializable normative sources (`@dvt/contracts`)',
    '',
    ...renderContractSourceList(engineSerializableSrc),
    '',
    '## Reference Documentation',
    '',
    ...renderContractDocsList(
      engineDocs,
      path.dirname(contractsEngineIndexPath),
      lifecycleAuthority
    ),
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(contractsEngineIndexPath, engineLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/contracts/engine/index.md');
  }

  const plannerCurrent = readIfExists(contractsPlannerIndexPath);
  const plannerMeta = frontmatterWithDefaults(plannerCurrent, {
    title: 'Planner Contracts',
    status: 'Active',
    owner: 'docs',
  });
  const plannerDocRows = scanSectionEntries('contracts/planner', lifecycleAuthority);
  const plannerDocLines = renderBulletList(plannerDocRows);
  const plannerLines = [
    renderFrontmatter(plannerMeta),
    '# Planner Contracts',
    '',
    'ExecutionPlan and planner-related schemas and admission contracts.',
    '',
    '## Normative Sources (`@dvt/contracts`)',
    '',
    ...renderContractSourceList(plannerSrc),
    ...(plannerDocLines.length === 0
      ? []
      : ['', '## Repository-local documents', '', ...plannerDocLines]),
    '',
    '## Related',
    '',
    '- [Contracts Index](../index.md)',
    '- [Architecture Engine Contracts](../../architecture/components/engine/contracts/README.md)',
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(contractsPlannerIndexPath, plannerLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/contracts/planner/index.md');
  }

  const sharedCurrent = readIfExists(contractsSharedIndexPath);
  const sharedMeta = frontmatterWithDefaults(sharedCurrent, {
    title: 'Shared Contracts',
    status: 'Active',
    owner: 'docs',
  });
  const sharedDocRows = scanSectionEntries('contracts/shared', lifecycleAuthority);
  const sharedDocLines = renderBulletList(sharedDocRows);
  const sharedLines = [
    renderFrontmatter(sharedMeta),
    '# Shared Contracts',
    '',
    'Cross-cutting types and shared validation contracts.',
    ...(sharedDocLines.length === 0
      ? []
      : ['', '## Repository-local documents', '', ...sharedDocLines]),
    '',
    '## Normative Sources (`@dvt/contracts`)',
    '',
    ...renderContractSourceList(sharedSrc),
    '',
    '## Related',
    '',
    '- [Contracts Index](../index.md)',
    '- [Capabilities Contracts](../../architecture/components/engine/contracts/capabilities/README.md)',
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(contractsSharedIndexPath, sharedLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/contracts/shared/index.md');
  }
}

function scanSectionEntries(sectionRelativePath, lifecycleAuthority) {
  const dirAbs = path.join(docsRoot, sectionRelativePath);
  if (!fs.existsSync(dirAbs)) {
    return [];
  }

  const allowYaml = sectionRelativePath.startsWith('risk-register');
  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const rows = [];
  const dedupedRiskRows = allowYaml ? new Map() : null;
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      const lowerIndex = path.join(absPath, 'index.md');
      const upperIndex = path.join(absPath, 'INDEX.md');
      if (fs.existsSync(lowerIndex)) {
        const documentPath = path.relative(repoRoot, lowerIndex).replace(/\\/g, '/');
        if (!shouldIncludeDocumentationPath(documentPath, lifecycleAuthority)) continue;
        rows.push({ type: 'dir', label: humanizeName(entry.name), link: `${entry.name}/index.md` });
      } else if (fs.existsSync(upperIndex)) {
        const documentPath = path.relative(repoRoot, upperIndex).replace(/\\/g, '/');
        if (!shouldIncludeDocumentationPath(documentPath, lifecycleAuthority)) continue;
        rows.push({ type: 'dir', label: humanizeName(entry.name), link: `${entry.name}/INDEX.md` });
      }
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.md' && ext !== '.txt' && (!allowYaml || (ext !== '.yaml' && ext !== '.yml'))) {
      continue;
    }
    if (/^index\.md$/i.test(entry.name)) continue;
    const documentPath = path.relative(repoRoot, absPath).replace(/\\/g, '/');
    if (!shouldIncludeDocumentationPath(documentPath, lifecycleAuthority)) continue;
    const fileContent = readIfExists(absPath) || '';
    const heading = ext === '.md' ? extractFirstHeading(fileContent) : null;
    const label = allowYaml
      ? heading ||
        extractStructuredField(fileContent, 'title') ||
        extractStructuredField(fileContent, 'id') ||
        humanizeName(entry.name)
      : heading || humanizeName(entry.name);
    const row = {
      type: 'file',
      label,
      link: entry.name,
    };

    if (!allowYaml) {
      rows.push(row);
      continue;
    }

    const key = riskRegisterEntryKey(entry.name, fileContent);
    const existing = dedupedRiskRows.get(key);
    if (!existing) {
      dedupedRiskRows.set(key, row);
      continue;
    }

    const existingPrecedence = riskRegisterEntryPrecedence(existing.link);
    const candidatePrecedence = riskRegisterEntryPrecedence(row.link);
    if (
      candidatePrecedence > existingPrecedence ||
      (candidatePrecedence === existingPrecedence &&
        row.link.localeCompare(existing.link, 'en', { sensitivity: 'base' }) < 0)
    ) {
      dedupedRiskRows.set(key, row);
    }
  }

  const normalizedRows = allowYaml ? [...rows, ...dedupedRiskRows.values()] : rows;
  normalizedRows.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    const labelCompare = a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
    if (labelCompare !== 0) return labelCompare;
    if (a.link < b.link) return -1;
    if (a.link > b.link) return 1;
    return 0;
  });
  return normalizedRows;
}

function orderRowsByPreferredLinks(rows, preferredLinks) {
  const preferred = [];
  const seen = new Set();

  for (const link of preferredLinks) {
    const row = rows.find((candidate) => candidate.link === link);
    if (!row) continue;
    preferred.push(row);
    seen.add(row.link);
  }

  const remaining = rows.filter((row) => !seen.has(row.link));
  return [...preferred, ...remaining];
}

function renderBulletList(rows) {
  return rows.map((row) => `- [${row.label}](${encodeURI(row.link)})`);
}

function renderConceptsIndex(meta, rows) {
  const orderedRows = orderRowsByPreferredLinks(rows, [
    'glossary.md',
    'domain-language.md',
    'system-map.md',
    'repository-map.md',
  ]);

  return [
    renderFrontmatter(meta),
    `# ${meta.title}`,
    '',
    'Canonical domain concepts, shared vocabulary, and repository-level system orientation.',
    '',
    'This section is the correct starting point for most readers. Do not begin by',
    'reading engine internals unless the task is specifically about execution runtime',
    'behavior or engine contracts.',
    '',
    '## Start Here',
    '',
    '- [DVT Glossary](glossary.md) for the core nouns used across planning, architecture,',
    '  contracts, and code',
    '- [DVT Domain Language](domain-language.md) for naming rules and boundary language',
    '- [DVT System Map](system-map.md) for the top-level repository shape and reading flow',
    '- [Repository Map](repository-map.md) for workspace-to-doc coverage and package visibility',
    '',
    '## Recommended Reading Order',
    '',
    '1. [DVT Glossary](glossary.md)',
    '2. [DVT Domain Language](domain-language.md)',
    '3. [DVT System Map](system-map.md)',
    '4. [Repository Map](repository-map.md)',
    '5. [Architecture Index](../architecture/index.md)',
    '6. [Planning Control Tower](../planning/state/planning-control-tower.md)',
    '',
    '## Index',
    '',
    ...renderBulletList(orderedRows),
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
}

function renderArchitectureIndex(meta, rows) {
  const orderedRows = orderRowsByPreferredLinks(rows, [
    'shared/index.md',
    'frontend/index.md',
    'infra/index.md',
    'engine/index.md',
    'atlas/index.md',
    'reference-architecture.md',
    'system-delivery-status.md',
  ]);

  return [
    renderFrontmatter(meta),
    `# ${meta.title}`,
    '',
    'Technical architecture specifications and current system structure.',
    '',
    'This section must not collapse the repository into engine-only reading. The engine is',
    'important, but it is one subsystem inside a broader planning, runtime, UI, and',
    'operations surface.',
    '',
    '## Start Here',
    '',
    '- [DVT System Map](../concepts/system-map.md) for the repository-wide mental model',
    '- [System Delivery Status](system-delivery-status.md) for what is currently true in',
    '  implementation',
    '- [Shared Package Architecture](shared/index.md) for the small cross-cutting packages',
    '  that shape repo-wide behavior',
    '- [Repository Map](../concepts/repository-map.md) for workspace-to-doc coverage',
    '',
    '## Reading Guidance',
    '',
    '- Start with [Shared](shared/index.md), [Frontend](frontend/index.md), and',
    '  [Infra](infra/index.md) unless the task is explicitly about workflow runtime',
    '  semantics.',
    '- Use [Engine](engine/index.md) when changing execution invariants, adapters,',
    '  determinism, or engine contracts.',
    '- Use [Atlas](atlas/index.md) and [Reference Architecture](reference-architecture.md)',
    '  when the question is repository-wide structure rather than one package.',
    '',
    '## Guided Index',
    '',
    ...renderBulletList(orderedRows),
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
}

function renderContractsIndex(meta, rows) {
  const orderedRows = orderRowsByPreferredLinks(rows, [
    'planner/index.md',
    'shared/index.md',
    'traceability/index.md',
    'engine/index.md',
  ]);

  return [
    renderFrontmatter(meta),
    `# ${meta.title}`,
    '',
    'Normative contracts, schemas, admission rules, and reference entry points.',
    '',
    'Use this section when the question is about what a boundary must accept,',
    'return, persist, validate, or version deliberately over time.',
    '',
    '## Start Here',
    '',
    '- [Planner Contracts](planner/index.md) for `ExecutionPlan`, planner envelopes,',
    '  and admission-oriented plan schemas',
    '- [Shared Contracts](shared/index.md) for cross-cutting adapter, workflow, and',
    '  validation contracts',
    '- [Traceability Contracts](traceability/index.md) for emitted lineage facet',
    '  artifacts, schema copies, and transport-adjacent contract governance',
    '- [Engine Contracts](engine/index.md) for execution lifecycle, run-event, and',
    '  engine boundary contracts',
    '',
    '## Reading Guidance',
    '',
    '- Start with [Planner](planner/index.md) when the change affects plan shape,',
    '  admission, schema validation, or planner inputs.',
    '- Start with [Shared](shared/index.md) when the change affects adapter-facing',
    '  contracts, shared types, or validation helpers.',
    '- Use [Traceability](traceability/index.md) when the change affects emitted',
    '  OpenLineage facets, schema copies, or lineage contract artifacts.',
    '- Use [Engine](engine/index.md) when the change affects run lifecycle, event',
    '  envelopes, append authority, or execution semantics.',
    '',
    '## Guided Index',
    '',
    ...renderBulletList(orderedRows),
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
}

const sectionConfigs = [
  {
    relPath: 'concepts',
    defaults: { title: 'Concepts', status: 'Active', owner: 'docs' },
    intro: 'Canonical domain concepts, shared vocabulary, and system orientation.',
    renderIndex: renderConceptsIndex,
  },
  {
    relPath: 'architecture',
    defaults: { title: 'Architecture', status: 'Active', owner: 'docs' },
    intro: 'Technical architecture specifications (normative when marked Accepted/Active).',
    renderIndex: renderArchitectureIndex,
  },
  {
    relPath: 'contracts',
    defaults: { title: 'Contracts', status: 'Active', owner: 'docs' },
    intro: 'Normative contracts (schemas, version matrices, API/event contracts).',
    renderIndex: renderContractsIndex,
  },
  {
    relPath: 'evidence',
    defaults: { title: 'Evidence', status: 'Active', owner: 'docs' },
    intro: 'Evidence documents that justify or validate relevant changes.',
  },
  {
    relPath: 'guides',
    defaults: { title: 'Guides', status: 'Active', owner: 'docs' },
    intro: 'Developer guides, contribution guides, and quality standards.',
  },
  {
    relPath: 'risk-register/adapters',
    defaults: { title: 'Adapter Risks', status: 'Active', owner: 'docs' },
    intro: 'Risk records specific to adapters, workflow runtimes, and integration seams.',
  },
  {
    relPath: 'risk-register/quality',
    defaults: { title: 'Quality Risks', status: 'Active', owner: 'docs' },
    intro: 'Risk records related to validation coverage, CI quality, and regression detection.',
  },
  {
    relPath: 'risk-register',
    defaults: { title: 'Risk Register', status: 'Active', owner: 'docs' },
    intro: 'Open technical and delivery risks that still need mitigation or explicit acceptance.',
  },
  {
    relPath: 'runbooks',
    defaults: { title: 'Runbooks', status: 'Active', owner: 'docs' },
    intro: 'Operational runbooks for incidents, recovery, and maintenance.',
  },
  {
    relPath: 'archive',
    defaults: { title: 'Archive', status: 'Archived', owner: 'docs' },
    intro: 'Frozen historical documentation retained for reference.',
  },
  {
    relPath: 'adr/_drafts',
    defaults: { title: 'ADR Drafts', status: 'Draft', owner: 'docs' },
    intro: 'Work-in-progress ADRs. Not normative.',
  },
  {
    relPath: 'adr/_archive',
    defaults: { title: 'ADR Archive', status: 'Archived', owner: 'docs' },
    intro: 'Superseded or retired ADRs. Historical reference only.',
  },
];

function generateSectionIndexes(lifecycleAuthority) {
  for (const section of sectionConfigs) {
    const indexPath = path.join(docsRoot, section.relPath, 'index.md');
    const current = readIfExists(indexPath);
    const meta = frontmatterWithDefaults(current, section.defaults);
    const preservesHistoricalNavigation =
      section.relPath === 'archive' || section.relPath.endsWith('/_archive');
    const rows = scanSectionEntries(
      section.relPath,
      preservesHistoricalNavigation ? undefined : lifecycleAuthority
    );
    const rowLines = renderBulletList(rows);
    const lines =
      typeof section.renderIndex === 'function'
        ? section.renderIndex(meta, rows)
        : [
            renderFrontmatter(meta),
            `# ${meta.title}`,
            '',
            section.intro,
            '',
            '## Index',
            '',
            ...rowLines,
            ...(rowLines.length > 0 ? [''] : []),
            '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
            '',
          ];
    if (writeIfChanged(indexPath, lines.join('\n'))) {
      console.log(`[docs:sync] Regenerated ${path.relative(repoRoot, indexPath)}`);
    } else {
      console.log(`[docs:sync] ${path.relative(repoRoot, indexPath)} already up to date.`);
    }
  }
}

async function main(options = {}) {
  const lifecycleAuthority =
    options.lifecycleAuthority || (await readDocumentationLifecycleAuthority(options));
  ensureCanonicalDocsHome();
  normalizePlanningDocs(lifecycleAuthority);
  generateAdrLanding(lifecycleAuthority);
  generatePlanningIndexes(lifecycleAuthority);
  generateContractSubIndexes(lifecycleAuthority);
  generateSectionIndexes(lifecycleAuthority);
  console.log('[docs:sync] Completed.');
}

if (require.main === module) {
  try {
    void main().catch((error) => {
      console.error(`[docs:sync] ERROR: ${error.message}`);
      process.exitCode = 1;
    });
  } catch (error) {
    console.error(`[docs:sync] ERROR: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  collectPlanningDocs,
  generatePlanningIndexes,
  inferPlanningType,
  lifecycleStateIsPublishable,
  main,
  readDocumentationLifecycleAuthority,
  scanSectionEntries,
  shouldIncludeDocumentationPath,
  shouldIncludePlanningDoc,
  splitFrontmatter,
};
