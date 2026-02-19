#!/usr/bin/env node
/* eslint-env node */
/* global __dirname, process, console */

/**
 * Glossary usage validator (Issue #226)
 *
 * Validates contract markdown terminology against GlossaryContract.v1.md:
 * - Parses canonical terms section.
 * - Parses prohibited synonyms section.
 * - Scans contract docs for prohibited synonym usage.
 *
 * Usage:
 *   node scripts/validate-glossary-usage.cjs
 *   GLOSSARY_MODE=warn node scripts/validate-glossary-usage.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'docs', 'architecture', 'engine', 'contracts');
const GLOSSARY_FILE = path.join(CONTRACTS_DIR, 'engine', 'GlossaryContract.v1.md');

const argv = process.argv.slice(2);
const cliMode = getArgValue(argv, '--mode');
const cliFail = hasFlag(argv, '--fail');

const mode = String(cliMode || process.env.GLOSSARY_MODE || 'warn').toLowerCase();
const failOnFindings = mode !== 'warn' || process.env.GLOSSARY_FAIL === '1' || cliFail;

main();

function main() {
  if (!fs.existsSync(GLOSSARY_FILE)) {
    console.error(`GLOSSARY | missing source glossary: ${rel(GLOSSARY_FILE)}`);
    process.exit(1);
  }

  const glossarySource = fs.readFileSync(GLOSSARY_FILE, 'utf8');
  const canonicalTerms = extractCanonicalTerms(glossarySource);
  const prohibitedPairs = extractProhibitedSynonyms(glossarySource);

  if (canonicalTerms.length === 0 || prohibitedPairs.length === 0) {
    console.error(
      `GLOSSARY | parse failure | canonicalTerms=${canonicalTerms.length} | prohibitedPairs=${prohibitedPairs.length}`
    );
    process.exit(1);
  }

  const files = walkMarkdown(CONTRACTS_DIR)
    .filter((f) => path.resolve(f) !== path.resolve(GLOSSARY_FILE))
    .sort();

  const findings = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split(/\r?\n/);
    let inFence = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (isFenceDelimiter(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      const sanitized = sanitizeLine(line);
      if (!sanitized.trim()) continue;

      for (const pair of prohibitedPairs) {
        const regex = synonymPattern(pair.synonym);
        let match;
        while ((match = regex.exec(sanitized)) !== null) {
          findings.push({
            file: rel(file),
            line: i + 1,
            column: (match.index || 0) + 1,
            synonym: pair.synonym,
            canonical: pair.canonical,
          });
        }
      }
    }
  }

  findings.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.synonym.localeCompare(b.synonym);
  });

  printReport({
    filesScanned: files.length,
    canonicalTerms: canonicalTerms.length,
    prohibitedPairs: prohibitedPairs.length,
    findings,
  });

  if (findings.length > 0 && failOnFindings) {
    process.exit(1);
  }
  process.exit(0);
}

function printReport({ filesScanned, canonicalTerms, prohibitedPairs, findings }) {
  const status = findings.length > 0 ? (failOnFindings ? 'ERROR' : 'WARN') : 'OK';

  console.log(
    [
      `GLOSSARY | mode=${mode}`,
      `files=${filesScanned}`,
      `canonicalTerms=${canonicalTerms}`,
      `prohibitedPairs=${prohibitedPairs}`,
      `findings=${findings.length}`,
      `status=${status}`,
    ].join(' | ')
  );

  if (findings.length === 0) return;

  for (const f of findings) {
    console.log(
      `${f.file}:${f.line}:${f.column} prohibited synonym "${f.synonym}" -> use canonical "${f.canonical}"`
    );
  }
}

function extractCanonicalTerms(source) {
  const section = extractSection(source, '## 2) Canonical Core Terms', /^##\s+/m);
  if (!section) return [];

  const lines = section.split(/\r?\n/).map((l) => l.trim());
  const terms = new Set();

  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = parseTableRow(line);
    if (cells.length < 2) continue;
    if (/^[-: ]+$/.test(cells[0])) continue;

    const term = normalizeMarkdownTerm(cells[0]);
    if (!term || term.toLowerCase() === 'term') continue;
    terms.add(term);
  }

  return [...terms];
}

function extractProhibitedSynonyms(source) {
  const section = extractSection(source, '## 10) Prohibited Synonyms', /^##\s+/m);
  if (!section) return [];

  const lines = section.split(/\r?\n/).map((l) => l.trim());
  const rows = [];

  for (const line of lines) {
    if (!line.startsWith('|')) continue;
    const cells = parseTableRow(line);
    if (cells.length < 2) continue;
    if (/^[-: ]+$/.test(cells[0])) continue;

    const canonical = normalizeMarkdownTerm(cells[0]).toLowerCase();
    if (!canonical || canonical === 'canonical term') continue;

    const synonyms = cells[1]
      .split(',')
      .map((s) => normalizeMarkdownTerm(s).toLowerCase())
      .filter(Boolean);

    for (const synonym of synonyms) {
      rows.push({ canonical, synonym });
    }
  }

  return rows;
}

function extractSection(source, heading, nextHeadingRegex) {
  const start = source.indexOf(heading);
  if (start === -1) return '';

  const tail = source.slice(start + heading.length);
  const match = nextHeadingRegex.exec(tail);
  if (!match) return tail;
  return tail.slice(0, match.index);
}

function parseTableRow(line) {
  return line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function normalizeMarkdownTerm(value) {
  return value.replace(/\*\*/g, '').replace(/`/g, '').trim();
}

function sanitizeLine(line) {
  return line.replace(/`[^`]*`/g, '');
}

function isFenceDelimiter(line) {
  return /^\s*```/.test(line.trim());
}

function synonymPattern(synonym) {
  const escaped = escapeRegex(synonym);
  return new RegExp(`(^|[^A-Za-z0-9_])(${escaped})(?=$|[^A-Za-z0-9_])`, 'gi');
}

function walkMarkdown(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
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

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
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
