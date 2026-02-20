#!/usr/bin/env node
/* eslint-env node */
/* global console, process, __dirname */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CONTRACTS_ROOT = path.join(REPO_ROOT, 'docs', 'architecture', 'engine', 'contracts');
const README_PATH = path.join(CONTRACTS_ROOT, 'README.md');

const START_MARKER = '## 1) Current contracts in repository';
const END_MARKER = '## 1.1) Historical / reference contracts';

const AREA_BY_DIR = {
  engine: 'engine',
  'state-store': 'state-store',
  security: 'security',
  extensions: 'extensions',
  capabilities: 'capabilities',
  schemas: 'schemas',
};

const TYPE_BY_EXT = {
  '.md': 'Core',
  '.json': 'Schema',
};

function walkFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'events') continue;
      out.push(...walkFiles(abs));
      continue;
    }
    out.push(abs);
  }

  return out;
}

function toPosix(relPath) {
  return relPath.replace(/\\/g, '/');
}

function parseMarkdownMeta(content) {
  const statusMatch = content.match(/^\*\*Status\*\*:\s*(.+)$/m);
  const versionMatch = content.match(/^\*\*Version\*\*:\s*(.+)$/m);

  return {
    status: statusMatch ? statusMatch[1].trim() : 'DRAFT',
    version: versionMatch ? versionMatch[1].trim() : null,
  };
}

