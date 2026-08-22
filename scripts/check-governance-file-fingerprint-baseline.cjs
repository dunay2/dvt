#!/usr/bin/env node
/**
 * Generate and validate the accepted governance file-fingerprint baseline.
 */

const fs = require('node:fs');
const path = require('node:path');
const { sha256HexUtf8 } = require('@dvt/crypto');
const yaml = require('js-yaml');
const { readFileIndexFromDisk } = require('./generate-governance-file-component-index.cjs');
const {
  generatedStatusDir,
  governanceGeneratedPath,
  repoRelative,
  repoRoot,
} = require('./governance-generated-paths.cjs');

const statusDir = generatedStatusDir;
const baselineShardDir = path.join(statusDir, 'governance-file-fingerprints');
const fileIndexPath = governanceGeneratedPath('system-governance-file-index.files.yaml');
const baselinePath = governanceGeneratedPath('system-governance-file-fingerprint-baseline.yaml');
const impactReportPath = governanceGeneratedPath(
  'system-governance-file-fingerprint-impact-20260501.md'
);
const sourcePath = repoRelative(fileIndexPath);
const baselineShardDirRelativePath = repoRelative(baselineShardDir);

function sha256(value) {
  return sha256HexUtf8(value);
}

function renderYaml(payload) {
  return yaml.dump(payload, {
    lineWidth: 100,
    noRefs: true,
    sortKeys: false,
  });
}

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function readFingerprintBaselineFromDisk(manifestPath = baselinePath) {
  const manifest = readYaml(manifestPath);
  if (Array.isArray(manifest.files)) {
    return manifest;
  }

  const shards = {};
  for (const shard of Array.isArray(manifest.shards) ? manifest.shards : []) {
    const shardPath = path.join(repoRoot, ...shard.path.split('/'));
    const content = fs.readFileSync(shardPath, 'utf8');
    if (shard.contentHash && sha256(content) !== shard.contentHash) {
      throw new Error(`Governance fingerprint shard hash mismatch: ${shard.path}`);
    }
    shards[shard.path] = yaml.load(content);
  }

  return { manifest, shards };
}

function fingerprintRow(entry) {
  return {
    fileId: entry.fileId,
    path: entry.path,
    contentHash: entry.contentHash,
    governanceHash: entry.governanceHash,
    stateFingerprint: entry.stateFingerprint,
    rootUnit: entry.rootUnit,
    domainUnit: entry.domainUnit,
    componentUnit: entry.componentUnit,
    owningUnit: entry.owningUnit,
  };
}

function fingerprintShardIdForRow(entry) {
  return entry.componentUnit || entry.domainUnit || entry.rootUnit || 'UNOWNED';
}

function buildFingerprintShardPayload(shardId, files) {
  return {
    version: 1,
    shardId,
    source: sourcePath,
    fileCount: files.length,
    files,
  };
}

function buildFingerprintBaseline(currentEntries, options = {}) {
  const shardDirectory = options.shardDirectory || baselineShardDirRelativePath;
  const files = currentEntries
    .map(fingerprintRow)
    .sort((left, right) => left.path.localeCompare(right.path));
  const filesByShard = new Map();

  for (const file of files) {
    const shardId = fingerprintShardIdForRow(file);
    const shardFiles = filesByShard.get(shardId) || [];
    shardFiles.push(file);
    filesByShard.set(shardId, shardFiles);
  }

  const shards = {};
  const shardRows = [...filesByShard.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shardId, shardFiles]) => {
      const sortedFiles = [...shardFiles].sort((left, right) =>
        left.path.localeCompare(right.path)
      );
      const shardPath = `${shardDirectory}/${shardId}.fingerprints.yaml`;
      const payload = buildFingerprintShardPayload(shardId, sortedFiles);
      const content = renderYaml(payload);

      shards[shardPath] = payload;
      return {
        id: shardId,
        path: shardPath,
        fileCount: sortedFiles.length,
        contentHash: sha256(content),
      };
    });

  return {
    manifest: {
      version: 1,
      source: sourcePath,
      shardDirectory,
      fileCount: files.length,
      shards: shardRows,
    },
    shards,
  };
}

function normalizeBaselineInput(baseline, explicitShardsByPath) {
  if (baseline && baseline.manifest) {
    return {
      manifest: baseline.manifest,
      shardsByPath: baseline.shards || explicitShardsByPath || {},
    };
  }

  return {
    manifest: baseline,
    shardsByPath: explicitShardsByPath || {},
  };
}

