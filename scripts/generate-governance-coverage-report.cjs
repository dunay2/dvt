#!/usr/bin/env node
/**
 * Generate the governance coverage report from canonical file/component indexes.
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const statusDir = path.join(repoRoot, 'docs', 'planning', 'status');
const fileIndexPath = path.join(statusDir, 'system-governance-file-index.files.yaml');
const componentIndexPath = path.join(
  statusDir,
  'system-governance-component-index.components.yaml'
);
const coverageYamlPath = path.join(statusDir, 'system-governance-coverage-report.coverage.yaml');
const coverageMarkdownPath = path.join(statusDir, 'system-governance-coverage-report-20260502.md');

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function renderYaml(payload) {
  return yaml.dump(payload, {
    lineWidth: 100,
    noRefs: true,
    sortKeys: false,
  });
}

function countBy(entries, key) {
  const counts = new Map();
  for (const entry of entries) {
    const value = entry[key] || 'unknown';
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([name, count]) => ({ name, count }));
}

function countGovernanceDocuments(files) {
  const counts = new Map();

  for (const file of files) {
    for (const source of Array.isArray(file.governance) ? file.governance : []) {
      counts.set(source, (counts.get(source) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([path, fileCount]) => ({ path, fileCount }));
}

function buildComponentCoverage(files, components) {
  const filesByComponent = new Map();
  for (const file of files) {
    const key = file.componentUnit || 'UNOWNED';
    filesByComponent.set(key, (filesByComponent.get(key) || 0) + 1);
  }

  return components
    .map((component) => {
      const fileCount = filesByComponent.get(component.id) || component.fileCount || 0;
      return {
        id: component.id,
        name: component.name,
        rootUnit: component.rootUnit,
        domainUnit: component.domainUnit,
        status: component.status,
        governanceState: component.governanceState || 'unknown',
        canonicalRole: component.canonicalRole || 'unknown',
        evidenceState: component.evidenceState || 'unknown',
        dddOwner: component.dddOwner,
        cqRails: component.cqRails,
        fileCount,
        isDrift: Boolean(component.isDrift),
        isLegacy: Boolean(component.isLegacy),
        childrenRequired: Boolean(component.childrenRequired),
        governance: Array.isArray(component.governance) ? component.governance : [],
      };
    })
    .sort(
      (left, right) =>
        right.fileCount - left.fileCount ||
        String(left.rootUnit).localeCompare(String(right.rootUnit)) ||
        String(left.id).localeCompare(String(right.id))
    );
}

function buildOpenGovernanceFindings(files, components) {
  const unownedFiles = files
    .filter((file) => file.owningUnit === 'UNOWNED')
    .map((file) => file.path)
    .sort();
  const driftFiles = files
    .filter((file) => file.isDrift)
    .map((file) => ({
      path: file.path,
      owningUnit: file.owningUnit,
      status: file.unitStatus,
      componentUnit: file.componentUnit,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const legacyFiles = files
    .filter((file) => file.isLegacy)
    .map((file) => ({
      path: file.path,
      owningUnit: file.owningUnit,
      status: file.unitStatus,
      componentUnit: file.componentUnit,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const componentsRequiringSubdivision = components
    .filter((component) => component.childrenRequired)
    .map((component) => ({
      id: component.id,
      fileCount: component.fileCount,
      status: component.status,
      dddOwner: component.dddOwner,
    }))
    .sort((left, right) => right.fileCount - left.fileCount || left.id.localeCompare(right.id));

  return {
    unownedFiles,
    driftFiles,
    legacyFiles,
    componentsRequiringSubdivision,
  };
}

function buildCoverageReport(fileIndex, componentIndex) {
  const files = Array.isArray(fileIndex.files) ? fileIndex.files : [];
  const components = Array.isArray(componentIndex.components) ? componentIndex.components : [];
  const governedFiles = files.filter(
    (file) =>
      file.owningUnit !== 'UNOWNED' && Array.isArray(file.governance) && file.governance.length > 0
  );
  const ungovernedFiles = files.filter((file) => !governedFiles.includes(file));
  const driftFiles = files.filter((file) => file.isDrift);
  const legacyFiles = files.filter((file) => file.isLegacy);
  const findings = buildOpenGovernanceFindings(files, components);

  return {
    version: 1,
    generatedFrom: [
      'docs/planning/status/system-governance-file-index.files.yaml',
      'docs/planning/status/system-governance-component-index.components.yaml',
    ],
    totals: {
      files: files.length,
      governedFiles: governedFiles.length,
      ungovernedFiles: ungovernedFiles.length,
      driftFiles: driftFiles.length,
      legacyFiles: legacyFiles.length,
      components: components.length,
      componentsRequiringSubdivision: findings.componentsRequiringSubdivision.length,
    },
    ciPosture: {
      blockingStatus:
        ungovernedFiles.length === 0 && driftFiles.length === 0 ? 'clean' : 'gaps-present',
      blockingReason:
        ungovernedFiles.length === 0 && driftFiles.length === 0
          ? 'coverage report is clean'
          : 'coverage report exposes governance gaps',
      enforcedBy: [
        'pnpm docs:governance:coverage-report:check',
        'pnpm docs:governance:changed-files:check',
        'pnpm docs:governance:file-fingerprint-baseline:check',
      ],
      reportingOnly: [
        'componentsRequiringSubdivision records known large units for follow-up decomposition',
        'legacyFiles records removal targets until owning work removes them',
      ],
    },
    byRootUnit: countBy(files, 'rootUnit'),
    byDomainUnit: countBy(files, 'domainUnit'),
    byComponentUnit: countBy(files, 'componentUnit'),
    byStatus: countBy(files, 'unitStatus'),
    byGovernanceState: countBy(files, 'governanceState'),
    byCanonicalRole: countBy(files, 'canonicalRole'),
    byEvidenceState: countBy(files, 'evidenceState'),
    byDddOwner: countBy(files, 'dddOwner'),
    governanceDocuments: countGovernanceDocuments(files),
    componentCoverage: buildComponentCoverage(files, components),
    findings,
  };
}

function renderCountTable(rows, label) {
  return [
    `| ${label} | Files |`,
    '| --- | ---: |',
    ...rows.map((row) => `| \`${row.name}\` | ${row.count} |`),
  ].join('\n');
}

function renderFileFindingRows(rows) {
  if (rows.length === 0) {
    return '| _None_ | _None_ | _None_ | _None_ |';
  }

  return rows
    .map(
      (row) =>
        `| \`${row.path}\` | \`${row.owningUnit}\` | \`${row.componentUnit}\` | \`${row.status}\` |`
    )
    .join('\n');
}

function renderComponentRows(rows) {
  if (rows.length === 0) {
    return '| _None_ | 0 | _None_ | _None_ |';
  }

  return rows
    .map((row) => `| \`${row.id}\` | ${row.fileCount} | \`${row.status}\` | \`${row.dddOwner}\` |`)
    .join('\n');
}

function renderGovernanceRows(rows) {
  return rows
    .slice(0, 25)
    .map((row) => `| \`${row.path}\` | ${row.fileCount} |`)
    .join('\n');
}

function renderMarkdown(report) {
  return `---
title: System Governance Coverage Report
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-02
planning_type: status
---

# System Governance Coverage Report

> This page is auto-generated by \`pnpm docs:governance:coverage-report\`. Do not edit manually.

## Purpose

This report aggregates the canonical file and component governance indexes into
one reviewer-facing control surface. It answers how many files exist, how many
are governed, where drift or legacy remains, which component owns each cluster,
and which checks enforce the current posture.

Machine-readable source:

- [system-governance-coverage-report.coverage.yaml](./system-governance-coverage-report.coverage.yaml)

Upstream indexes:

- [system-governance-file-index.files.yaml](./system-governance-file-index.files.yaml)
- [system-governance-component-index.components.yaml](./system-governance-component-index.components.yaml)
- [system-governance-file-fingerprint-baseline.yaml](./system-governance-file-fingerprint-baseline.yaml)

## Totals

- Files: ${report.totals.files}
- Governed files: ${report.totals.governedFiles}
- Ungoverned files: ${report.totals.ungovernedFiles}
- Drift files: ${report.totals.driftFiles}
- Legacy files: ${report.totals.legacyFiles}
- Components/source units: ${report.totals.components}
- Components requiring subdivision: ${report.totals.componentsRequiringSubdivision}

## CI Posture

- Blocking status: ${report.ciPosture.blockingStatus}
- Blocking reason: ${report.ciPosture.blockingReason}
- Enforced by: ${report.ciPosture.enforcedBy.map((command) => `\`${command}\``).join(', ')}
- Reporting-only posture: ${report.ciPosture.reportingOnly.join('; ')}

## By Root Unit

<!-- prettier-ignore-start -->
${renderCountTable(report.byRootUnit, 'Root unit')}
<!-- prettier-ignore-end -->

## By Domain Unit

<!-- prettier-ignore-start -->
${renderCountTable(report.byDomainUnit, 'Domain unit')}
<!-- prettier-ignore-end -->

## By DDD Owner

<!-- prettier-ignore-start -->
${renderCountTable(report.byDddOwner, 'DDD owner')}
<!-- prettier-ignore-end -->

## By Status

<!-- prettier-ignore-start -->
${renderCountTable(report.byStatus, 'Status')}
<!-- prettier-ignore-end -->

## By Governance State

<!-- prettier-ignore-start -->
${renderCountTable(report.byGovernanceState, 'Governance state')}
<!-- prettier-ignore-end -->

## By Canonical Role

<!-- prettier-ignore-start -->
${renderCountTable(report.byCanonicalRole, 'Canonical role')}
<!-- prettier-ignore-end -->

## By Evidence State

<!-- prettier-ignore-start -->
${renderCountTable(report.byEvidenceState, 'Evidence state')}
<!-- prettier-ignore-end -->

## Drift Files

<!-- prettier-ignore-start -->
| File | Owning unit | Component | Status |
| --- | --- | --- | --- |
${renderFileFindingRows(report.findings.driftFiles)}
<!-- prettier-ignore-end -->

## Legacy Files

<!-- prettier-ignore-start -->
| File | Owning unit | Component | Status |
| --- | --- | --- | --- |
${renderFileFindingRows(report.findings.legacyFiles)}
<!-- prettier-ignore-end -->

## Components Requiring Subdivision

<!-- prettier-ignore-start -->
| Component | Files | Status | DDD owner |
| --- | ---: | --- | --- |
${renderComponentRows(report.findings.componentsRequiringSubdivision)}
<!-- prettier-ignore-end -->

## Top Governance Sources

<!-- prettier-ignore-start -->
| Governance source | Files |
| --- | ---: |
${renderGovernanceRows(report.governanceDocuments)}
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Component Index](./system-governance-component-index-20260501.md)
- [System Governance File Fingerprint Impact](./system-governance-file-fingerprint-impact-20260501.md)
- [Governance Document And Rule Inventory](./governance-document-rule-inventory.md)
`;
}

function writeIfChanged(filePath, content) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  if (current === content) {
    return false;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

function buildOutputs() {
  const report = buildCoverageReport(readYaml(fileIndexPath), readYaml(componentIndexPath));
  return {
    report,
    yaml: renderYaml(report),
    markdown: renderMarkdown(report),
  };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const outputs = buildOutputs();
  const changed = [
    writeIfChanged(coverageYamlPath, outputs.yaml),
    writeIfChanged(coverageMarkdownPath, outputs.markdown),
  ].some(Boolean);

  if (checkOnly && changed) {
    console.error('[docs:governance:coverage-report] FAILED');
    console.error('Governance coverage report was stale. Regenerate and commit outputs.');
    process.exitCode = 1;
    return;
  }

  console.log(
    `[docs:governance:coverage-report] files=${outputs.report.totals.files} governed=${outputs.report.totals.governedFiles} ungoverned=${outputs.report.totals.ungovernedFiles} drift=${outputs.report.totals.driftFiles} legacy=${outputs.report.totals.legacyFiles}`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildCoverageReport,
  buildComponentCoverage,
  buildOpenGovernanceFindings,
  countGovernanceDocuments,
  renderMarkdown,
};
