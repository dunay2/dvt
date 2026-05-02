#!/usr/bin/env node
/**
 * Generate the actionable governance remediation queue from coverage indexes.
 */

const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '..');
const statusDir = path.join(repoRoot, 'docs', 'planning', 'status');
const coverageReportPath = path.join(statusDir, 'system-governance-coverage-report.coverage.yaml');
const fileIndexPath = path.join(statusDir, 'system-governance-file-index.files.yaml');
const componentIndexPath = path.join(
  statusDir,
  'system-governance-component-index.components.yaml'
);
const documentMapPath = path.join(statusDir, 'system-governance-document-unit-map.docs.yaml');
const queueYamlPath = path.join(statusDir, 'system-governance-remediation-queue.queue.yaml');
const queueMarkdownPath = path.join(statusDir, 'system-governance-remediation-queue-20260502.md');

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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function groupBy(entries, keyFn) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyFn(entry);
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function sortByPath(entries) {
  return [...entries].sort((left, right) => String(left.path).localeCompare(String(right.path)));
}

function componentById(components) {
  return new Map(components.map((component) => [component.id, component]));
}

function classifyPriority(type, component, count) {
  if (type === 'drift-removal') {
    return 'P0';
  }

  if (type === 'cq-rail-gap') {
    return 'P1';
  }

  if (type === 'component-subdivision' && count >= 250) {
    return 'P1';
  }

  if (type === 'doc-alignment' && count >= 25) {
    return 'P2';
  }

  if (component?.status === 'drift') {
    return 'P1';
  }

  return 'P3';
}

function isSpecificRail(cqRails) {
  const value = String(cqRails || '');
  if (value.toLowerCase().startsWith('none -')) {
    return true;
  }

  return /\b[A-Z]{2,}-[CQ]\d+\b/.test(value);
}

function taskId(type, componentId) {
  return `GRQ-${type.toUpperCase().replace(/-/g, '_')}-${componentId}`;
}

function taskValidation(type) {
  const common = [
    'pnpm docs:governance:remediation-queue:check',
    'pnpm docs:governance:coverage-report:check',
  ];

  if (type === 'drift-removal') {
    return [...common, 'pnpm docs:governance:changed-files:check'];
  }

  if (type === 'component-subdivision' || type === 'cq-rail-gap') {
    return [...common, 'pnpm docs:governance:file-component-index:check'];
  }

  return [...common, 'pnpm docs:governance:document-unit-map:check'];
}

function buildTask({
  type,
  component,
  files = [],
  documents = [],
  reason,
  blocking = 'reporting-only',
}) {
  const fileRows = sortByPath(files).map((file) => ({
    path: file.path,
    fileId: file.fileId,
    status: file.unitStatus,
  }));
  const documentRows = sortByPath(documents).map((doc) => ({
    path: doc.path,
    classification: doc.classification,
  }));
  const workItemCount = fileRows.length + documentRows.length || component?.fileCount || 0;

  return {
    id: taskId(type, component.id),
    type,
    priority: classifyPriority(type, component, workItemCount),
    componentUnit: component.id,
    rootUnit: component.rootUnit,
    domainUnit: component.domainUnit,
    dddOwner: component.dddOwner,
    cqRails: component.cqRails,
    blocking,
    reason,
    fileCount: fileRows.length,
    documentCount: documentRows.length,
    files: fileRows,
    documents: documentRows,
    expectedValidation: taskValidation(type),
  };
}

function buildDriftTasks(files, componentsById) {
  const driftFilesByComponent = groupBy(
    files.filter((file) => file.isDrift || file.unitStatus === 'drift'),
    (file) => file.componentUnit || file.owningUnit
  );

  return [...driftFilesByComponent.entries()].map(([componentId, filesForComponent]) => {
    const component = componentsById.get(componentId) || {
      id: componentId,
      rootUnit: filesForComponent[0]?.rootUnit || 'UNOWNED',
      domainUnit: filesForComponent[0]?.domainUnit || 'UNOWNED',
      dddOwner: filesForComponent[0]?.dddOwner || 'N/A',
      cqRails: filesForComponent[0]?.cqRails || 'unknown',
      status: filesForComponent[0]?.unitStatus || 'unknown',
      fileCount: filesForComponent.length,
    };

    return buildTask({
      type: 'drift-removal',
      component,
      files: filesForComponent,
      reason: 'Files are marked drift in the governed file index.',
      blocking: 'changed-files gate blocks touched drift files',
    });
  });
}

