#!/usr/bin/env node
/* eslint-env node */
/* global __dirname, process, console */
/**
 * RFC 2119 validator (contracts markdown only).
 *
 * Goal:
 * - Detect lowercase normative keywords in prose (e.g. "must", "should", "may").
 * - Keep warning mode by default.
 * - Allow strict/error mode through env for future enforcement.
 *
 * Usage:
 *   node scripts/validate-rfc2119.cjs
 *   RFC2119_MODE=error node scripts/validate-rfc2119.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'docs', 'architecture', 'engine', 'contracts');

// Modes: "warn" (default) or "error".
const argv = process.argv.slice(2);
const cliMode = getArgValue(argv, '--mode');
const cliFail = hasFlag(argv, '--fail');

const mode = (cliMode || process.env.RFC2119_MODE || 'warn').toLowerCase();
const failOnFindings = mode === 'error' || process.env.RFC2119_FAIL === '1' || cliFail;

const KEYWORDS = [
  'MUST NOT',
  'SHALL NOT',
  'SHOULD NOT',
  'MUST',
  'SHALL',
  'SHOULD',
  'REQUIRED',
  'RECOMMENDED',
  'MAY',
  'OPTIONAL',
];

const LOWERCASE_KEYWORDS = [
  'must not',
  'shall not',
  'should not',
  'must',
  'shall',
  'should',
  'required',
  'recommended',
  'may',
  'optional',
];

const LOWERCASE_PATTERN = new RegExp(
  `\\b(${LOWERCASE_KEYWORDS.map(escapeRegex).join('|')})\\b`,
  'g'
);

main();

function main() {
  if (!fs.existsSync(CONTRACTS_DIR)) {
    console.log('RFC2119 | contracts directory not found, skipping');
    process.exit(0);
  }

  const files = walkMarkdown(CONTRACTS_DIR).sort();
  const findings = [];

  for (const file of files) {
    const rel = normalizeRel(file);
    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split(/\r?\n/);
    let inFence = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];

      if (isFenceDelimiter(line)) {
        inFence = !inFence;
        continue;
      }

      if (inFence) {
        continue;
      }

      const sanitized = sanitizeLine(line);
      if (!sanitized.trim()) continue;

      const matches = [...sanitized.matchAll(LOWERCASE_PATTERN)];
      for (const match of matches) {
        const token = match[1];
        const canonical = token.toUpperCase();

        if (!KEYWORDS.includes(canonical)) {
          continue;
        }

        findings.push({
          file: rel,
          line: i + 1,
          column: (match.index || 0) + 1,
          found: token,
          expected: canonical,
        });
      }
    }
  }

  printReport(files.length, findings);

  if (findings.length > 0 && failOnFindings) {
    process.exit(1);
  }
  process.exit(0);
}

function printReport(fileCount, findings) {
  const level = findings.length > 0 ? (failOnFindings ? 'ERROR' : 'WARN') : 'OK';
  console.log(
    `RFC2119 | mode=${mode} | files=${fileCount} | findings=${findings.length} | status=${level}`
  );

  if (findings.length === 0) {
    return;
  }

  const byFile = new Map();
  for (const finding of findings) {
    if (!byFile.has(finding.file)) {
      byFile.set(finding.file, []);
    }
    byFile.get(finding.file).push(finding);
  }

  for (const file of [...byFile.keys()].sort()) {
    console.log(`\n- ${file}`);
    const rows = byFile.get(file).sort((a, b) => {
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    });
    for (const row of rows) {
      console.log(
        `  L${row.line}:C${row.column} lowercase normative keyword "${row.found}" -> use "${row.expected}"`
      );
    }
  }
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

function sanitizeLine(line) {
  // Remove fenced-code backticks and inline code fragments to avoid false positives.
  return line.replace(/`[^`]*`/g, '');
}

function isFenceDelimiter(line) {
  return /^\s*```/.test(line.trim());
}

function normalizeRel(fullPath) {
  return path.relative(ROOT, fullPath).replace(/\\/g, '/');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function getArgValue(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return '';
  return args[index + 1] || '';
}
