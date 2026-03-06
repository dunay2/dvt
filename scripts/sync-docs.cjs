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
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: {}, body: source };
  }

  const frontmatter = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      frontmatter[kv[1]] = kv[2];
    }
  }

  return { frontmatter, body: source.slice(match[0].length) };
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
      (name) => !/^ADR-(Index|Implementation Status|Status_Board_Extensive)\.md$/i.test(name)
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
  const meta = frontmatterWithDefaults(current, { title: 'ADRs', status: 'Active', owner: 'docs' });

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

function inferPlanningType(fileNameLower) {
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

function normalizePlanningDocs() {
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
      .filter((name) => !/^index\.md$/i.test(name))
      .filter((name) => !/^TEMPLATE_PLANNING_DOC\.md$/i.test(name));

    for (const name of entries) {
      const fullPath = path.join(dirPath, name);
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

function collectPlanningDocs() {
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
      .filter((n) => !/^index\.md$/i.test(n))
      .filter((n) => !/^TEMPLATE_PLANNING_DOC\.md$/i.test(n));

    for (const name of files) {
      const abs = path.join(root.dir, name);
      const content = fs.readFileSync(abs, 'utf8');
      const parsed = splitFrontmatter(content);
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

function collectPlanningReferenceDirs() {
  if (!fs.existsSync(planningDir)) return [];
  const skip = new Set(['proposals', 'reviews', 'status']);
  return fs
    .readdirSync(planningDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith('.'))
    .filter((entry) => !skip.has(entry.name.toLowerCase()))
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

function generatePlanningIndexes() {
  const docs = collectPlanningDocs();
  const refDirs = collectPlanningReferenceDirs();
  const proposals = docs.filter((d) => d.type === 'proposal');
  const reviews = docs.filter((d) => d.type === 'review');
  const status = docs.filter((d) => d.type === 'status');
  const reference = docs.filter((d) => d.type === 'reference');

  const currentPlanning = readIfExists(planningIndexPath);
  const planningMeta = frontmatterWithDefaults(currentPlanning, {
    title: 'Planning',
    status: 'Review',
    owner: 'docs',
  });
  const planningLines = [
    renderFrontmatter(planningMeta),
    '# Planning',
    '',
    'Roadmaps, proposals, reviews, and non-normative planning artifacts.',
    '',
    '## Navigation',
    '',
    '- [Proposals](proposals/index.md)',
    '- [Reviews](reviews/index.md)',
    '- [Status](status/index.md)',
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
    '',
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

function renderContractDocsList(absFiles, fromDirAbs) {
  if (absFiles.length === 0) {
    return ['- No documentation references detected yet.'];
  }
  return absFiles.map((abs) => {
    const relFromDocs = path.relative(fromDirAbs, abs).replace(/\\/g, '/');
    const label = path.basename(abs);
    return `- [${label}](${encodeURI(relFromDocs)})`;
  });
}

function generateContractSubIndexes() {
  const contractsPkgSrc = path.join(repoRoot, 'packages', '@dvt', 'contracts', 'src');
  const engineSrc = scanFilesRecursive(
    path.join(contractsPkgSrc, 'contracts', 'engine'),
    (abs, name) => /\.(ts|json)$/i.test(name) && !/\.d\.ts\.map$|\.js\.map$/i.test(name)
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

  const engineDocsRoot = path.join(docsRoot, 'architecture', 'engine', 'contracts');
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
    '## Normative Sources (`@dvt/contracts`)',
    '',
    ...renderContractSourceList(engineSrc),
    '',
    '## Reference Documentation',
    '',
    ...renderContractDocsList(engineDocs, path.dirname(contractsEngineIndexPath)),
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
  const plannerLines = [
    renderFrontmatter(plannerMeta),
    '# Planner Contracts',
    '',
    'ExecutionPlan and planner-related schemas and compatibility contracts.',
    '',
    '## Normative Sources (`@dvt/contracts`)',
    '',
    ...renderContractSourceList(plannerSrc),
    '',
    '## Related',
    '',
    '- [Contracts Index](../index.md)',
    '- [Architecture Engine Contracts](../../architecture/engine/contracts/README.md)',
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
  const sharedLines = [
    renderFrontmatter(sharedMeta),
    '# Shared Contracts',
    '',
    'Cross-cutting types and shared validation contracts.',
    '',
    '## Normative Sources (`@dvt/contracts`)',
    '',
    ...renderContractSourceList(sharedSrc),
    '',
    '## Related',
    '',
    '- [Contracts Index](../index.md)',
    '- [Capabilities Contracts](../../architecture/engine/contracts/capabilities/README.md)',
    '',
    '> This page is auto-generated by `pnpm docs:sync`. Do not edit manually.',
    '',
  ];
  if (writeIfChanged(contractsSharedIndexPath, sharedLines.join('\n'))) {
    console.log('[docs:sync] Regenerated docs/contracts/shared/index.md');
  }
}

function scanSectionEntries(sectionRelativePath) {
  const dirAbs = path.join(docsRoot, sectionRelativePath);
  if (!fs.existsSync(dirAbs)) {
    return [];
  }

  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const rows = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      const lowerIndex = path.join(absPath, 'index.md');
      const upperIndex = path.join(absPath, 'INDEX.md');
      if (fs.existsSync(lowerIndex)) {
        rows.push({ type: 'dir', label: humanizeName(entry.name), link: `${entry.name}/index.md` });
      } else if (fs.existsSync(upperIndex)) {
        rows.push({ type: 'dir', label: humanizeName(entry.name), link: `${entry.name}/INDEX.md` });
      }
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.md' && ext !== '.txt') continue;
    if (/^index\.md$/i.test(entry.name)) continue;
    const fileContent = readIfExists(absPath) || '';
    const heading = ext === '.md' ? extractFirstHeading(fileContent) : null;
    rows.push({ type: 'file', label: heading || humanizeName(entry.name), link: entry.name });
  }

  rows.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.label.localeCompare(b.label, 'en', { sensitivity: 'base' });
  });
  return rows;
}

const sectionConfigs = [
  {
    relPath: 'architecture',
    defaults: { title: 'Architecture', status: 'Active', owner: 'docs' },
    intro: 'Technical architecture specifications (normative when marked Accepted/Active).',
  },
  {
    relPath: 'contracts',
    defaults: { title: 'Contracts', status: 'Active', owner: 'docs' },
    intro: 'Normative contracts (schemas, version matrices, API/event contracts).',
  },
  {
    relPath: 'guides',
    defaults: { title: 'Guides', status: 'Active', owner: 'docs' },
    intro: 'Developer guides, contribution guides, and quality standards.',
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

function generateSectionIndexes() {
  for (const section of sectionConfigs) {
    const indexPath = path.join(docsRoot, section.relPath, 'index.md');
    const current = readIfExists(indexPath);
    const meta = frontmatterWithDefaults(current, section.defaults);
    const rows = scanSectionEntries(section.relPath);
    const rowLines = rows.map((row) => `- [${row.label}](${encodeURI(row.link)})`);
    const lines = [
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

function main() {
  ensureCanonicalDocsHome();
  ensureMkdocsHomeRoot();
  normalizePlanningDocs();
  generateAdrLanding();
  generatePlanningIndexes();
  generateContractSubIndexes();
  generateSectionIndexes();
  console.log('[docs:sync] Completed.');
}

try {
  main();
} catch (error) {
  console.error(`[docs:sync] ERROR: ${error.message}`);
  process.exit(1);
}