function buildSubdivisionTasks(components) {
  return components
    .filter((component) => component.childrenRequired)
    .map((component) =>
      buildTask({
        type: 'component-subdivision',
        component,
        reason: 'Component is known but still too broad for source-level governance.',
      })
    );
}

function buildRailGapTasks(components) {
  return components
    .filter((component) => component.childrenRequired && !isSpecificRail(component.cqRails))
    .map((component) =>
      buildTask({
        type: 'cq-rail-gap',
        component,
        reason: 'Component has generic command/query language instead of specific rail rows.',
      })
    );
}

function buildDocumentAlignmentTasks(documents, componentsById) {
  const driftDocsBySubject = groupBy(
    documents.filter((doc) => ['tracks drift', 'needs disposition'].includes(doc.classification)),
    (doc) => doc.subjectUnit || doc.documentOwnerUnit || 'SYS-DOCS-GOVERNANCE-ROOT'
  );

  return [...driftDocsBySubject.entries()]
    .filter(([, docs]) => docs.length > 0)
    .map(([subjectUnit, docs]) => {
      const component = componentsById.get(subjectUnit) || {
        id: subjectUnit,
        rootUnit: 'SYS-DVT',
        domainUnit: subjectUnit,
        dddOwner: 'INFRA',
        cqRails: 'documentation alignment',
        status: 'review',
        fileCount: 0,
      };

      return buildTask({
        type: 'doc-alignment',
        component,
        documents: docs,
        reason:
          'Documents track drift or require disposition and need alignment with active units.',
      });
    });
}

function buildFingerprintReviewTasks(coverageReport, componentsById) {
  const changed = Number(coverageReport?.totals?.fingerprintChangedFiles || 0);
  if (changed <= 0) {
    return [];
  }

  const component = componentsById.get('SYS-DOCS-GOVERNANCE-ROOT') ||
    componentsById.values().next().value || {
      id: 'SYS-DOCS-GOVERNANCE-ROOT',
      rootUnit: 'SYS-DVT',
      domainUnit: 'SYS-DVT',
      dddOwner: 'INFRA',
      cqRails: 'repository governance',
      status: 'review',
      fileCount: changed,
    };

  return [
    buildTask({
      type: 'fingerprint-review',
      component,
      reason: 'Fingerprint impact report has changed files awaiting review.',
      blocking: 'fingerprint baseline gate blocks unaccepted state changes',
    }),
  ];
}

