#!/usr/bin/env node
/**
 * Generate and validate the accepted governance file-fingerprint baseline.
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { readFileIndexFromDisk } = require('./generate-governance-file-component-index.cjs');

const repoRoot = path.resolve(__dirname, '..');
const statusDir = path.join(repoRoot, 'docs', 'planning', 'status');
const fileIndexPath = path.join(statusDir, 'system-governance-file-index.files.yaml');
const baselinePath = path.join(statusDir, 'system-governance-file-fingerprint-baseline.yaml');
const impactReportPath = path.join(
  statusDir,
  'system-governance-file-fingerprint-impact-20260501.md'
);
const sourcePath = 'docs/planning/status/system-governance-file-index.files.yaml';

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

function buildFingerprintBaseline(currentEntries) {
  const files = currentEntries
    .map(fingerprintRow)
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    version: 1,
    source: sourcePath,
    fileCount: files.length,
    files,
  };
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
  const baselineFiles = Array.isArray(baseline.files) ? baseline.files : [];
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

  if (writeMode) {
    const changed = writeIfChanged(baselinePath, renderYaml(nextBaseline));
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

  const baseline = readYaml(baselinePath);
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
    `[docs:governance:file-fingerprint-baseline] accepted ${nextBaseline.fileCount} file fingerprints`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildFingerprintBaseline,
  buildImpactReport,
  compareFingerprintBaseline,
  renderImpactMarkdown,
};
