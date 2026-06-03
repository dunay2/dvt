import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { readArchitectureSiblingSource } from '../architecture.test.support';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');

function readDoc(relativePathFromRepo: string): string {
  return readFileSync(path.join(APP_ROOT, '../../../..', relativePathFromRepo), 'utf8');
}

describe('Canvas layout persistence architecture', () => {
  it('documents local C&Q ownership, stories, mailbox analysis, and draft-authority boundaries', () => {
    const componentGuide = readDoc(
      'docs/architecture/components/web/graph/canvas-layout-persistence-component.md'
    );
    const userStories = readDoc(
      'docs/architecture/components/web/graph/canvas-layout-persistence-user-stories.md'
    );
    const commandQueryCatalog = readDoc(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    );
    const mailboxReview = readDoc(
      'buzon/20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Command And Query Rails',
      '## Transitions',
      '## Consumers',
      '## Fowler Reading',
      '## Negative Coverage',
      '## Drift To Watch',
      '## Local Traceability',
      'canvas-layout-persistence-user-stories.md',
      'canvas-workbench-command-query-catalog.md',
      '20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const requiredStory of [
      'US-CANVAS-LAYOUT-001',
      'US-CANVAS-LAYOUT-008',
      '## Scenario Matrix',
      'ResolveCanvasNodeInitialPosition',
      'ConfigureCanvasViewportPreferences',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    for (const requiredCatalogSection of [
      'PersistCanvasLayout',
      'GetCanvasLayout',
      'ConfigureCanvasViewportPreferences',
      'CanvasViewportPreferences',
      '## Exhaustiveness Rule',
    ]) {
      expect(commandQueryCatalog).toContain(requiredCatalogSection);
    }

    expect(mailboxReview).toContain('## Code And Documentation Drift');
    expect(componentGuide).toContain('must not import draft-authoring ports');
    expect(componentGuide).toContain('not in the protected draft');
    expect(componentGuide).toContain('not in protected graph drafts');
  });

  it('keeps layout persistence modules behind owned-concern docblocks and away from draft writes', () => {
    const layoutPersistenceSource = readArchitectureSiblingSource(
      import.meta.dirname,
      'useCanvasLayoutPersistence.ts'
    );
    const layoutHydrationPolicySource = readArchitectureSiblingSource(
      import.meta.dirname,
      'canvasDraftLayoutHydrationPolicy.ts'
    );
    const viewportGraphModelSource = readArchitectureSiblingSource(
      import.meta.dirname,
      'useCanvasViewportGraphModel.ts'
    );

    for (const [modulePath, source] of [
      ['useCanvasLayoutPersistence.ts', layoutPersistenceSource],
      ['canvasDraftLayoutHydrationPolicy.ts', layoutHydrationPolicySource],
      ['useCanvasViewportGraphModel.ts', viewportGraphModelSource],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(layoutPersistenceSource).not.toContain('saveWorkspaceGraphDraft');
    expect(layoutPersistenceSource).not.toContain('useWorkspaceGraphDraftSave');
    expect(layoutPersistenceSource).not.toContain('workspaceService');
    expect(viewportGraphModelSource).not.toContain('saveWorkspaceGraphDraft');
  });
});