function sortTasks(tasks) {
  const priorityRank = new Map([
    ['P0', 0],
    ['P1', 1],
    ['P2', 2],
    ['P3', 3],
  ]);
  const typeRank = new Map([
    ['drift-removal', 0],
    ['cq-rail-gap', 1],
    ['component-subdivision', 2],
    ['doc-alignment', 3],
    ['fingerprint-review', 4],
  ]);

  return [...tasks].sort(
    (left, right) =>
      (priorityRank.get(left.priority) ?? 9) - (priorityRank.get(right.priority) ?? 9) ||
      (typeRank.get(left.type) ?? 9) - (typeRank.get(right.type) ?? 9) ||
      right.fileCount + right.documentCount - (left.fileCount + left.documentCount) ||
      left.componentUnit.localeCompare(right.componentUnit)
  );
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

function buildRemediationQueue({ coverageReport, fileIndex, componentIndex, documentMap }) {
  const files = asArray(fileIndex.files);
  const components = asArray(componentIndex.components);
  const documents = asArray(documentMap.documents);
  const componentsById = componentById(components);
  const tasks = sortTasks([
    ...buildDriftTasks(files, componentsById),
    ...buildRailGapTasks(components),
    ...buildSubdivisionTasks(components),
    ...buildDocumentAlignmentTasks(documents, componentsById),
    ...buildFingerprintReviewTasks(coverageReport, componentsById),
  ]);

  return {
    version: 1,
    generatedFrom: [
      'docs/planning/status/system-governance-coverage-report.coverage.yaml',
      'docs/planning/status/system-governance-file-index.files.yaml',
      'docs/planning/status/system-governance-component-index.components.yaml',
      'docs/planning/status/system-governance-document-unit-map.docs.yaml',
    ],
    totals: {
      tasks: tasks.length,
      p0: tasks.filter((task) => task.priority === 'P0').length,
      p1: tasks.filter((task) => task.priority === 'P1').length,
      p2: tasks.filter((task) => task.priority === 'P2').length,
      p3: tasks.filter((task) => task.priority === 'P3').length,
      driftFiles: coverageReport?.totals?.driftFiles || 0,
      componentsRequiringSubdivision: coverageReport?.totals?.componentsRequiringSubdivision || 0,
    },
    byType: countBy(tasks, 'type'),
    byPriority: countBy(tasks, 'priority'),
    tasks,
  };
}

function renderTaskRows(tasks) {
  if (tasks.length === 0) {
    return '| _None_ | _None_ | _None_ | _None_ | 0 | 0 | _None_ |';
  }

  return tasks
    .map(
      (task) =>
        `| \`${task.id}\` | \`${task.priority}\` | \`${task.type}\` | \`${task.componentUnit}\` | ${task.fileCount} | ${task.documentCount} | ${task.reason} |`
    )
    .join('\n');
}

function renderCountTable(rows, label) {
  return [
    `| ${label} | Count |`,
    '| --- | ---: |',
    ...rows.map((row) => `| \`${row.name}\` | ${row.count} |`),
  ].join('\n');
}

function renderMarkdown(queue) {
  return `---
title: System Governance Remediation Queue
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-02
planning_type: status
---

# System Governance Remediation Queue

> This page is auto-generated by \`pnpm docs:governance:remediation-queue\`. Do not edit manually.

## Purpose

This queue turns the governance coverage report into ordered work. It groups
drift files, oversized components, generic command/query rail language, and
drift-tracking documents into concrete remediation tasks with DDD ownership,
command/query posture, affected files or documents, and expected validation.

Machine-readable source:

- [system-governance-remediation-queue.queue.yaml](./system-governance-remediation-queue.queue.yaml)

## Totals

- Tasks: ${queue.totals.tasks}
- P0 tasks: ${queue.totals.p0}
- P1 tasks: ${queue.totals.p1}
- P2 tasks: ${queue.totals.p2}
- P3 tasks: ${queue.totals.p3}
- Drift files represented: ${queue.totals.driftFiles}
- Components requiring subdivision: ${queue.totals.componentsRequiringSubdivision}

## By Type

<!-- prettier-ignore-start -->
${renderCountTable(queue.byType, 'Type')}
<!-- prettier-ignore-end -->

## By Priority

<!-- prettier-ignore-start -->
${renderCountTable(queue.byPriority, 'Priority')}
<!-- prettier-ignore-end -->

## Queue

<!-- prettier-ignore-start -->
| Task | Priority | Type | Component | Files | Docs | Reason |
| --- | --- | --- | --- | ---: | ---: | --- |
${renderTaskRows(queue.tasks)}
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance Coverage Report](./system-governance-coverage-report-20260502.md)
- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Component Index](./system-governance-component-index-20260501.md)
- [System Governance Document Unit Map](./system-governance-document-unit-map-20260501.md)
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
  const queue = buildRemediationQueue({
    coverageReport: readYaml(coverageReportPath),
    fileIndex: readYaml(fileIndexPath),
    componentIndex: readYaml(componentIndexPath),
    documentMap: readYaml(documentMapPath),
  });

  return {
    queue,
    yaml: renderYaml(queue),
    markdown: renderMarkdown(queue),
  };
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const outputs = buildOutputs();
  const changed = [
    writeIfChanged(queueYamlPath, outputs.yaml),
    writeIfChanged(queueMarkdownPath, outputs.markdown),
  ].some(Boolean);

  if (checkOnly && changed) {
    console.error('[docs:governance:remediation-queue] FAILED');
    console.error('Governance remediation queue was stale. Regenerate and commit outputs.');
    process.exitCode = 1;
    return;
  }

  console.log(
    `[docs:governance:remediation-queue] tasks=${outputs.queue.totals.tasks} p0=${outputs.queue.totals.p0} p1=${outputs.queue.totals.p1} p2=${outputs.queue.totals.p2} p3=${outputs.queue.totals.p3}`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  buildRemediationQueue,
  buildDriftTasks,
  buildSubdivisionTasks,
  buildRailGapTasks,
  buildDocumentAlignmentTasks,
  classifyPriority,
  isSpecificRail,
  renderMarkdown,
};