function normalizeVersion(rawVersion, relPath, content) {
  if (rawVersion) {
    const cleaned = rawVersion
      .replace(/\*+/g, '')
      .replace(/`/g, '')
      .replace(/\(.*?\)/g, '')
      .trim();
    const found = cleaned.match(/v?\d+(?:\.\d+){0,2}/i);
    if (found) {
      return found[0].toLowerCase().startsWith('v') ? found[0] : `v${found[0]}`;
    }
  }

  if (content) {
    const titleVersion = content.match(/^#\s+.*?v(\d+(?:\.\d+)*)\)?\s*$/im);
    if (titleVersion) return `v${titleVersion[1]}`;
  }

  const fileVersion = relPath.match(/\.v(\d+(?:\.\d+)*)\./i);
  if (fileVersion) return `v${fileVersion[1]}`;

  return 'v1';
}

function normalizeNameToken(value) {
  return value
    .replace(/\.md$/i, '')
    .replace(/\.json$/i, '')
    .replace(/\.schema$/i, '')
    .replace(/\.v\d+(?:\.\d+)*$/i, '')
    .replace(/^[\W_]+|[\W_]+$/g, '');
}

function toTitleCase(s) {
  return s
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .trim();
}

function inferVersionFromJson(content, relPath) {
  try {
    const json = JSON.parse(content);

    if (typeof json.schemaVersion === 'string' && json.schemaVersion.trim()) {
      return json.schemaVersion.trim().startsWith('v') ? json.schemaVersion.trim() : `v${json.schemaVersion.trim()}`;
    }

    if (typeof json.title === 'string') {
      const inTitle = json.title.match(/v(\d+(?:\.\d+)*)/i);
      if (inTitle) return `v${inTitle[1]}`;
    }

    if (typeof json.$id === 'string') {
      const inId = json.$id.match(/\.v(\d+(?:\.\d+)*)\./i);
      if (inId) return `v${inId[1]}`;
    }
  } catch {
    // noop: fallback below
  }

  return normalizeVersion(null, relPath, content);
}

function normalizeContractLabel(label) {
  return label
    .replace(/^[A-Za-z0-9_.-]+\.md\s*-\s*/i, '')
    .replace(/\s*\(Normative[^)]*\)\s*$/i, '')
    .replace(/\s*\((?:[^)]*Normative[^)]*)\)\s*$/i, '')
    .replace(/\s*\(v\d+(?:\.\d+){0,2}\)\s*$/i, '')
    .replace(/\s+v\d+(?:\.\d+){0,2}\s*$/i, '')
    .replace(/\s+Contract\s*$/i, '')
    .replace(/\.v\d+(?:\.\d+)*\.md\b/gi, '')
    .trim();
}

function inferTypeFromLabel(label, baseType) {
  const lower = label.toLowerCase();
  if (lower.includes('alias')) return 'Alias';
  if (lower.includes('reference')) return 'Reference';
  if (lower.includes('schema')) return 'Schema';
  if (lower.includes('matrix')) return 'Matrix';
  return baseType;
}

function normalizeLifecycle(status) {
  const upper = status.toUpperCase();
  if (upper.includes('DRAFT')) return 'DRAFT';
  if (upper.includes('DEPRECATED')) return 'DEPRECATED';
  if (upper.includes('RETIRED')) return 'RETIRED';
  if (upper.includes('SUNSET')) return 'SUNSET';
  if (upper.includes('NORMATIVE') || upper.includes('ACTIVE')) return 'ACTIVE';
  return 'DRAFT';
}

function inferArea(relPath) {
  const parts = relPath.split('/');
  if (parts.length === 1 && parts[0] === 'README.md') return null;
  return AREA_BY_DIR[parts[0]] || null;
}

function inferType(relPath, ext) {
  if (relPath.startsWith('extensions/')) return 'Extension';
  if (relPath.includes('.reference.')) return 'Reference';
  if (relPath.endsWith('RunEventCatalog.v1.md')) return 'Alias';
  if (relPath === 'state-store/README.md') return 'Core';
  return TYPE_BY_EXT[ext] || 'Core';
}

function inferDisplayName(relPath, ext, content) {
  if (ext === '.md') {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      let title = titleMatch[1].trim();
      title = title.replace(/\s*\(Normative[^)]*\)\s*$/i, '').trim();
      title = title.replace(/\s+Contract\s*$/i, '').trim();
      title = title.replace(/\s+\(baseline\)\s*$/i, '').trim();
      return title;
    }
  }

  if (ext === '.json') {
    try {
      const parsed = JSON.parse(content);
      if (typeof parsed.title === 'string' && parsed.title.trim()) {
        return parsed.title.trim();
      }
    } catch {
      // noop; fallback to filename
    }
  }

  const base = path.basename(relPath, ext);
  return toTitleCase(normalizeNameToken(base)).replace(/\s+Reference$/i, ' (reference)');
}

function shouldIncludeFile(relPath, ext) {
  if (relPath === 'README.md') return false;
  if (relPath === 'CONTRACT_TEMPLATE.v1.md') return false;
  if (relPath.startsWith('capabilities/README')) return false;
  if (relPath.startsWith('MIGRATION_')) return false;
  if (relPath.startsWith('DECISION_AND_RISK_LOG_')) return false;
  if (relPath.includes('.reference.')) return false;

  if (ext === '.md') {
    if (relPath.includes('/events/')) return false;
    return true;
  }

  if (ext === '.json') {
    return relPath.endsWith('.schema.json') || relPath.endsWith('.capabilities.json');
  }

  return false;
}

function collectContracts() {
  const files = walkFiles(CONTRACTS_ROOT);
  const rows = [];

  for (const abs of files) {
    const rel = toPosix(path.relative(CONTRACTS_ROOT, abs));
    const ext = path.extname(rel).toLowerCase();
    if (!shouldIncludeFile(rel, ext)) continue;

    const area = inferArea(rel);
    if (!area) continue;

    const content = fs.readFileSync(abs, 'utf8');
    const meta = ext === '.md' ? parseMarkdownMeta(content) : { status: 'DRAFT', version: null };
    const contract = normalizeContractLabel(inferDisplayName(rel, ext, content));
    const baseType = inferType(rel, ext);
    const type = inferTypeFromLabel(contract, baseType);
    const version = ext === '.json' ? inferVersionFromJson(content, rel) : normalizeVersion(meta.version, rel, content);

    rows.push({
      area,
      contract,
      version,
      lifecycle: normalizeLifecycle(meta.status),
      type,
      relPath: rel,
    });
  }

  rows.sort((a, b) => {
    return (
      a.area.localeCompare(b.area, 'en') ||
      a.contract.localeCompare(b.contract, 'en') ||
      a.version.localeCompare(b.version, 'en') ||
      a.relPath.localeCompare(b.relPath, 'en')
    );
  });

  return rows;
}

function renderTable(rows) {
  const header = [
    '| Area | Contract | Version | Lifecycle | Type | Path |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  const lines = rows.map((row) => {
    const contractLink = `[${row.contract}](./${row.relPath})`;
    const pathLink = `[${row.relPath}](./${row.relPath})`;
    return `| ${row.area} | ${contractLink} | ${row.version} | ${row.lifecycle} | ${row.type} | ${pathLink} |`;
  });

  return [...header, ...lines].join('\n');
}

function replaceSection(content, newSection) {
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not locate contract index section markers in README.md');
  }

  const before = content.slice(0, start);
  const after = content.slice(end);

  const body = [
    START_MARKER,
    '',
    newSection,
    '',
    '---',
    '',
  ].join('\n');

  return `${before}${body}${after}`;
}

function run() {
  const rows = collectContracts();
  const table = renderTable(rows);

  const readme = fs.readFileSync(README_PATH, 'utf8');
  const next = replaceSection(readme, table);

  if (next !== readme) {
    fs.writeFileSync(README_PATH, next, 'utf8');
    console.log(`✅ Updated ${toPosix(path.relative(REPO_ROOT, README_PATH))} with ${rows.length} contracts`);
  } else {
    console.log(`✅ No changes. Contract index is up-to-date (${rows.length} contracts)`);
  }
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(`❌ Contract index generation failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  collectContracts,
  renderTable,
  normalizeLifecycle,
  normalizeVersion,
};
