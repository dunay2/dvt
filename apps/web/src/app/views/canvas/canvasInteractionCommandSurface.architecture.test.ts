/** Owned concern: guard Canvas contextual interaction semantics, docs, and Fowler traceability. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Canvas interaction command surface architecture', () => {
  const appRoot = path.resolve(import.meta.dirname, '../..');
  const repoRoot = path.resolve(appRoot, '../../../..');
  const readRepoFile = (relativePath: string): string =>
    readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const readAppSource = (relativePathFromApp: string): string =>
    readFileSync(path.join(appRoot, relativePathFromApp), 'utf8');

  it('documents the public API, invariants, transitions, consumers, stories, and Fowler analysis', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-user-stories.md'
    );
    const mailbox = readRepoFile(
      'buzon/20260602-codex-fowler-canvas-interaction-command-surface-analysis.md'
    );
    const commandQueryCatalog = readRepoFile(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Flow',
      '```mermaid',
      'CanvasContextMenuModel',
      'ResolveCanvasContextMenu',
      'CreateCanvasAuthoringNode',
      'RemoveCanvasEdgeFromContext',
      'canvasInteractionCommandSurface.ts',
      'CanvasViewport.tsx',
      'canvasAuthoringNodeCommand.ts',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const requiredStory of [
      'US-CANVAS-INTERACTION-001',
      'US-CANVAS-INTERACTION-002',
      'US-CANVAS-INTERACTION-003',
      'US-CANVAS-INTERACTION-004',
      'US-CANVAS-INTERACTION-005',
      '## Scenario Matrix',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    for (const requiredMailboxSection of [
      '## Fowler Reading',
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetitions Fixed',
      '## Code And Documentation Drift',
      '## Opportunities',
      '## Teachings For Future Work',
      '## ADR Decision',
    ]) {
      expect(mailbox).toContain(requiredMailboxSection);
    }

    for (const requiredRail of [
      'ResolveCanvasContextMenu',
      'CreateCanvasAuthoringNode',
      'RemoveCanvasEdgeFromContext',
      'CanvasContextMenuModel',
      'CanvasNodeAdmissionCommand',
      'CanvasEdgeRemovalChange',
    ]) {
      expect(commandQueryCatalog).toContain(requiredRail);
    }
  });

  it('keeps contextual gestures as presentation adapters over semantic model and lifecycle rails', () => {
    const modelSource = readAppSource('views/canvas/canvasInteractionCommandSurface.ts');
    const viewportSource = readAppSource('views/canvas/CanvasViewport.tsx');
    const authoringCommandSource = readAppSource('views/canvas/canvasAuthoringNodeCommand.ts');

    for (const [modulePath, source] of [
      ['views/canvas/canvasInteractionCommandSurface.ts', modelSource],
      ['views/canvas/CanvasViewport.tsx', viewportSource],
      ['views/canvas/canvasAuthoringNodeCommand.ts', authoringCommandSource],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(modelSource).toContain('buildCanvasContextMenuModel');
    expect(modelSource).toContain('buildCanvasEdgeContextRemovalChange');
    expect(modelSource).not.toContain("from 'react'");
    expect(modelSource).not.toContain('useState');
    expect(modelSource).not.toContain('ReactFlow');
    expect(viewportSource).toContain('onPaneContextMenu={handlePaneContextMenu}');
    expect(viewportSource).toContain('onEdgeContextMenu={handleEdgeContextMenu}');
    expect(viewportSource).toContain('buildCanvasContextMenuModel');
    expect(viewportSource).toContain('buildCanvasEdgeContextRemovalChange');
    expect(viewportSource).not.toContain("type: 'remove'");
    expect(authoringCommandSource).toContain('requestedPosition ??');
  });
});