function expandFingerprintBaseline(baseline, explicitShardsByPath) {
  const { manifest, shardsByPath } = normalizeBaselineInput(baseline, explicitShardsByPath);
  if (Array.isArray(manifest.files)) {
    return manifest.files;
  }

  const shardRows = Array.isArray(manifest.shards) ? manifest.shards : [];
  const files = [];
  const seenPaths = new Set();

  for (const shard of shardRows) {
    const shardPayload = shardsByPath[shard.path];
    if (!shardPayload) {
      throw new Error(`Missing governance fingerprint shard: ${shard.path}`);
    }
    if (shardPayload.shardId && shardPayload.shardId !== shard.id) {
      throw new Error(
        `Governance fingerprint shard ${shard.path} declares ${shardPayload.shardId} but manifest expected ${shard.id}`
      );
    }

    const shardFiles = Array.isArray(shardPayload.files) ? shardPayload.files : [];
    if (shard.fileCount !== shardFiles.length || shardPayload.fileCount !== shardFiles.length) {
      throw new Error(
        `Governance fingerprint shard ${shard.path} expected ${shard.fileCount} files but contained ${shardFiles.length}`
      );
    }

    for (const file of shardFiles) {
      if (seenPaths.has(file.path)) {
        throw new Error(`Duplicate file path in governance fingerprint shards: ${file.path}`);
      }
      seenPaths.add(file.path);
      files.push(file);
    }
  }

  if (manifest.fileCount !== files.length) {
    throw new Error(
      `Governance fingerprint baseline expected ${manifest.fileCount} files but shards contained ${files.length}`
    );
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function keyFor(entry) {
  return entry.path;
}

function impactKey(entry) {
  return `${entry.rootUnit}\0${entry.domainUnit}\0${entry.componentUnit}`;
}

function impactRow(entry) {
  return {
    rootUnit: entry.rootUnit,
    domainUnit: entry.domainUnit,
    componentUnit: entry.componentUnit,
    owningUnit: entry.owningUnit,
  };
}

function addImpact(impacts, entry, field) {
  const key = impactKey(entry);
  const current = impacts.get(key) || {
    rootUnit: entry.rootUnit,
    domainUnit: entry.domainUnit,
    componentUnit: entry.componentUnit,
    changed: 0,
    missing: 0,
    extra: 0,
  };

  current[field] += 1;
  impacts.set(key, current);
}

function compareFingerprintBaseline(baseline, currentEntries) {
  const baselineFiles = expandFingerprintBaseline(baseline);
  const currentFiles = currentEntries.map(fingerprintRow);
  const baselineByPath = new Map(baselineFiles.map((entry) => [keyFor(entry), entry]));
  const currentByPath = new Map(currentFiles.map((entry) => [keyFor(entry), entry]));
  const changed = [];
  const missing = [];
  const extra = [];
  const impacts = new Map();

  for (const baselineEntry of baselineFiles) {
    const currentEntry = currentByPath.get(keyFor(baselineEntry));

    if (!currentEntry) {
      const row = {
        path: baselineEntry.path,
        fileId: baselineEntry.fileId,
        ...impactRow(baselineEntry),
      };
      missing.push(row);
      addImpact(impacts, baselineEntry, 'missing');
      continue;
    }

    if (baselineEntry.stateFingerprint !== currentEntry.stateFingerprint) {
      const row = {
        path: currentEntry.path,
        fileId: currentEntry.fileId,
        previousStateFingerprint: baselineEntry.stateFingerprint,
        currentStateFingerprint: currentEntry.stateFingerprint,
        contentChanged: baselineEntry.contentHash !== currentEntry.contentHash,
        governanceChanged: baselineEntry.governanceHash !== currentEntry.governanceHash,
        ...impactRow(currentEntry),
      };
      changed.push(row);
      addImpact(impacts, currentEntry, 'changed');
    }
  }

  for (const currentEntry of currentFiles) {
    if (baselineByPath.has(keyFor(currentEntry))) {
      continue;
    }

    const row = {
      path: currentEntry.path,
      fileId: currentEntry.fileId,
      ...impactRow(currentEntry),
    };
    extra.push(row);
    addImpact(impacts, currentEntry, 'extra');
  }

  changed.sort((left, right) => left.path.localeCompare(right.path));
  missing.sort((left, right) => left.path.localeCompare(right.path));
  extra.sort((left, right) => left.path.localeCompare(right.path));

  return {
    ok: changed.length === 0 && missing.length === 0 && extra.length === 0,
    changed,
    missing,
    extra,
    impactedComponents: [...impacts.values()].sort(
      (left, right) =>
        left.rootUnit.localeCompare(right.rootUnit) ||
        left.domainUnit.localeCompare(right.domainUnit) ||
        left.componentUnit.localeCompare(right.componentUnit)
    ),
  };
}

function classifyChangedEntry(entry) {
  if (entry.contentChanged && entry.governanceChanged) {
    return 'both';
  }
  if (entry.governanceChanged) {
    return 'governance';
  }
  return 'content';
}

function classifyOwnerFlags(change) {
  const haystack = [
    change.path,
    change.rootUnit,
    change.domainUnit,
    change.componentUnit,
    change.owningUnit,
  ]
    .join(' ')
    .toLowerCase();
  const flags = [];

  for (const [flag, patterns] of [
    ['legacy', ['legacy']],
    ['drift', ['drift']],
    ['engine', ['engine']],
    ['contracts', ['contracts', 'specs/contracts']],
    ['adapters', ['adapter-', 'adapters']],
    ['ci', ['ci', '.github', 'scripts/', 'tools/ci']],
    ['api', ['api']],
    ['web', ['web', 'frontend']],
  ]) {
    if (patterns.some((pattern) => haystack.includes(pattern))) {
      flags.push(flag);
    }
  }

  return flags;
}

function buildImpactReport(report) {
  const totals = {
    content: 0,
    governance: 0,
    both: 0,
    added: 0,
    removed: 0,
  };
  const byComponent = new Map();

  function addChange(change) {
    totals[change.changeType] += 1;
    const key = impactKey(change);
    const component = byComponent.get(key) || {
      rootUnit: change.rootUnit,
      domainUnit: change.domainUnit,
      componentUnit: change.componentUnit,
      ownerFlags: [],
      changes: [],
    };

    component.ownerFlags = [
      ...new Set([...component.ownerFlags, ...classifyOwnerFlags(change)]),
    ].sort();
    component.changes.push({
      changeType: change.changeType,
      path: change.path,
      fileId: change.fileId,
      owningUnit: change.owningUnit,
    });
    byComponent.set(key, component);
  }

  for (const entry of report.changed) {
    addChange({
      ...entry,
      changeType: classifyChangedEntry(entry),
    });
  }

  for (const entry of report.extra) {
    addChange({
      ...entry,
      changeType: 'added',
    });
  }

  for (const entry of report.missing) {
    addChange({
      ...entry,
      changeType: 'removed',
    });
  }

  const components = [...byComponent.values()]
    .map((component) => ({
      ...component,
      changes: component.changes.sort((left, right) => left.path.localeCompare(right.path)),
    }))
    .sort(
      (left, right) =>
        left.rootUnit.localeCompare(right.rootUnit) ||
        left.domainUnit.localeCompare(right.domainUnit) ||
        left.componentUnit.localeCompare(right.componentUnit)
    );

  return {
    version: 1,
    totalChanges: Object.values(totals).reduce((total, count) => total + count, 0),
    totals,
    components,
  };
}

function padTableCell(value, width, alignRight = false) {
  const text = String(value);
  return alignRight ? text.padStart(width, ' ') : text.padEnd(width, ' ');
}

function renderMarkdownTable(headers, rows, alignRightColumns = new Set()) {
  const allRows = [headers, ...rows];
  const widths = headers.map((_, index) =>
    Math.max(...allRows.map((row) => String(row[index] || '').length))
  );
  const separator = headers.map((_, index) => {
    const width = Math.max(widths[index], 3);
    return alignRightColumns.has(index) ? `${'-'.repeat(width - 1)}:` : '-'.repeat(width);
  });

  return [headers, separator, ...rows]
    .map(
      (row, rowIndex) =>
        `| ${row
          .map((cell, index) =>
            padTableCell(cell, widths[index], rowIndex !== 1 && alignRightColumns.has(index))
          )
          .join(' | ')} |`
    )
    .join('\n');
}

function renderImpactMarkdown(impactReport) {
  const totalRows = Object.entries(impactReport.totals).map(([type, count]) => [
    `\`${type}\``,
    String(count),
  ]);
  const componentRows =
    impactReport.components.length > 0
      ? impactReport.components.map((component) => [
          `\`${component.rootUnit}\``,
          `\`${component.domainUnit}\``,
          `\`${component.componentUnit}\``,
          component.ownerFlags.map((flag) => `\`${flag}\``).join(', ') || '_None_',
          String(component.changes.length),
        ])
      : [['_None_', '_None_', '_None_', '_None_', '0']];
  const changeRows =
    impactReport.components.length > 0
      ? impactReport.components.flatMap((component) =>
          component.changes.map((change) => [
            `\`${change.changeType}\``,
            `\`${change.path}\``,
            `\`${change.fileId}\``,
            `\`${component.rootUnit}\``,
            `\`${component.domainUnit}\``,
            `\`${component.componentUnit}\``,
            `\`${change.owningUnit}\``,
          ])
        )
      : [['_None_', '_None_', '_None_', '_None_', '_None_', '_None_', '_None_']];

  return `---
title: System Governance File Fingerprint Impact
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: status
---

# System Governance File Fingerprint Impact

This page is generated from the accepted fingerprint baseline and the current
file governance index. It is the reviewer-facing impact report for legitimate
baseline changes.

## Totals

${renderMarkdownTable(['Change type', 'Files'], totalRows, new Set([1]))}

## Impacted Components

${renderMarkdownTable(
  ['Root unit', 'Domain unit', 'Component unit', 'Flags', 'Files'],
  componentRows,
  new Set([4])
)}

## File Changes

${renderMarkdownTable(
  ['Type', 'File', 'File ID', 'Root', 'Domain', 'Component', 'Owning unit'],
  changeRows
)}
`;
}

function readCurrentFileIndex() {
  return readFileIndexFromDisk(fileIndexPath);
}

function writeIfChanged(filePath, next) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === next) {
    return false;
  }
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function removeStaleFingerprintShardFiles(expectedRelativePaths) {
  if (!fs.existsSync(baselineShardDir)) {
    return false;
  }

  const expected = new Set(
    expectedRelativePaths.map((relativePath) => path.join(repoRoot, ...relativePath.split('/')))
  );
  let removed = false;

  for (const entry of fs.readdirSync(baselineShardDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.fingerprints.yaml')) {
      continue;
    }

    const absolutePath = path.join(baselineShardDir, entry.name);
    if (!expected.has(absolutePath)) {
      fs.unlinkSync(absolutePath);
      removed = true;
    }
  }

  return removed;
}

function printReport(report) {
  console.error('[docs:governance:file-fingerprint-baseline] FAILED');
  console.error(
    `Changed: ${report.changed.length}; missing: ${report.missing.length}; extra: ${report.extra.length}`
  );

  for (const impact of report.impactedComponents) {
    console.error(
      `- ${impact.rootUnit}/${impact.domainUnit}/${impact.componentUnit}: changed=${impact.changed}, missing=${impact.missing}, extra=${impact.extra}`
    );
  }
}

function main() {
  const writeMode = process.argv.includes('--write');
  const reportMode = process.argv.includes('--report');
  const currentEntries = readCurrentFileIndex();
  const nextBaseline = buildFingerprintBaseline(currentEntries);
  fs.mkdirSync(statusDir, { recursive: true });

  if (writeMode) {
    fs.mkdirSync(baselineShardDir, { recursive: true });
    const shardPaths = Object.keys(nextBaseline.shards);
    const changed = [
      writeIfChanged(baselinePath, renderYaml(nextBaseline.manifest)),
      ...Object.entries(nextBaseline.shards).map(([shardPath, payload]) =>
        writeIfChanged(path.join(repoRoot, ...shardPath.split('/')), renderYaml(payload))
      ),
      removeStaleFingerprintShardFiles(shardPaths),
    ].some(Boolean);
    console.log(
      `[docs:governance:file-fingerprint-baseline] ${changed ? 'updated' : 'unchanged'} ${path.relative(
        repoRoot,
        baselinePath
      )}`
    );
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    console.error('[docs:governance:file-fingerprint-baseline] FAILED');
    console.error('Accepted fingerprint baseline is missing. Run the baseline generator.');
    process.exitCode = 1;
    return;
  }

  const baseline = readFingerprintBaselineFromDisk(baselinePath);
  const report = compareFingerprintBaseline(baseline, currentEntries);
  const impactReport = buildImpactReport(report);
  const impactMarkdown = renderImpactMarkdown(impactReport);

  if (reportMode) {
    const changed = writeIfChanged(impactReportPath, impactMarkdown);
    console.log(
      `[docs:governance:file-fingerprint-impact] ${changed ? 'updated' : 'unchanged'} ${path.relative(
        repoRoot,
        impactReportPath
      )}`
    );
  }

  if (!report.ok) {
    if (!reportMode) {
      console.error(impactMarkdown);
    }
    printReport(report);
    process.exitCode = 1;
    return;
  }

  console.log(
    `[docs:governance:file-fingerprint-baseline] accepted ${nextBaseline.manifest.fileCount} file fingerprints`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildFingerprintBaseline,
  buildImpactReport,
  compareFingerprintBaseline,
  expandFingerprintBaseline,
  readFingerprintBaselineFromDisk,
  renderImpactMarkdown,
};
