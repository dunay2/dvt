#!/usr/bin/env node
/**
 * Generate the global governance file and component indexes.
 */

const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { findOwnerMatches, readManifest } = require('./check-governance-unit-coverage.cjs');

const repoRoot = path.resolve(__dirname, '..');
const statusDir = path.join(repoRoot, 'docs', 'planning', 'status');
const fileYamlPath = path.join(statusDir, 'system-governance-file-index.files.yaml');
const fileMarkdownPath = path.join(statusDir, 'system-governance-file-index-20260501.md');
const componentYamlPath = path.join(statusDir, 'system-governance-component-index.components.yaml');
const componentMarkdownPath = path.join(statusDir, 'system-governance-component-index-20260501.md');
const fingerprintBaselinePath = path.join(
  statusDir,
  'system-governance-file-fingerprint-baseline.yaml'
);

const generatedOutputPaths = [
  fileYamlPath,
  fileMarkdownPath,
  componentYamlPath,
  componentMarkdownPath,
  fingerprintBaselinePath,
].map((filePath) => toPosix(path.relative(repoRoot, filePath)));

const generatedFileYamlRelativePath = toPosix(path.relative(repoRoot, fileYamlPath));
const fingerprintBaselineRelativePath = toPosix(path.relative(repoRoot, fingerprintBaselinePath));

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const trackedFiles = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix);

  for (const generatedPath of generatedOutputPaths) {
    if (
      fs.existsSync(path.join(repoRoot, generatedPath)) &&
      !trackedFiles.includes(generatedPath)
    ) {
      trackedFiles.push(generatedPath);
    }
  }

  return trackedFiles.sort();
}

function buildUnitIndex(units) {
  return new Map(units.map((unit) => [unit.id, unit]));
}

function buildUnitPath(unit, unitById) {
  if (!unit) {
    return [];
  }

  const path = [];
  const seen = new Set();
  let current = unit;

  while (current && !seen.has(current.id)) {
    path.unshift(current);
    seen.add(current.id);
    current = current.parent ? unitById.get(current.parent) : null;
  }

  return path;
}

function buildUnitReferences(unitPath) {
  return unitPath.map((unit) => ({
    id: unit.id,
    name: unit.name || unit.id,
    level: unit.level || 'unknown',
    status: unit.status || 'unknown',
    governance: unit.governance || [],
  }));
}

function findUnitByLevel(unitPath, level) {
  return unitPath.find((unit) => unit.level === level)?.id;
}

function buildHierarchy(unit, unitById) {
  const unitPath = buildUnitPath(unit, unitById);
  const rootUnit = unitPath[0]?.id || unit?.id || 'UNOWNED';
  const componentUnit = findUnitByLevel(unitPath, 'component') || unit?.id || 'UNOWNED';
  const domainUnit = findUnitByLevel(unitPath, 'domain') || rootUnit;

  return {
    rootUnit,
    domainUnit,
    componentUnit,
    unitPath: unitPath.map((entry) => entry.id),
    unitReferences: buildUnitReferences(unitPath),
  };
}

function normalizeGeneratedIndexBytesForHash(contentBytes) {
  return Buffer.from(
    contentBytes
      .toString('utf8')
      .replace(/^(\s+(?:contentHash|stateFingerprint):\s+)[0-9a-f]{64}$/gm, '$1<normalized>'),
    'utf8'
  );
}

