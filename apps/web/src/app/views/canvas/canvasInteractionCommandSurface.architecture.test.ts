/** Owned concern: guard Canvas contextual interaction semantics, docs, and Fowler traceability. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Canvas interaction command surface architecture', () => {
  const appRoot = path.resolve(import.meta.dirname, '../..');
  const repoRoot = path.resolve(appRoot, '../../../..');
  const readRepoFile = (relativePath: string): string =>
    readFileSync(path.join(repoRoot, relativePath), 'utf8');
  const readAppSource = (relativePathFromApp: string): string =>
    readFileSync(path.join(appRoot, relativePathFromApp), 'utf8');
  const appSourceExists = (relativePathFromApp: string): boolean =>
    existsSync(path.join(appRoot, relativePathFromApp));

  it('documents the public API, invariants, transitions, consumers, stories, and Fowler analysis', () => {
    const componentGuide = readRepoFile(
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-component.md'
    );
    const userStories = readRepoFile(
      'docs/architecture/components/web/graph/canvas-interaction-command-surface-user-stories.md'
    );
    const commandQueryCatalog = readRepoFile(
      'docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
    );
    const workflowPlan = readRepoFile(
      'docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-workflow-e2e-usability-plan-20260601.md'
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

    for (const requiredCanonicalSignal of [
      '## Fowler Reading',
      '## Component Flow',
      '## Scenario Matrix',
      'canvasInteractionCommandSurface.architecture.test.ts',
      'CanvasContextMenuModel',
    ]) {
      expect(`${componentGuide}\n${userStories}\n${workflowPlan}`).toContain(
        requiredCanonicalSignal
      );
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

  it('keeps contextual gestures split into semantic model, presenter, and view template', () => {
    const modelSource = readAppSource('views/canvas/canvasInteractionCommandSurface.ts');
    const viewportSource = readAppSource('views/canvas/CanvasViewport.tsx');
    const presenterPath = 'views/canvas/useCanvasContextMenuPresenter.ts';
    const viewTemplatePath = 'views/canvas/CanvasContextMenuView.tsx';
    const authoringCommandSource = readAppSource('views/canvas/canvasAuthoringNodeCommand.ts');

    expect(appSourceExists(presenterPath), presenterPath).toBe(true);
    expect(appSourceExists(viewTemplatePath), viewTemplatePath).toBe(true);

    const presenterSource = readAppSource(presenterPath);
    const viewTemplateSource = readAppSource(viewTemplatePath);

    for (const [modulePath, source] of [
      ['views/canvas/canvasInteractionCommandSurface.ts', modelSource],
      ['views/canvas/CanvasViewport.tsx', viewportSource],
      [presenterPath, presenterSource],
      [viewTemplatePath, viewTemplateSource],
      ['views/canvas/canvasAuthoringNodeCommand.ts', authoringCommandSource],
    ] as const) {
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(modelSource).toContain('buildCanvasContextMenuModel');
    expect(modelSource).toContain('buildCanvasEdgeContextRemovalChange');
    expect(modelSource).not.toContain("from 'react'");
    expect(modelSource).not.toContain('useState');
    expect(modelSource).not.toContain('ReactFlow');

    expect(viewportSource).toContain(
      'onPaneContextMenu={contextMenuPresenter.handlePaneContextMenu}'
    );
    expect(viewportSource).toContain(
      'onEdgeContextMenu={contextMenuPresenter.handleEdgeContextMenu}'
    );
    expect(viewportSource).toContain('CanvasContextMenuView');
    expect(viewportSource).toContain('useCanvasContextMenuPresenter');
    expect(viewportSource).not.toContain('buildCanvasContextMenuModel');
    expect(viewportSource).not.toContain('buildCanvasEdgeContextRemovalChange');
    expect(viewportSource).not.toContain('CanvasContextMenuModel');
    expect(viewportSource).not.toContain('flushSync');
    expect(viewportSource).not.toContain('dataset.contextmenuAccepted');
    expect(viewportSource).not.toContain('role="menu"');
    expect(viewportSource).not.toContain('role="menuitem"');
    expect(viewportSource).not.toContain("type: 'remove'");

    expect(presenterSource).toContain('buildCanvasContextMenuModel');
    expect(presenterSource).toContain('buildCanvasEdgeContextRemovalChange');
    expect(presenterSource).toContain('useState<CanvasContextMenuModel | null>');
    expect(presenterSource).toContain('screenToFlowPosition');
    expect(presenterSource).toContain('handleCanvasAction');
    expect(presenterSource).toContain('handleCreateNodeAction');
    expect(presenterSource).toContain('handleEdgeAction');
    expect(presenterSource).not.toContain('role="menu"');
    expect(presenterSource).not.toContain('role="menuitem"');

    expect(viewTemplateSource).toContain('role="menu"');
    expect(viewTemplateSource).toContain('role="menuitem"');
    expect(viewTemplateSource).toContain('data-slot="canvas-context-menu"');
    expect(viewTemplateSource).not.toContain('buildCanvasContextMenuModel');
    expect(viewTemplateSource).not.toContain('buildCanvasEdgeContextRemovalChange');
    expect(viewTemplateSource).not.toContain('useState');
    expect(viewTemplateSource).not.toContain('useEffect');
    expect(viewTemplateSource).not.toContain('useReactFlow');

    expect(authoringCommandSource).toContain('requestedPosition ??');
  });
});
