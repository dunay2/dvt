#!/usr/bin/env node
/* eslint-env node */
/* global __dirname, process, console */

/**
 * Cross-contract reference validator.
 *
 * Scope:
 * - markdown links under docs/architecture/engine/contracts (all .md files)
 *
 * Checks:
 * 1) Local link targets exist
 * 2) Optional version alignment between link label and filename
 * 3) Deprecated-reference heuristics (warning phase)
 *
 * Modes:
 * - warn  (default)
 * - error (hardened phase)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'docs', 'architecture', 'engine', 'contracts');

const args = process.argv.slice(2);
const mode = (getArgValue(args, '--mode') || process.env.REFS_MODE || 'warn').toLowerCase();
const failOnIssues = mode === 'error' || process.env.REFS_FAIL === '1' || hasFlag(args, '--fail');

main();

function main() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    console.log('REFS | contracts directory not found, skipping');
    process.exit(0);
  }

  const files = walkMarkdown(CONTRACTS_DIR).sort();
  const issues = [];

  for (const file of files) {
    const relFile = normalizeRel(file);
    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split(/\r?\n/);
    let inFence = false;

    for (let index = 0; index < lines.length; index += 1) {
      const raw = lines[index];
      if (isFenceDelimiter(raw)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      const line = stripInlineCode(raw);
      if (!line.includes('](')) continue;

      const links = extractMarkdownLinks(line);
      for (const link of links) {
        const lineNumber = index + 1;
        const column = (link.index || 0) + 1;

        if (isExternalLink(link.href) || isAnchorOnly(link.href)) {
          continue;
        }

        const resolved = resolveLocalTarget(file, link.href);
        if (!resolved.exists) {
          issues.push({
            kind: 'broken-reference',
            file: relFile,
            line: lineNumber,
            column,
            detail: `target not found: ${link.href}`,
          });
          continue;
        }

        const versionIssue = checkVersionAlignment(link.label, link.href);
        if (versionIssue) {
          issues.push({
            kind: 'version-mismatch',
            file: relFile,
            line: lineNumber,
            column,
            detail: versionIssue,
          });
        }

        const deprecationIssue = checkDeprecatedReference(link.href);
        if (deprecationIssue) {
          issues.push({
            kind: 'deprecated-reference',
            file: relFile,
            line: lineNumber,
            column,
            detail: deprecationIssue,
          });
        }
      }
    }
  }

  const grouped = {
    broken: issues.filter((x) => x.kind === 'broken-reference'),
    version: issues.filter((x) => x.kind === 'version-mismatch'),
    deprecated: issues.filter((x) => x.kind === 'deprecated-reference'),
  };

  printReport(files.length, grouped);

  if (failOnIssues && grouped.broken.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

function printReport(totalFiles, grouped) {
  const totalIssues = grouped.broken.length + grouped.version.length + grouped.deprecated.length;
  const status =
    totalIssues === 0 ? 'OK' : failOnIssues && grouped.broken.length > 0 ? 'ERROR' : 'WARN';

  console.log(
    `REFS | mode=${mode} | files=${totalFiles} | broken=${grouped.broken.length} | version=${grouped.version.length} | deprecated=${grouped.deprecated.length} | status=${status}`
  );

  if (totalIssues === 0) return;

  printSection('Broken references', grouped.broken);
  printSection('Version mismatches', grouped.version);
  printSection('Deprecated references', grouped.deprecated);
}

function printSection(title, rows) {
  if (rows.length === 0) return;
  console.log(`\n## ${title}`);

  const sorted = rows
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);

  for (const row of sorted) {
    console.log(`- ${row.file}:L${row.line}:C${row.column} ${row.detail}`);
  }
}

function resolveLocalTarget(fromFile, href) {
  const cleanHref = href.split('#')[0].split('?')[0];
  const abs = path.resolve(path.dirname(fromFile), cleanHref);
  return { exists: fs.existsSync(abs), absolute: abs };
}

function checkVersionAlignment(label, href) {
  const target = href.split('#')[0].split('?')[0];
  const fileVersion = extractVersionToken(target);
  if (!fileVersion) return '';

  const labelVersion = extractVersionToken(label);
  if (!labelVersion) return '';

  if (labelVersion !== fileVersion) {
    return `version mismatch label=${labelVersion} target=${fileVersion} (${href})`;
  }
  return '';
}

function checkDeprecatedReference(href) {
  const normalized = href.toLowerCase();
  if (normalized.includes('reference.v')) {
    return `deprecated-style target (reference artifact): ${href}`;
  }
  return '';
}

function extractVersionToken(text) {
  const m = text.match(/\bv(\d+(?:\.\d+)*)\b/i);
  return m ? `v${m[1]}` : '';
}

function extractMarkdownLinks(line) {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out = [];
  let m;
  while ((m = re.exec(line)) !== null) {
    out.push({ label: m[1].trim(), href: m[2].trim(), index: m.index });
  }
  return out;
}

function isExternalLink(href) {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

function isAnchorOnly(href) {
  return href.startsWith('#');
}

function walkMarkdown(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, '');
}

function isFenceDelimiter(line) {
  return /^\s*```/.test(line.trim());
}

function normalizeRel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

function hasFlag(argvList, flag) {
  return argvList.includes(flag);
}

function getArgValue(argvList, flag) {
  const i = argvList.indexOf(flag);
  if (i === -1) return '';
  return argvList[i + 1] || '';
}
