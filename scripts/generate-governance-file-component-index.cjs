#!/usr/bin/env node
/**
 * Owned concern: generate governance file and component indexes from repository files.
 *
 * Generate the global governance file and component indexes.
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const { sha256Hex, sha256HexUtf8 } = require('@dvt/crypto');
const { buildOwnerMatcher, readManifest } = require('./check-governance-unit-coverage.cjs');
const {
  generatedStatusDir,
  governanceGeneratedPath,
  repoRelative,
  repoRoot,
  toPosix,
} = require('./governance-generated-paths.cjs');

const statusDir = generatedStatusDir;
const shardDir = path.join(statusDir, 'governance-files');
const componentShardDir = path.join(statusDir, 'governance-components');
const fileYamlPath = governanceGeneratedPath('system-governance-file-index.files.yaml');
const fileMarkdownPath = governanceGeneratedPath('system-governance-file-index-20260501.md');
const componentYamlPath = governanceGeneratedPath(
  'system-governance-component-index.components.yaml'
);
const componentMarkdownPath = governanceGeneratedPath(
  'system-governance-component-index-20260501.md'
);
const componentFileMapYamlPath = governanceGeneratedPath(
  'system-governance-component-file-map.components.yaml'
);
const componentFileMapMarkdownPath = governanceGeneratedPath(
  'system-governance-component-file-map-20260503.md'
);
const fingerprintBaselinePath = path.join(
  statusDir,
  'system-governance-file-fingerprint-baseline.yaml'
);
const fingerprintImpactReportPath = path.join(
  statusDir,
  'system-governance-file-fingerprint-impact-20260501.md'
);

const generatedFileYamlRelativePath = repoRelative(fileYamlPath);
const generatedComponentFileMapYamlRelativePath = toPosix(
  path.relative(repoRoot, componentFileMapYamlPath)
);
const generatedShardDirRelativePath = repoRelative(shardDir);
const generatedComponentShardDirRelativePath = repoRelative(componentShardDir);
const fingerprintBaselineRelativePath = repoRelative(fingerprintBaselinePath);
const fingerprintImpactReportRelativePath = repoRelative(fingerprintImpactReportPath);

function compareText(left, right) {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
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

function readGitFileList(args) {
  const output = execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(toPosix);
}

function filterExistingRepositoryFiles(files, options = {}) {
  const fileExists =
    options.fileExists ||
    ((filePath) => fs.existsSync(path.join(repoRoot, ...filePath.split('/'))));

  return files.filter((filePath) => fileExists(filePath));
}

function getRepositoryFiles() {
  const repositoryFiles = [...readGitFileList(['ls-files'])];

  for (const filePath of readGitFileList(['ls-files', '--others', '--exclude-standard'])) {
    if (!repositoryFiles.includes(filePath)) {
      repositoryFiles.push(filePath);
    }
  }

  return filterExistingRepositoryFiles(repositoryFiles).sort();
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

const semanticUnitFields = [
  'ownedConcern',
  'responsibilities',
  'nonGoals',
  'reasonsToChange',
  'publicApi',
  'invariants',
  'transitions',
  'consumers',
];

function addNonEmptyField(target, source, field) {
  const value = source[field];
  if (Array.isArray(value)) {
    if (value.length > 0) {
      target[field] = value;
    }
    return;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (trimmedValue.length > 0) {
      target[field] = value;
    }
    return;
  }

  if (value !== undefined && value !== null) {
    target[field] = value;
  }
}

function buildSemanticUnitFields(unit) {
  const fields = {};
  for (const field of semanticUnitFields) {
    addNonEmptyField(fields, unit, field);
  }
  return fields;
}

function buildUnitReferences(unitPath) {
  return unitPath.map((unit) => ({
    id: unit.id,
    name: unit.name || unit.id,
    level: unit.level || 'unknown',
    status: unit.status || 'unknown',
    governance: unit.governance || [],
    ...buildSemanticUnitFields(unit),
  }));
}

function findUnitByLevel(unitPath, level) {
  return unitPath.find((unit) => unit.level === level)?.id;
}

function findLastUnitByLevel(unitPath, level) {
  return [...unitPath].reverse().find((unit) => unit.level === level)?.id;
}

function buildHierarchy(unit, unitById) {
  const unitPath = buildUnitPath(unit, unitById);
  const rootUnit = unitPath[0]?.id || unit?.id || 'UNOWNED';
  const componentUnit = findLastUnitByLevel(unitPath, 'component') || unit?.id || 'UNOWNED';
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

  if (
    filePath === generatedFileYamlRelativePath ||
    filePath === generatedComponentFileMapYamlRelativePath ||
    filePath === fingerprintBaselineRelativePath ||
    filePath.startsWith(`${generatedShardDirRelativePath}/`) ||
    filePath.startsWith(`${generatedComponentShardDirRelativePath}/`)
  ) {
    return normalizeGeneratedIndexBytesForHash(contentBytes);
  }

  if (filePath === fingerprintImpactReportRelativePath) {
    return Buffer.from('dvt:generated-fingerprint-impact-report:v1\n', 'utf8');
  }

  return contentBytes;
}

function buildGovernancePayload(entry) {
  return {
    canonicalRole: entry.canonicalRole,
    componentUnit: entry.componentUnit,
    cqRails: entry.cqRails,
    dddOwner: entry.dddOwner,
    domainUnit: entry.domainUnit,
    evidenceState: entry.evidenceState,
    governance: entry.governance,
    governanceState: entry.governanceState,
    isDrift: entry.isDrift,
    isLegacy: entry.isLegacy,
    ownerLevel: entry.ownerLevel,
    owningUnit: entry.owningUnit,
    rootUnit: entry.rootUnit,
    unitPath: entry.unitPath,
    unitStatus: entry.unitStatus,
  };
}

function deriveGovernanceSemantics(unitStatus, ownerLevel) {
  const status = unitStatus || 'unowned';

  if (status === 'canonical') {
    return {
      governanceState: 'governed',
      canonicalRole:
        ownerLevel === 'component' || ownerLevel === 'source'
          ? 'implementation-owner'
          : 'governance-owner',
      evidenceState: 'classification-only',
    };
  }

  if (status === 'coverage-required') {
    return {
      governanceState: 'coverage-required',
      canonicalRole: 'none',
      evidenceState: 'coverage-required',
    };
  }

  if (status === 'drift' || status === 'legacy') {
    return {
      governanceState: status,
      canonicalRole: 'none',
      evidenceState: 'remediation-required',
    };
  }

  if (status === 'review') {
    return {
      governanceState: 'review',
      canonicalRole: 'none',
      evidenceState: 'review-required',
    };
  }

  if (status === 'superseded') {
    return {
      governanceState: 'superseded',
      canonicalRole: 'none',
      evidenceState: 'retired',
    };
  }

  return {
    governanceState: 'ungoverned',
    canonicalRole: 'none',
    evidenceState: 'remediation-required',
  };
}

function buildFileFingerprints(filePath, contentBytes, governancePayload) {
  const pathHash = sha256HexUtf8(`dvt:file-path:v1:${filePath}`);
  const contentHash = sha256Hex(contentBytes);
  const governanceHash = sha256HexUtf8(stableStringify(governancePayload));

  return {
    fileId: `F-${sha256HexUtf8(`dvt:file:v1:${filePath}`).slice(0, 12).toUpperCase()}`,
    pathHash,
    contentHash,
    governanceHash,
    stateFingerprint: sha256HexUtf8(
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
  const ownerMatcher = options.ownerMatcher || buildOwnerMatcher(units);

  return files.map((filePath) => {
    const matches = ownerMatcher(filePath);
    const owner = matches[0];
    const hierarchy = buildHierarchy(owner, unitById);
    const semantics = deriveGovernanceSemantics(owner?.status, owner?.level || 'unowned');
    const entry = {
      path: filePath,
      owningUnit: owner?.id || 'UNOWNED',
      rootUnit: hierarchy.rootUnit,
      domainUnit: hierarchy.domainUnit,
      componentUnit: hierarchy.componentUnit,
      unitPath: hierarchy.unitPath,
      ownerLevel: owner?.level || 'unowned',
      unitStatus: owner?.status || 'unowned',
      ...semantics,
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
      const semantics = deriveGovernanceSemantics(unit.status, unit.level);
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
        ...semantics,
        isDrift: unit.status === 'drift',
        isLegacy: unit.status === 'legacy',
        childrenRequired: Boolean(unit.childrenRequired),
        fileCount: fileCountByUnit.get(unit.id) || 0,
        dddOwner: unit.dddOwner || 'N/A',
        cqRails: unit.cqRails || 'none',
        owns: unit.owns || [],
        excludes: unit.excludes || [],
        ...buildSemanticUnitFields(unit),
        governance: unit.governance || [],
        fowlerSignals: unit.fowlerSignals || [],
      };
    })
    .sort((left, right) => compareText(left.id, right.id));
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    counts.set(entry[key], (counts.get(entry[key]) || 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => compareText(String(left), String(right)))
    .map(([name, count]) => ({ name, count }));
}

function renderYaml(payload) {
  return yaml.dump(payload, {
    lineWidth: 1000,
    noRefs: true,
    sortKeys: false,
  });
}

function shardIdForFileEntry(entry) {
  return entry.unitPath?.[1] || entry.domainUnit || entry.rootUnit || 'UNOWNED';
}

function buildShardPayload(shardId, files) {
  return {
    version: 1,
    shardId,
    generatedFrom: 'git ls-files plus untracked non-ignored local files',
    unitManifest: 'docs/planning/status/system-governance-unit-index.units.yaml',
    fileCount: files.length,
    files,
  };
}

function buildFileIndexManifest(fileEntries, options = {}) {
  const shardDirectory = options.shardDirectory || generatedShardDirRelativePath;
  const entriesByShard = new Map();

  for (const entry of fileEntries) {
    const shardId = shardIdForFileEntry(entry);
    const shardEntries = entriesByShard.get(shardId) || [];
    shardEntries.push(entry);
    entriesByShard.set(shardId, shardEntries);
  }

  const shards = {};
  const shardRows = [...entriesByShard.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([shardId, entries]) => {
      const files = [...entries].sort((left, right) => compareText(left.path, right.path));
      const shardPath = `${shardDirectory}/${shardId}.files.yaml`;
      const payload = buildShardPayload(shardId, files);
      const content = renderYaml(payload);

      shards[shardPath] = payload;

      return {
        id: shardId,
        path: shardPath,
        fileCount: files.length,
        contentHash: sha256HexUtf8(content),
      };
    });

  return {
    manifest: {
      version: 1,
      generatedFrom: 'git ls-files plus untracked non-ignored local files',
      unitManifest: 'docs/planning/status/system-governance-unit-index.units.yaml',
      shardDirectory,
      fileCount: fileEntries.length,
      shards: shardRows,
    },
    shards,
  };
}

function componentShardPath(componentId, shardDirectory) {
  return `${shardDirectory}/${componentId}.component-files.yaml`;
}

function buildComponentFileRows(files) {
  return [...files]
    .sort((left, right) => compareText(left.path, right.path))
    .map((file) => ({
      path: file.path,
      fileId: file.fileId,
      owningUnit: file.owningUnit,
      unitStatus: file.unitStatus,
      governanceState: file.governanceState,
      isDrift: Boolean(file.isDrift),
      isLegacy: Boolean(file.isLegacy),
    }));
}

function buildComponentFileShardPayload(component, files) {
  const fileRows = buildComponentFileRows(files);

  return {
    version: 1,
    componentUnit: component.id,
    rootUnit: component.rootUnit,
    domainUnit: component.domainUnit,
    status: component.status,
    governanceState: component.governanceState,
    dddOwner: component.dddOwner,
    cqRails: component.cqRails,
    childrenRequired: Boolean(component.childrenRequired),
    fileCount: fileRows.length,
    driftFileCount: fileRows.filter((file) => file.isDrift).length,
    legacyFileCount: fileRows.filter((file) => file.isLegacy).length,
    files: fileRows,
  };
}

function buildComponentFileMapManifest(componentEntries, fileEntries, options = {}) {
  const shardDirectory = options.shardDirectory || generatedComponentShardDirRelativePath;
  const filesByComponent = new Map();
  for (const entry of fileEntries) {
    const componentId = entry.owningUnit || entry.componentUnit || 'UNOWNED';
    const files = filesByComponent.get(componentId) || [];
    files.push(entry);
    filesByComponent.set(componentId, files);
  }

  const shards = {};
  const componentRows = [...componentEntries]
    .sort((left, right) => compareText(left.id, right.id))
    .map((component) => {
      const files = filesByComponent.get(component.id) || [];
      const shardPath = componentShardPath(component.id, shardDirectory);
      const payload = buildComponentFileShardPayload(component, files);
      const content = renderYaml(payload);

      shards[shardPath] = payload;

      return {
        id: component.id,
        path: shardPath,
        fileCount: payload.fileCount,
        driftFileCount: payload.driftFileCount,
        legacyFileCount: payload.legacyFileCount,
        contentHash: sha256HexUtf8(content),
      };
    });

  return {
    manifest: {
      version: 1,
      generatedFrom: [generatedFileYamlRelativePath, repoRelative(componentYamlPath)],
      shardDirectory,
      componentCount: componentRows.length,
      fileCount: componentRows.reduce((sum, component) => sum + component.fileCount, 0),
      components: componentRows,
    },
    shards,
  };
}

function expandComponentFileMapFromManifest(manifest, shardsByPath) {
  const componentRows = Array.isArray(manifest.components) ? manifest.components : [];
  const components = [];
  const seenComponentIds = new Set();
  let fileCount = 0;

  for (const component of componentRows) {
    if (seenComponentIds.has(component.id)) {
      throw new Error(
        `Duplicate component shard in governance component file map: ${component.id}`
      );
    }
    seenComponentIds.add(component.id);

    const shardPayload = shardsByPath[component.path];
    if (!shardPayload) {
      throw new Error(`Missing governance component shard: ${component.path}`);
    }
    if (shardPayload.componentUnit !== component.id) {
      throw new Error(
        `Governance component shard ${component.path} declares ${shardPayload.componentUnit} but manifest expected ${component.id}`
      );
    }

    const files = Array.isArray(shardPayload.files) ? shardPayload.files : [];
    if (component.fileCount !== files.length || shardPayload.fileCount !== files.length) {
      throw new Error(
        `Governance component shard ${component.path} expected ${component.fileCount} files but contained ${files.length}`
      );
    }

    for (const file of files) {
      if (file.componentUnit && file.componentUnit !== component.id) {
        throw new Error(
          `File ${file.path} is in component shard ${component.id} but belongs to ${file.componentUnit}`
        );
      }
    }

    fileCount += files.length;
    components.push(shardPayload);
  }

  if (manifest.componentCount !== components.length) {
    throw new Error(
      `Governance component file manifest expected ${manifest.componentCount} components but shards contained ${components.length}`
    );
  }

  if (manifest.fileCount !== fileCount) {
    throw new Error(
      `Governance component file manifest expected ${manifest.fileCount} files but shards contained ${fileCount}`
    );
  }

  return components;
}

function expandFileIndexFromManifest(manifest, shardsByPath, options = {}) {
  if (Array.isArray(manifest.files)) {
    return manifest.files;
  }

  const shardRows = Array.isArray(manifest.shards) ? manifest.shards : [];
  const files = [];
  const seenPaths = new Set();

  for (const shard of shardRows) {
    const shardPayload = shardsByPath[shard.path];
    if (!shardPayload) {
      throw new Error(`Missing governance shard: ${shard.path}`);
    }

    const shardFiles = Array.isArray(shardPayload.files) ? shardPayload.files : [];
    if (shard.fileCount !== shardFiles.length) {
      throw new Error(
        `Governance shard ${shard.path} expected ${shard.fileCount} files but contained ${shardFiles.length}`
      );
    }

    for (const file of shardFiles) {
      if (seenPaths.has(file.path)) {
        throw new Error(`Duplicate file path in governance shards: ${file.path}`);
      }
      seenPaths.add(file.path);
      files.push(file);
    }
  }

  if (manifest.fileCount !== files.length) {
    throw new Error(
      `Governance file manifest expected ${manifest.fileCount} files but shards contained ${files.length}`
    );
  }

  if (options.expectedPaths) {
    for (const expectedPath of options.expectedPaths) {
      if (!seenPaths.has(expectedPath)) {
        throw new Error(`Missing file path from governance shards: ${expectedPath}`);
      }
    }
  }

  return files;
}

function readFileIndexFromDisk(manifestPath = fileYamlPath, options = {}) {
  const manifest = yaml.load(fs.readFileSync(manifestPath, 'utf8'));
  if (Array.isArray(manifest.files)) {
    return manifest.files;
  }

  const shardsByPath = {};
  for (const shard of Array.isArray(manifest.shards) ? manifest.shards : []) {
    const shardPath = path.join(repoRoot, shard.path);
    const content = fs.readFileSync(shardPath, 'utf8');
    if (shard.contentHash && sha256HexUtf8(content) !== shard.contentHash) {
      throw new Error(`Governance shard hash mismatch: ${shard.path}`);
    }
    shardsByPath[shard.path] = yaml.load(content);
  }

  return expandFileIndexFromManifest(manifest, shardsByPath, options);
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
  const governanceStateCounts = countBy(fileEntries, 'governanceState');
  const canonicalRoleCounts = countBy(fileEntries, 'canonicalRole');
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
machine-readable source is the compact manifest plus deterministic shard files:

- [system-governance-file-index.files.yaml](./system-governance-file-index.files.yaml)
- [governance-files/](./governance-files/)
- [system-governance-file-fingerprint-baseline.yaml](./system-governance-file-fingerprint-baseline.yaml)

Every tracked repository file and every untracked non-ignored local file has
one row in exactly one shard during local generation. Each row
records the stable file id, path hash, content hash, governance hash, state
fingerprint, root unit, domain unit, component unit, owning unit, unit path,
governing documents, DDD owner, command/query rail posture, drift status, and
legacy status. The root manifest records shard paths, counts, and hashes. The
fingerprint baseline is the accepted drift-control snapshot used by CI.

Fowler semantics are split from the raw unit status: \`unitStatus: canonical\`
means the file belongs to a governed owner classification. It does not by
itself prove verified semantic maturity. \`governanceState\`,
\`canonicalRole\`, and \`evidenceState\` carry that distinction explicitly.

## Totals

- Repository files indexed: ${fileEntries.length}
- Component/source owner units: ${componentEntries.length}
- Ungoverned files: ${unowned.length}
- Drift files: ${fileEntries.filter((entry) => entry.isDrift).length}
- Legacy files: ${fileEntries.filter((entry) => entry.isLegacy).length}

## By Status

<!-- prettier-ignore-start -->
${renderCountTable(statusCounts, 'Status')}
<!-- prettier-ignore-end -->

## By Governance State

<!-- prettier-ignore-start -->
${renderCountTable(governanceStateCounts, 'Governance state')}
<!-- prettier-ignore-end -->

## By Canonical Role

<!-- prettier-ignore-start -->
${renderCountTable(canonicalRoleCounts, 'Canonical role')}
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
- [System Governance Component File Map](./system-governance-component-file-map-20260503.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
- [System Governance Document Unit Map](./system-governance-document-unit-map-20260501.md)
`;
}

function renderComponentMarkdown(componentEntries) {
  const statusCounts = countBy(componentEntries, 'status');
  const governanceStateCounts = countBy(componentEntries, 'governanceState');
  const canonicalRoleCounts = countBy(componentEntries, 'canonicalRole');
  const levelCounts = countBy(componentEntries, 'level');
  const oversized = componentEntries
    .filter((entry) => entry.childrenRequired && entry.fileCount > 100)
    .sort((left, right) => right.fileCount - left.fileCount);

  const componentRows = componentEntries
    .map(
      (entry) =>
        `| \`${entry.id}\` | \`${entry.level}\` | \`${entry.status}\` | \`${entry.governanceState}\` | \`${entry.canonicalRole}\` | \`${entry.evidenceState}\` | ${entry.fileCount} | \`${entry.dddOwner}\` | \`${entry.parent}\` |`
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

Fowler semantics are split from raw status so \`canonical\` does not act as a
hidden authority signal. \`governanceState\` says whether the unit is governed
or remediation-bound, \`canonicalRole\` says what kind of canonical role it
plays, and \`evidenceState\` says whether the row is verified or only
classified.

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

## By Governance State

<!-- prettier-ignore-start -->
${renderCountTable(governanceStateCounts, 'Governance state')}
<!-- prettier-ignore-end -->

## By Canonical Role

<!-- prettier-ignore-start -->
${renderCountTable(canonicalRoleCounts, 'Canonical role')}
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
| Component | Level | Status | Governance state | Canonical role | Evidence state | Files | DDD owner | Parent |
| --- | --- | ---: | --- | --- | --- | ---: | --- | --- |
${componentRows}
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Component File Map](./system-governance-component-file-map-20260503.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
`;
}

function renderComponentFileMapMarkdown(componentFileMap) {
  const driftComponents = componentFileMap.manifest.components
    .filter((component) => component.driftFileCount > 0 || component.legacyFileCount > 0)
    .sort(
      (left, right) =>
        right.driftFileCount +
          right.legacyFileCount -
          (left.driftFileCount + left.legacyFileCount) || compareText(left.id, right.id)
    );
  const largestComponents = [...componentFileMap.manifest.components]
    .sort((left, right) => right.fileCount - left.fileCount || compareText(left.id, right.id))
    .slice(0, 20);

  const componentRows = componentFileMap.manifest.components
    .map(
      (component) =>
        `| \`${component.id}\` | ${component.fileCount} | ${component.driftFileCount} | ${component.legacyFileCount} | [shard](./${path.relative(statusDir, path.join(repoRoot, component.path)).replace(/\\/g, '/')}) |`
    )
    .join('\n');
  const driftRows = driftComponents
    .map(
      (component) =>
        `| \`${component.id}\` | ${component.fileCount} | ${component.driftFileCount} | ${component.legacyFileCount} | [shard](./${path.relative(statusDir, path.join(repoRoot, component.path)).replace(/\\/g, '/')}) |`
    )
    .join('\n');
  const largestRows = largestComponents
    .map(
      (component) =>
        `| \`${component.id}\` | ${component.fileCount} | ${component.driftFileCount} | ${component.legacyFileCount} |`
    )
    .join('\n');

  return `---
title: System Governance Component File Map
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-03
planning_type: status
---

# System Governance Component File Map

> This page is auto-generated by \`pnpm docs:governance:file-component-index\`. Do not edit manually.

## Purpose

This map is the component-level work surface for the governed file index. It
keeps the root manifest small and writes one deterministic shard per component,
so reviewers and agents can inspect the exact files owned by a component without
opening the full repository file index.

Machine-readable sources:

- [system-governance-component-file-map.components.yaml](./system-governance-component-file-map.components.yaml)
- [governance-components/](./governance-components/)

## Totals

- Components: ${componentFileMap.manifest.componentCount}
- Files mapped: ${componentFileMap.manifest.fileCount}
- Components with drift or legacy files: ${driftComponents.length}

## Largest Components

<!-- prettier-ignore-start -->
| Component | Files | Drift files | Legacy files |
| --- | ---: | ---: | ---: |
${largestRows || '| _None_ | 0 | 0 | 0 |'}
<!-- prettier-ignore-end -->

## Drift And Legacy Components

<!-- prettier-ignore-start -->
| Component | Files | Drift files | Legacy files | Shard |
| --- | ---: | ---: | ---: | --- |
${driftRows || '| _None_ | 0 | 0 | 0 | _None_ |'}
<!-- prettier-ignore-end -->

## Component Shards

<!-- prettier-ignore-start -->
| Component | Files | Drift files | Legacy files | Shard |
| --- | ---: | ---: | ---: | --- |
${componentRows}
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Component Index](./system-governance-component-index-20260501.md)
- [System Governance Coverage Report](./system-governance-coverage-report-20260502.md)
- [System Governance Remediation Queue](./system-governance-remediation-queue-20260502.md)
`;
}

function writeIfChanged(filePath, next, options = {}) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === next) {
    return false;
  }
  if (options.checkOnly) {
    if (Array.isArray(options.changedPaths)) {
      options.changedPaths.push(toPosix(path.relative(repoRoot, filePath)));
    }
    return true;
  }
  fs.writeFileSync(filePath, next, 'utf8');
  return true;
}

function buildOutputs() {
  const manifest = readManifest();
  const units = Array.isArray(manifest.units) ? manifest.units : [];
  const unitById = buildUnitIndex(units);
  const ownerMatcher = buildOwnerMatcher(units);
  const fileEntries = buildFileEntries(getRepositoryFiles(), units, { ownerMatcher }, unitById);
  const componentEntries = buildComponentEntries(units, fileEntries, unitById);
  const fileIndex = buildFileIndexManifest(fileEntries);
  const componentFileMap = buildComponentFileMapManifest(componentEntries, fileEntries);
  const componentIndexManifest = {
    version: 1,
    generatedFrom: 'docs/planning/status/system-governance-unit-index.units.yaml',
    fileIndex: generatedFileYamlRelativePath,
    componentCount: componentEntries.length,
    components: componentEntries,
  };

  return {
    fileEntries,
    componentEntries,
    fileIndexManifest: fileIndex.manifest,
    fileIndexShardPayloads: fileIndex.shards,
    fileYaml: renderYaml(fileIndex.manifest),
    fileShards: Object.fromEntries(
      Object.entries(fileIndex.shards).map(([shardPath, payload]) => [
        shardPath,
        renderYaml(payload),
      ])
    ),
    componentIndexManifest,
    componentYaml: renderYaml(componentIndexManifest),
    componentFileMapManifest: componentFileMap.manifest,
    componentFileMapShardPayloads: componentFileMap.shards,
    componentFileMapYaml: renderYaml(componentFileMap.manifest),
    componentFileMapShards: Object.fromEntries(
      Object.entries(componentFileMap.shards).map(([shardPath, payload]) => [
        shardPath,
        renderYaml(payload),
      ])
    ),
    fileMarkdown: renderFileMarkdown(fileEntries, componentEntries),
    componentMarkdown: renderComponentMarkdown(componentEntries),
    componentFileMapMarkdown: renderComponentFileMapMarkdown(componentFileMap),
  };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const outputs = buildOutputs();
  fs.mkdirSync(shardDir, { recursive: true });
  fs.mkdirSync(componentShardDir, { recursive: true });
  const changedPaths = [];
  const writeOptions = { checkOnly, changedPaths };
  const shardWrites = Object.entries(outputs.fileShards).map(([relativePath, content]) =>
    writeIfChanged(path.join(repoRoot, relativePath), content, writeOptions)
  );
  const componentShardWrites = Object.entries(outputs.componentFileMapShards).map(
    ([relativePath, content]) =>
      writeIfChanged(path.join(repoRoot, relativePath), content, writeOptions)
  );
  const changed = [
    writeIfChanged(fileYamlPath, outputs.fileYaml, writeOptions),
    ...shardWrites,
    writeIfChanged(fileMarkdownPath, outputs.fileMarkdown, writeOptions),
    writeIfChanged(componentYamlPath, outputs.componentYaml, writeOptions),
    writeIfChanged(componentMarkdownPath, outputs.componentMarkdown, writeOptions),
    writeIfChanged(componentFileMapYamlPath, outputs.componentFileMapYaml, writeOptions),
    ...componentShardWrites,
    writeIfChanged(componentFileMapMarkdownPath, outputs.componentFileMapMarkdown, writeOptions),
  ].some(Boolean);

  if (checkOnly && changed) {
    console.error('[docs:governance:file-component-index] FAILED');
    console.error('File/component governance indexes were stale. Regenerate and commit outputs.');
    for (const changedPath of changedPaths.slice(0, 50)) {
      console.error(`- ${changedPath}`);
    }
    if (changedPaths.length > 50) {
      console.error(`- ... ${changedPaths.length - 50} more`);
    }
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
  buildComponentFileMapManifest,
  buildFileIndexManifest,
  buildFileEntries,
  buildFileFingerprints,
  buildOutputs,
  deriveGovernanceSemantics,
  expandComponentFileMapFromManifest,
  expandFileIndexFromManifest,
  filterExistingRepositoryFiles,
  normalizeGeneratedIndexBytesForHash,
  normalizeTextBytesForHash,
  renderComponentFileMapMarkdown,
  readFileIndexFromDisk,
  stableStringify,
  renderComponentMarkdown,
  renderFileMarkdown,
};