function normalizeTextBytesForHash(contentBytes) {
  if (contentBytes.includes(0)) {
    return contentBytes;
  }

  return Buffer.from(contentBytes.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

function readTrackedFileBytes(filePath) {
  const contentBytes = normalizeTextBytesForHash(fs.readFileSync(path.join(repoRoot, filePath)));

  if (filePath === generatedFileYamlRelativePath || filePath === fingerprintBaselineRelativePath) {
    return normalizeGeneratedIndexBytesForHash(contentBytes);
  }

  return contentBytes;
}

function buildGovernancePayload(entry) {
  return {
    componentUnit: entry.componentUnit,
    cqRails: entry.cqRails,
    dddOwner: entry.dddOwner,
    domainUnit: entry.domainUnit,
    governance: entry.governance,
    isDrift: entry.isDrift,
    isLegacy: entry.isLegacy,
    ownerLevel: entry.ownerLevel,
    owningUnit: entry.owningUnit,
    rootUnit: entry.rootUnit,
    unitPath: entry.unitPath,
    unitStatus: entry.unitStatus,
  };
}

function buildFileFingerprints(filePath, contentBytes, governancePayload) {
  const pathHash = sha256(`dvt:file-path:v1:${filePath}`);
  const contentHash = sha256(contentBytes);
  const governanceHash = sha256(stableStringify(governancePayload));

  return {
    fileId: `F-${sha256(`dvt:file:v1:${filePath}`).slice(0, 12).toUpperCase()}`,
    pathHash,
    contentHash,
    governanceHash,
    stateFingerprint: sha256(
      stableStringify({
        contentHash,
        governanceHash,
        pathHash,
      })
    ),
  };
}

function buildFileEntries(files, units, options = {}, unitById = buildUnitIndex(units)) {
  const readFileBytes = options.readFileBytes || readTrackedFileBytes;

  return files.map((filePath) => {
    const matches = findOwnerMatches(filePath, units);
    const owner = matches[0];
    const hierarchy = buildHierarchy(owner, unitById);
    const entry = {
      path: filePath,
      owningUnit: owner?.id || 'UNOWNED',
      rootUnit: hierarchy.rootUnit,
      domainUnit: hierarchy.domainUnit,
      componentUnit: hierarchy.componentUnit,
      unitPath: hierarchy.unitPath,
      ownerLevel: owner?.level || 'unowned',
      unitStatus: owner?.status || 'unowned',
      isDrift: owner?.status === 'drift',
      isLegacy: owner?.status === 'legacy',
      dddOwner: owner?.dddOwner || 'unowned',
      cqRails: owner?.cqRails || 'unowned',
      governance: owner?.governance || [],
    };

    return {
      ...buildFileFingerprints(filePath, readFileBytes(filePath), buildGovernancePayload(entry)),
      ...entry,
    };
  });
}

function buildComponentEntries(units, fileEntries, unitById = buildUnitIndex(units)) {
  const fileCountByUnit = new Map();
  for (const fileEntry of fileEntries) {
    fileCountByUnit.set(fileEntry.owningUnit, (fileCountByUnit.get(fileEntry.owningUnit) || 0) + 1);
  }

  return units
    .filter((unit) => unit.level === 'component' || unit.level === 'source')
    .map((unit) => {
      const hierarchy = buildHierarchy(unit, unitById);
      return {
        id: unit.id,
        name: unit.name,
        level: unit.level,
        parent: unit.parent,
        rootUnit: hierarchy.rootUnit,
        domainUnit: hierarchy.domainUnit,
        unitPath: hierarchy.unitPath,
        unitReferences: hierarchy.unitReferences,
        status: unit.status,
        isDrift: unit.status === 'drift',
        isLegacy: unit.status === 'legacy',
        childrenRequired: Boolean(unit.childrenRequired),
        fileCount: fileCountByUnit.get(unit.id) || 0,
        dddOwner: unit.dddOwner || 'N/A',
        cqRails: unit.cqRails || 'none',
        owns: unit.owns || [],
        excludes: unit.excludes || [],
        governance: unit.governance || [],
        fowlerSignals: unit.fowlerSignals || [],
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry[key], (counts.get(entry[key]) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([name, count]) => ({ name, count }));
}

function renderYaml(payload) {
  return yaml.dump(payload, {
    lineWidth: 100,
    noRefs: true,
    sortKeys: false,
  });
}

function renderCountTable(counts, label) {
  return [
    `| ${label} | Files |`,
    '| --- | ---: |',
    ...counts.map((item) => `| \`${item.name}\` | ${item.count} |`),
  ].join('\n');
}

function renderFileMarkdown(fileEntries, componentEntries) {
  const driftFiles = fileEntries.filter((entry) => entry.isDrift || entry.isLegacy);
  const ownerCounts = countBy(fileEntries, 'owningUnit');
  const statusCounts = countBy(fileEntries, 'unitStatus');
  const unowned = fileEntries.filter((entry) => entry.owningUnit === 'UNOWNED');

  const driftRows = driftFiles
    .map((entry) => `| \`${entry.path}\` | \`${entry.owningUnit}\` | \`${entry.unitStatus}\` |`)
    .join('\n');

  return `---
title: System Governance File Index
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: status
---

# System Governance File Index

## Purpose

This is the human summary for the exhaustive file-level governance index. The
machine-readable source is:

- [system-governance-file-index.files.yaml](./system-governance-file-index.files.yaml)
- [system-governance-file-fingerprint-baseline.yaml](./system-governance-file-fingerprint-baseline.yaml)

Every tracked repository file has one row in that YAML file. Each row records
the stable file id, path hash, content hash, governance hash, state
fingerprint, root unit, domain unit, component unit, owning unit, unit path,
governing documents, DDD owner, command/query rail posture, drift status, and
legacy status. The fingerprint baseline is the accepted drift-control snapshot
used by CI.

## Totals

- Tracked files indexed: ${fileEntries.length}
- Component/source owner units: ${componentEntries.length}
- Ungoverned files: ${unowned.length}
- Drift files: ${fileEntries.filter((entry) => entry.isDrift).length}
- Legacy files: ${fileEntries.filter((entry) => entry.isLegacy).length}

## By Status

<!-- prettier-ignore-start -->
${renderCountTable(statusCounts, 'Status')}
<!-- prettier-ignore-end -->

## By Owning Unit

<!-- prettier-ignore-start -->
${renderCountTable(ownerCounts, 'Owning unit')}
<!-- prettier-ignore-end -->

## Drift And Legacy Files

<!-- prettier-ignore-start -->
| File | Owning unit | Status |
| --- | --- | --- |
${driftRows || '| _None_ | _None_ | _None_ |'}
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance Component Index](./system-governance-component-index-20260501.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
- [System Governance Document Unit Map](./system-governance-document-unit-map-20260501.md)
`;
}

function renderComponentMarkdown(componentEntries) {
  const statusCounts = countBy(componentEntries, 'status');
  const levelCounts = countBy(componentEntries, 'level');
  const oversized = componentEntries
    .filter((entry) => entry.childrenRequired && entry.fileCount > 100)
    .sort((left, right) => right.fileCount - left.fileCount);

  const componentRows = componentEntries
    .map(
      (entry) =>
        `| \`${entry.id}\` | \`${entry.level}\` | \`${entry.status}\` | ${entry.fileCount} | \`${entry.dddOwner}\` | \`${entry.parent}\` |`
    )
    .join('\n');
  const oversizedRows = oversized
    .map((entry) => `| \`${entry.id}\` | ${entry.fileCount} | \`${entry.status}\` |`)
    .join('\n');

  return `---
title: System Governance Component Index
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: status
---

# System Governance Component Index

## Purpose

This is the human summary for component/source governance units. The
machine-readable source is:

- [system-governance-component-index.components.yaml](./system-governance-component-index.components.yaml)

The index exposes how many components exist, how many files each component owns,
which root/domain chain each component belongs to, which components still
require subdivision, and which components are drift or legacy.

## Totals

- Component/source units: ${componentEntries.length}
- Components: ${componentEntries.filter((entry) => entry.level === 'component').length}
- Source units: ${componentEntries.filter((entry) => entry.level === 'source').length}
- Drift components: ${componentEntries.filter((entry) => entry.isDrift).length}
- Legacy components: ${componentEntries.filter((entry) => entry.isLegacy).length}
- Components requiring children: ${componentEntries.filter((entry) => entry.childrenRequired).length}

## By Level

<!-- prettier-ignore-start -->
${renderCountTable(levelCounts, 'Level')}
<!-- prettier-ignore-end -->

## By Status

<!-- prettier-ignore-start -->
${renderCountTable(statusCounts, 'Status')}
<!-- prettier-ignore-end -->

## Oversized Components

Components with \`childrenRequired: true\` and more than 100 files:

<!-- prettier-ignore-start -->
| Component | Files | Status |
| --- | ---: | --- |
${oversizedRows || '| _None_ | 0 | _None_ |'}
<!-- prettier-ignore-end -->

## Components

<!-- prettier-ignore-start -->
| Component | Level | Status | Files | DDD owner | Parent |
| --- | --- | ---: | ---: | --- | --- |
${componentRows}
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
`;
}

function writeIfChanged(filePath, next) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === next) {
    return false;
  }
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function buildOutputs() {
  const manifest = readManifest();
  const units = Array.isArray(manifest.units) ? manifest.units : [];
  const unitById = buildUnitIndex(units);
  const fileEntries = buildFileEntries(getTrackedFiles(), units, {}, unitById);
  const componentEntries = buildComponentEntries(units, fileEntries, unitById);

  return {
    fileEntries,
    componentEntries,
    fileYaml: renderYaml({
      version: 1,
      generatedFrom: 'git ls-files',
      unitManifest: 'docs/planning/status/system-governance-unit-index.units.yaml',
      fileCount: fileEntries.length,
      files: fileEntries,
    }),
    componentYaml: renderYaml({
      version: 1,
      generatedFrom: 'docs/planning/status/system-governance-unit-index.units.yaml',
      fileIndex: 'docs/planning/status/system-governance-file-index.files.yaml',
      componentCount: componentEntries.length,
      components: componentEntries,
    }),
    fileMarkdown: renderFileMarkdown(fileEntries, componentEntries),
    componentMarkdown: renderComponentMarkdown(componentEntries),
  };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const outputs = buildOutputs();
  const changed = [
    writeIfChanged(fileYamlPath, outputs.fileYaml),
    writeIfChanged(fileMarkdownPath, outputs.fileMarkdown),
    writeIfChanged(componentYamlPath, outputs.componentYaml),
    writeIfChanged(componentMarkdownPath, outputs.componentMarkdown),
  ].some(Boolean);

  if (checkOnly && changed) {
    console.error('[docs:governance:file-component-index] FAILED');
    console.error('File/component governance indexes were stale. Regenerate and commit outputs.');
    process.exitCode = 1;
    return;
  }

  console.log(
    `[docs:governance:file-component-index] indexed ${outputs.fileEntries.length} files and ${outputs.componentEntries.length} component/source units`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildComponentEntries,
  buildFileEntries,
  buildFileFingerprints,
  buildOutputs,
  normalizeGeneratedIndexBytesForHash,
  normalizeTextBytesForHash,
  stableStringify,
  renderComponentMarkdown,
  renderFileMarkdown,
};
