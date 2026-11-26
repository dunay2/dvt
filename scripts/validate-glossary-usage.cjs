#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  CONTRACTS_ROOT,
  listMarkdownFiles,
  requireContractMarkdownFiles,
} = require('./policy-validation-files.cjs');
const { stripInlineCodeFragments: stripInlineCode } = require('./policy-validation-text.cjs');

const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const mode = (getArgValue(args, '--mode') || process.env.GLOSSARY_MODE || 'warn').toLowerCase();
const failOnFindings =
  mode === 'error' || process.env.GLOSSARY_FAIL === '1' || hasFlag(args, '--fail');

function main(contractsDir = CONTRACTS_ROOT) {
  const glossaryPath = path.join(contractsDir, 'engine', 'GlossaryContract.v1.md');
  if (!fs.existsSync(glossaryPath)) {
    console.error('GLOSSARY | glossary source not found');
    process.exit(1);
  }

  const glossarySource = fs.readFileSync(glossaryPath, 'utf8');
  const prohibitedMap = parseProhibitedClaims(glossarySource);

  if (prohibitedMap.size === 0) {
    console.error('GLOSSARY | no prohibited terminology claims found in glossary policy');
    process.exit(1);
  }

  const files = requireContractMarkdownFiles(listMarkdownFiles(contractsDir).sort());
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

      for (const [canonical, claims] of prohibitedMap.entries()) {
        for (const claim of claims) {
          const re = new RegExp(`\\b${escapeRegex(claim)}\\b`, 'gi');
          let match;
          while ((match = re.exec(line)) !== null) {
            findings.push({
              file: rel,
              line: i + 1,
              column: (match.index || 0) + 1,
              claim,
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

function parseProhibitedClaims(source) {
  const out = new Map();
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex(
    (l) => l.trim().toLowerCase() === '## prohibited terminology claims'
  );
  if (start === -1) return out;

  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.startsWith('## ')) break;
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length === 3 && cells.every((cell) => /^:?-+:?$/.test(cell))) continue;
    if (
      cells[0]?.toLowerCase() === 'canonical term' &&
      cells[1]?.toLowerCase() === 'prohibited claim'
    )
      continue;
    if (cells.length !== 3 || cells.some((cell) => !cell) || !/\]\(#[a-z0-9-]+\)/i.test(cells[2])) {
      throw new Error(`GLOSSARY | malformed prohibited claim policy row at line ${i + 1}`);
    }
    const [canonical, claim] = cells;
    out.set(canonical, [...(out.get(canonical) ?? []), claim]);
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
      `- ${row.file}:L${row.line}:C${row.column} prohibited term "${row.claim}" -> prefer canonical "${row.canonical}"`
    );
  }
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

if (require.main === module) main();
module.exports = { main };
