#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const defaultRoot = path.join(repoRoot, 'docs', 'planning');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs));
      continue;
    }
    if (entry.isFile() && abs.toLowerCase().endsWith('.md')) {
      out.push(abs);
    }
  }
  return out;
}

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function stripBom(raw) {
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function parseFrontmatter(raw) {
  const normalized = stripBom(raw);
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) return null;
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) {
      frontmatter[kv[1]] = kv[2].trim();
    }
  }
  return {
    raw: match[1],
    bodyStart: match[0].length,
    frontmatter,
    normalized,
  };
}

function isDateOnly(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getFirstHeading(raw) {
  const match = raw.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function humanizeBaseName(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function dateFromFileName(filePath) {
  const match = filePath.match(/(20\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function resolveLastReviewed(filePath, frontmatter) {
  if (frontmatter && isDateOnly(frontmatter.date)) return frontmatter.date;

  const fromName = dateFromFileName(filePath);
  if (fromName !== null) return fromName;

  return formatDate(fs.statSync(filePath).mtime);
}

function inferStatus(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower.includes('/archive/')) return 'Archived';
  if (lower.includes('/closeouts/')) return 'Completed';
  if (lower.includes('/reviews/')) return 'Review';
  if (lower.includes('/proposals/disposable/')) return 'Disposable';
  if (lower.includes('/proposals/superseded/')) return 'Superseded';
  if (lower.includes('/roadmap/')) return 'Active';
  if (lower.includes('/proposals/')) {
    return lower.includes('roadmap') ? 'Active' : 'Draft';
  }
  return 'Draft';
}

function inferPlanningType(relativePath) {
  const lower = relativePath.toLowerCase();
  if (lower.includes('/reviews/')) return 'review';
  if (lower.includes('/roadmap/')) return 'proposal';
  if (lower.includes('/proposals/')) return 'proposal';
  if (lower.includes('/state/')) return 'reference';
  return null;
}

function serializeFrontmatter(frontmatter, newline) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    lines.push(`${key}: ${value}`);
  }
  lines.push('---', '');
  return lines.join(newline);
}

function mergeFrontmatter(primary, secondary, filePath, lastReviewed) {
  const merged = { ...secondary };

  if (!merged.title && primary.title) merged.title = primary.title;
  if (!merged.title) merged.title = humanizeBaseName(filePath);

  if (!merged.status && primary.status) merged.status = primary.status;
  if (!merged.status) merged.status = inferStatus(rel(filePath));

  if (!merged.owner && primary.owner) merged.owner = primary.owner;
  if (!merged.owner) merged.owner = 'docs';

  if (!merged.last_reviewed && primary.last_reviewed) merged.last_reviewed = primary.last_reviewed;
  if (!merged.last_reviewed) merged.last_reviewed = lastReviewed;

  if (!merged.planning_type && primary.planning_type) {
    merged.planning_type = primary.planning_type;
  }

  return merged;
}

function normalizeDocument(filePath, raw) {
  const normalized = stripBom(raw);
  const parsed = parseFrontmatter(normalized);
  if (parsed === null) return normalized;

  const firstBody = stripBom(parsed.normalized.slice(parsed.bodyStart));
  const nested = parseFrontmatter(firstBody);
  if (nested === null) return parsed.normalized;

  const newline = parsed.normalized.includes('\r\n') ? '\r\n' : '\n';
  const lastReviewed = resolveLastReviewed(filePath, nested.frontmatter);
  const merged = mergeFrontmatter(parsed.frontmatter, nested.frontmatter, filePath, lastReviewed);
  return `${serializeFrontmatter(merged, newline)}${firstBody.slice(nested.bodyStart)}`;
}

function addLastReviewed(raw, nextValue) {
  const parsed = parseFrontmatter(raw);
  if (parsed === null) return null;

  const newline = parsed.normalized.includes('\r\n') ? '\r\n' : '\n';
  const lines = parsed.raw.split(/\r?\n/);
  if (lines.some((line) => line.startsWith('last_reviewed:'))) {
    return parsed.normalized;
  }

  let insertAt = lines.findIndex((line) => line.startsWith('date:'));
  if (insertAt === -1) insertAt = lines.findIndex((line) => line.startsWith('owner:'));
  if (insertAt === -1) insertAt = lines.findIndex((line) => line.startsWith('status:'));
  if (insertAt === -1) insertAt = lines.length - 1;
  insertAt += 1;

  lines.splice(insertAt, 0, `last_reviewed: ${nextValue}`);
  return `---${newline}${lines.join(newline)}${newline}---${newline}${parsed.normalized.slice(parsed.bodyStart)}`;
}

function scaffoldFrontmatter(filePath, raw, nextValue) {
  const normalized = stripBom(raw);
  const relativePath = rel(filePath);
  const newline = normalized.includes('\r\n') ? '\r\n' : '\n';
  const title = getFirstHeading(normalized) || humanizeBaseName(filePath);
  const frontmatter = {
    title,
    status: inferStatus(relativePath),
    owner: 'docs',
    last_reviewed: nextValue,
  };
  const planningType = inferPlanningType(relativePath);
  if (planningType !== null) {
    frontmatter.planning_type = planningType;
  }
  return `${serializeFrontmatter(frontmatter, newline)}${normalized}`;
}

function main() {
  const targetRootArg = process.argv[2];
  const targetRoot =
    targetRootArg === undefined ? defaultRoot : path.resolve(repoRoot, targetRootArg);

  if (!fs.existsSync(targetRoot)) {
    console.error(`[docs:planning:last-reviewed:backfill] Missing path: ${rel(targetRoot)}`);
    process.exit(1);
  }

  const updated = [];
  const scaffolded = [];
  const normalizedFiles = [];

  for (const filePath of walk(targetRoot)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const normalized = normalizeDocument(filePath, raw);
    if (normalized !== raw) {
      fs.writeFileSync(filePath, normalized, 'utf8');
      normalizedFiles.push(rel(filePath));
    }

    const parsed = parseFrontmatter(normalized);
    const frontmatter = parsed?.frontmatter ?? null;
    const nextValue = resolveLastReviewed(filePath, frontmatter);

    if (parsed === null) {
      const rewritten = scaffoldFrontmatter(filePath, normalized, nextValue);
      fs.writeFileSync(filePath, rewritten, 'utf8');
      scaffolded.push(`${rel(filePath)} -> ${nextValue}`);
      continue;
    }

    if (parsed.frontmatter.last_reviewed) continue;

    const rewritten = addLastReviewed(normalized, nextValue);
    if (rewritten === null || rewritten === normalized) continue;

    fs.writeFileSync(filePath, rewritten, 'utf8');
    updated.push(`${rel(filePath)} -> ${nextValue}`);
  }

  console.log(
    `[docs:planning:last-reviewed:backfill] Updated ${updated.length} file(s) under ${rel(targetRoot)}.`
  );
  for (const line of updated) {
    console.log(`- ${line}`);
  }

  console.log(
    `[docs:planning:last-reviewed:backfill] Normalized ${normalizedFiles.length} file(s).`
  );
  for (const filePath of normalizedFiles) {
    console.log(`- ${filePath}`);
  }

  if (scaffolded.length > 0) {
    console.log(
      `[docs:planning:last-reviewed:backfill] Scaffolded frontmatter in ${scaffolded.length} file(s).`
    );
    for (const line of scaffolded) {
      console.log(`- ${line}`);
    }
  }
}

main();
