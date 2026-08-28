#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { sha256HexUtf8 } = require('@dvt/crypto');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');

const LEGACY_PATH_SEGMENTS = ['dvt execution model'];
const STALE_WARN_DAYS = 120;
const STALE_FAIL_DAYS = 540;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(abs));
      continue;
    }
    out.push(abs);
  }
  return out;
}

function rel(p) {
  return path.relative(repoRoot, p).replace(/\\/g, '/');
}

function isMarkdownFile(p) {
  return p.toLowerCase().endsWith('.md');
}

function shouldSkipForDuplicateCheck(p) {
  const base = path.basename(p).toLowerCase();
  return (
    base === 'index.md' ||
    base === 'readme.md' ||
    base.startsWith('template') ||
    p.includes('/_archive/') ||
    p.includes('/_drafts/')
  );
}

function parseFrontmatter(raw) {
  const normalized = raw.replace(/^\uFEFF/, '');
  const m = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return {};
  const out = {};
  const lines = m[1].split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function getFirstHeading(raw) {
  const m = raw.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function humanizeBaseName(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findLinks(raw) {
  const links = [];
  const regex = /\[[^\]]+\]\(([^)]+)\)/g;
  let match = regex.exec(raw);
  while (match) {
    links.push(match[1]);
    match = regex.exec(raw);
  }
  return links;
}

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sectionKey(relativePath) {
  const parts = relativePath.split('/');
  if (parts.length >= 3) return `${parts[0]}/${parts[1]}/${parts[2]}`;
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return parts[0] || relativePath;
}

function digestContent(raw) {
  const normalized = raw
    .replace(/\r\n/g, '\n')
    .replace(/^---[\s\S]*?---\n?/m, '')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    normalized,
    hash: sha256HexUtf8(normalized),
  };
}

function main() {
  if (!fs.existsSync(docsRoot)) {
    console.error('[docs:doctor] FAIL');
    console.error('- Missing docs/ directory.');
    process.exit(1);
  }

  const mdFiles = walk(docsRoot).filter(isMarkdownFile);
  const errors = [];
  const warnings = [];

  const titleBuckets = new Map();
  const bodyDigestBuckets = new Map();
  const now = new Date();

  for (const filePath of mdFiles) {
    const relative = rel(filePath);
    const relativeLower = relative.toLowerCase();
    const raw = fs.readFileSync(filePath, 'utf8');
    const frontmatter = parseFrontmatter(raw);
    const firstHeading = getFirstHeading(raw);
    const title = frontmatter.title || firstHeading || humanizeBaseName(filePath);

    for (const segment of LEGACY_PATH_SEGMENTS) {
      if (relativeLower.includes(segment)) {
        errors.push(`${relative} -> legacy path segment "${segment}" is forbidden.`);
      }
    }

    for (const linkTarget of findLinks(raw)) {
      const normalizedLink = decodeURIComponent(linkTarget).toLowerCase();
      for (const segment of LEGACY_PATH_SEGMENTS) {
        if (normalizedLink.includes(segment)) {
          errors.push(
            `${relative} -> contains legacy link target "${linkTarget}" (segment "${segment}").`
          );
        }
      }
    }

    if (!shouldSkipForDuplicateCheck(relativeLower)) {
      const key = `${sectionKey(relativeLower)}::${normalizeTitle(title)}`;
      const existing = titleBuckets.get(key) || [];
      existing.push(relative);
      titleBuckets.set(key, existing);

      const digest = digestContent(raw);
      if (digest.normalized.length >= 400) {
        const current = bodyDigestBuckets.get(digest.hash) || [];
        current.push(relative);
        bodyDigestBuckets.set(digest.hash, current);
      }
    }

    if (relativeLower.startsWith('docs/planning/') && !relativeLower.endsWith('/index.md')) {
      if (!frontmatter.last_reviewed) {
        warnings.push(`${relative} -> missing frontmatter key last_reviewed.`);
      } else {
        const parsed = parseDateOnly(frontmatter.last_reviewed);
        if (!parsed) {
          warnings.push(
            `${relative} -> invalid last_reviewed "${frontmatter.last_reviewed}" (expected YYYY-MM-DD).`
          );
        } else {
          const ageDays = Math.floor((now.getTime() - parsed.getTime()) / 86400000);
          if (ageDays > STALE_FAIL_DAYS) {
            errors.push(
              `${relative} -> stale documentation (${ageDays} days since last_reviewed).`
            );
          } else if (ageDays > STALE_WARN_DAYS) {
            warnings.push(
              `${relative} -> aging documentation (${ageDays} days since last_reviewed).`
            );
          }
        }
      }
    }
  }

  for (const [key, files] of titleBuckets.entries()) {
    if (files.length > 1) {
      errors.push(`duplicate title key "${key}" in files: ${files.join(', ')}`);
    }
  }

  for (const files of bodyDigestBuckets.values()) {
    if (files.length > 1) {
      errors.push(`duplicate body content detected in files: ${files.join(', ')}`);
    }
  }

  if (warnings.length > 0) {
    console.warn('[docs:doctor] WARN');
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  if (errors.length > 0) {
    console.error('[docs:doctor] FAIL');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('[docs:doctor] OK');
}

main();
