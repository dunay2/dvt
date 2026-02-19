#!/usr/bin/env node
/* eslint-env node */
/* global __dirname, process, console */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTRACTS_DIR = path.join(ROOT, 'docs', 'architecture', 'engine', 'contracts');
const GLOSSARY_PATH = path.join(CONTRACTS_DIR, 'engine', 'GlossaryContract.v1.md');

const args = process.argv.slice(2);
const mode = (getArgValue(args, '--mode') || process.env.GLOSSARY_MODE || 'warn').toLowerCase();
const failOnFindings =
  mode === 'error' || process.env.GLOSSARY_FAIL === '1' || hasFlag(args, '--fail');

main();

function main() {
  if (!fs.existsSync(GLOSSARY_PATH)) {
    console.log('GLOSSARY | glossary source not found, skipping');
    process.exit(0);
  }

  const glossarySource = fs.readFileSync(GLOSSARY_PATH, 'utf8');
  const prohibitedMap = parseProhibitedSynonyms(glossarySource);

  if (prohibitedMap.size === 0) {
    console.log('GLOSSARY | no prohibited synonyms found in glossary table, skipping');
    process.exit(0);
  }

  const files = walkMarkdown(CONTRACTS_DIR).sort();
  const findings = [];

  for (const file of files) {
    const rel = normalizeRel(file);
    if (rel.endsWith('engine/GlossaryContract.v1.md')) continue;

    const source = fs.readFileSync(file, 'utf8');
    const lines = source.split(/\r?\n/);
    let inFence = false;

    for (let i = 0; i < lines.length; i += 1) {
      const raw = lines[i];
      if (isFenceDelimiter(raw)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;

      // Keep prose only; avoid noisy hits in inline code and markdown links.
      let line = stripInlineCode(raw);
      line = stripMarkdownLinks(line);
      if (!line.trim()) continue;

      for (const [canonical, synonyms] of prohibitedMap.entries()) {
        for (const synonym of synonyms) {
          const re = new RegExp(`\\b${escapeRegex(synonym)}\\b`, 'gi');
          let match;
          while ((match = re.exec(line)) !== null) {
            findings.push({
              file: rel,
              line: i + 1,
              column: (match.index || 0) + 1,
              synonym,
              canonical,
            });
          }
        }
      }
    }
  }

  printReport(files.length, findings);

  if (findings.length > 0 && failOnFindings) {
    process.exit(1);
  }
  process.exit(0);
}

function parseProhibitedSynonyms(source) {
  const out = new Map();
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim().toLowerCase() === '## 10) prohibited synonyms');
  if (start === -1) return out;

  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) break;
    if (!line.startsWith('|')) continue;
    if (line.includes('Canonical Term') || line.includes('---')) continue;

    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;

    const canonical = cells[0].toLowerCase();
    const synonyms = cells[1]
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (canonical && synonyms.length > 0) {
      out.set(canonical, synonyms);
    }
  }

  return out;
}

function printReport(fileCount, findings) {
  const status = findings.length === 0 ? 'OK' : failOnFindings ? 'ERROR' : 'WARN';
  console.log(
    `GLOSSARY | mode=${mode} | files=${fileCount} | findings=${findings.length} | status=${status}`
  );

  if (findings.length === 0) return;

  const rows = findings
    .slice()
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column);

  for (const row of rows) {
    console.log(
      `- ${row.file}:L${row.line}:C${row.column} prohibited term "${row.synonym}" -> prefer canonical "${row.canonical}"`
    );
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

function stripInlineCode(line) {
  return line.replace(/`[^`]*`/g, '');
}

function stripMarkdownLinks(line) {
  return line.replace(/\[[^\]]*\]\([^)]*\)/g, '');
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

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
