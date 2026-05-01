#!/usr/bin/env node
/**
 * Generate and validate the accepted governance file-fingerprint baseline.
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const statusDir = path.join(repoRoot, 'docs', 'planning', 'status');
const fileIndexPath = path.join(statusDir, 'system-governance-file-index.files.yaml');
const baselinePath = path.join(statusDir, 'system-governance-file-fingerprint-baseline.yaml');
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

function readCurrentFileIndex() {
  const fileIndex = readYaml(fileIndexPath);
  if (!Array.isArray(fileIndex.files)) {
    throw new Error(`${sourcePath} must contain a files array`);
  }
  return fileIndex.files;
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
  if (!report.ok) {
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
  compareFingerprintBaseline,
};
