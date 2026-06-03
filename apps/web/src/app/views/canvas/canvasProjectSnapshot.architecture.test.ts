/** Owned concern: guard Canvas project snapshot semantic component documentation and API boundaries. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Canvas project snapshot architecture', () => {
  const appRoot = path.resolve(import.meta.dirname, '../..');
  const repoRoot = path.resolve(appRoot, '../../../..');
  const readRepoFile = (relativePathFromRepo: string): string =>
    readFileSync(path.join(repoRoot, relativePathFromRepo), 'utf8');
  const readAppSource = (relativePathFromApp: string): string =>
    readFileSync(path.join(appRoot, relativePathFromApp), 'utf8');

  it('documents Fowler analysis, user stories, local component API, and semantic ownership', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-project-snapshot-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-project-snapshot-user-stories.md'
    );
    const commandQueryCatalog = readRepoFile(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    );
    const mailboxReview = readRepoFile(
      'buzon/20260511-codex-fowler-canvas-project-snapshot-analysis-and-remediation.md'
    );

    for (const requiredGuideSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Flow',
      '## Import State Machine',
      '## Local Traceability',
      'canvasProjectSnapshot.ts',
      'canvasProjectSnapshotImportCommand.ts',
      'canvasProjectSnapshotImportCommand.test.ts',
      'canvasProjectSnapshot.test.ts',
      'canvasProjectSnapshot.architecture.test.ts',
      'canvas-project-snapshot-roundtrip.cy.ts',
      'canvas-project-snapshot-user-stories.md',
      '20260511-codex-fowler-canvas-project-snapshot-analysis-and-remediation.md',
      '```mermaid',
      'canvasProjectSnapshot.exportFile',
      'canvasProjectSnapshot.validateImport',
      'executeImportProjectSnapshotCommand',
      'ProjectSnapshot',
      'ProjectSnapshotImportReadModel',
    ]) {
      expect(componentGuide).toContain(requiredGuideSection);
    }

    for (const requiredStory of [
      'US-CANVAS-PROJECT-SNAPSHOT-001',
      'US-CANVAS-PROJECT-SNAPSHOT-010',
      '## Scenario Matrix',
      'ExportProjectSnapshot',
      'ValidateProjectImport',
      'ImportProjectSnapshot',
      'SaveWorkspaceGraphDraft',
      'malformed_json',
      'canvas_identity_mismatch',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    for (const requiredMailboxSection of [
      '## Fowler Verdict',
      '## Mature-System Comparison',
      '## Pattern Improvements',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetitions Fixed',
      '## Code And Documentation Drift',
      '## Opportunities',
      '## Lessons For Future Work',
      '## User-Story Coverage',
      '## ADR Decision',
      '```mermaid',
    ]) {
      expect(mailboxReview).toContain(requiredMailboxSection);
    }

    for (const requiredCatalogEntry of [
      'ExportProjectSnapshot',
      'ValidateProjectImport',
      'ImportProjectSnapshot',
      'ProjectSnapshot',
      'ProjectSnapshotImportReadModel',
    ]) {
      expect(commandQueryCatalog).toContain(requiredCatalogEntry);
    }
  });

  it('keeps snapshot behavior behind a namespaced semantic API and existing draft save rail', () => {
    const snapshotSource = readAppSource('views/canvas/canvasProjectSnapshot.ts');
    const importCommandSource = readAppSource('views/canvas/canvasProjectSnapshotImportCommand.ts');
    const lifecycleSource = readAppSource('views/canvas/useCanvasDraftLifecycle.ts');
    const snapshotTestSource = readAppSource('views/canvas/canvasProjectSnapshot.test.ts');
    const importCommandTestSource = readAppSource(
      'views/canvas/canvasProjectSnapshotImportCommand.test.ts'
    );
    const cypressSpec = readFileSync(
      path.join(appRoot, '../../cypress/e2e/canvas/canvas-project-snapshot-roundtrip.cy.ts'),
      'utf8'
    );

    for (const [modulePath, source] of [
      ['canvasProjectSnapshot.ts', snapshotSource],
      ['canvasProjectSnapshot.test.ts', snapshotTestSource],
      ['canvasProjectSnapshotImportCommand.ts', importCommandSource],
      ['canvasProjectSnapshotImportCommand.test.ts', importCommandTestSource],
      ['canvas-project-snapshot-roundtrip.cy.ts', cypressSpec],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(snapshotSource).toContain('export const canvasProjectSnapshot');
    expect(snapshotSource).toContain('exportFile: exportProjectSnapshot');
    expect(snapshotSource).toContain('validateImport: validateProjectImport');
    expect(snapshotSource).toContain('buildFileName: buildProjectSnapshotFileName');
    expect(lifecycleSource).toContain('canvasProjectSnapshot.exportFile');
    expect(lifecycleSource).toContain('executeImportProjectSnapshotCommand({');
    expect(lifecycleSource).not.toContain('draftRepository.saveGraphDraft({');
    expect(importCommandSource).toContain('canvasProjectSnapshot.validateImport');
    expect(importCommandSource).toContain('draftRepository.saveGraphDraft({');
    expect(lifecycleSource).not.toContain('saveWorkspaceGraphDraft(');
    expect(cypressSpec).toContain("Cypress.Buffer.from('{not-json')");
    expect(cypressSpec).toContain("expect(snapshot.format).to.equal('dvt.project-snapshot')");
    expect(cypressSpec).toContain('saveCountBeforeRejectedImport');
  });
});
