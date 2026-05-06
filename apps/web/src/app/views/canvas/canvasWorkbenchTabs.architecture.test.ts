/** Owned concern: guard Canvas workbench tab architecture, documentation, and visual-posture semantics. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

describe('Canvas workbench tabs architecture', () => {
  it('documents semantic API, stories, mailbox analysis, and owned-concern modules', () => {
    const componentGuide = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-workbench-tabs-component.md'
      ),
      'utf8'
    );
    const commandQueryCatalog = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md'
      ),
      'utf8'
    );
    const userStories = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-workbench-tabs-user-stories.md'
      ),
      'utf8'
    );
    const tabStripComponentGuide = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-workbench-tab-strip-component.md'
      ),
      'utf8'
    );
    const mailboxReview = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../buzon/20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md'
      ),
      'utf8'
    );
    const stage1MailboxReview = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../buzon/20260506-codex-fowler-canvas-workbench-stage-1-text-only-tabs-review.md'
      ),
      'utf8'
    );
    const cypressSpec = readFileSync(
      path.join(APP_ROOT, '../../cypress/e2e/canvas/canvas-workbench-tabs.cy.ts'),
      'utf8'
    );

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Local Traceability',
      '## Transitions',
      '## Consumers',
      '## User Stories',
      '## Scenario Coverage Matrix',
      '## TDD Traceability',
      '```mermaid',
      'ListCanvasWorkbenchTabs',
      'SelectCanvasWorkbenchTab',
      'CanvasWorkbenchTabsReadModel',
      'text-only',
      'US-CANVAS-WORKBENCH-001',
      'US-CANVAS-WORKBENCH-007',
      'canvas-workbench-tab-strip-component.md',
      'canvas-workbench-command-query-catalog.md',
      'canvas-workbench-tabs-user-stories.md',
      '20260504-codex-fowler-canvas-workbench-tabs-and-layout-analysis-and-remediation.md',
      '20260506-codex-fowler-canvas-workbench-stage-1-text-only-tabs-review.md',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    for (const requiredCatalogSection of [
      '## Bounded Context',
      '## Detailed Catalog',
      '## Fowler / DDD Mapping',
      '## Exhaustiveness Rule',
      'VerifyCanvasWorkbenchVisualPosture',
      'CanvasWorkbenchVisualPostureReadModel',
    ]) {
      expect(commandQueryCatalog).toContain(requiredCatalogSection);
    }

    for (const requiredStory of [
      'US-CANVAS-WORKBENCH-001',
      'US-CANVAS-WORKBENCH-009',
      'US-CANVAS-WORKBENCH-010',
      'US-CANVAS-WORKBENCH-011',
      'US-CANVAS-WORKBENCH-012',
      'US-CANVAS-WORKBENCH-013',
      '## Scenario Matrix',
      'VerifyCanvasWorkbenchVisualPosture',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    for (const requiredTabStripGuideSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Flow',
      '```mermaid',
      'CanvasWorkbenchTabStrip',
      'CanvasWorkbenchTabsReadModel',
      'CanvasWorkbenchTabReadModel',
      'CanvasWorkbenchVisualPostureReadModel',
      'Passive View',
      'text-only',
      'US-CANVAS-WORKBENCH-010',
      'US-CANVAS-WORKBENCH-013',
    ]) {
      expect(tabStripComponentGuide).toContain(requiredTabStripGuideSection);
    }

    for (const requiredMailboxSection of [
      '## Mature-System Comparison',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Repetitions',
      '## Code And Documentation Drift',
      '## ADR Decision',
    ]) {
      expect(mailboxReview).toContain(requiredMailboxSection);
    }

    for (const requiredStage1MailboxSection of [
      '## Mature-System Comparison',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Teachings For Future Work',
      '## Code And Documentation Drift',
      '## ADR Decision',
      'CanvasWorkbenchTabStrip',
      'Semantic Fitness Function',
    ]) {
      expect(stage1MailboxReview).toContain(requiredStage1MailboxSection);
    }

    for (const requiredCypressProof of [
      'assertCanvasWorkbenchTabsAreHeaderScoped',
      'assertCanvasWorkbenchTabsAreTextOnly',
      'left-navigation-rail',
      'app-shell-outlet',
      "querySelector('svg')",
      'scrollWidth',
      'clientWidth',
    ]) {
      expect(cypressSpec).toContain(requiredCypressProof);
    }

    for (const modulePath of [
      'plugins/contracts/PluginManifest.ts',
      'plugins/registry.ts',
      'shell/shellNavigationModel.ts',
      'views/canvas/canvasWorkbenchRouteState.ts',
      'views/canvas/canvasWorkbenchTabs.ts',
      'views/canvas/CanvasWorkbenchTabStrip.tsx',
      'views/canvas/CanvasWorkbenchTabPanel.tsx',
      'views/runs/CanvasRunsTabView.tsx',
      'views/canvas/canvasWorkbenchTabs.test.ts',
      'views/canvas/canvasWorkbenchTabs.architecture.test.ts',
    ]) {
      const source = readAppSource(modulePath);
      expect(source.trimStart().startsWith('/** Owned concern:'), modulePath).toBe(true);
    }

    expect(cypressSpec.trimStart().startsWith('/** Owned concern:'), 'Cypress spec').toBe(true);
  });

  it('keeps shell navigation and Canvas workbench tab query rails separated', () => {
    const registrySource = readAppSource('plugins/registry.ts');
    const shellRuntimeSource = readAppSource('shell/shellRuntimeModel.ts');
    const shellNavigationSource = readAppSource('shell/shellNavigationModel.ts');
    const tabStripSource = readAppSource('views/canvas/CanvasWorkbenchTabStrip.tsx');
    const playgroundTabStripSource = readAppSource('views/canvas/CanvasPlaygroundTabStrip.tsx');

    expect(registrySource).toContain('function getShellNavigationViews(');
    expect(registrySource).toContain('function getCanvasWorkbenchTabViews(');
    expect(registrySource).not.toContain('function getNavigationViews(');
    expect(shellRuntimeSource).toContain('getShellNavigationViews');
    expect(shellNavigationSource).not.toContain("['nav']");
    expect(tabStripSource).toContain('CanvasWorkbenchTabsReadModel');
    expect(tabStripSource).not.toContain('buildShellNavigationModel');
    expect(tabStripSource).not.toContain('tab.icon');
    expect(tabStripSource).not.toContain('const Icon');
    expect(tabStripSource).not.toContain('<Icon');
    expect(tabStripSource).not.toContain('truncate');
    expect(tabStripSource).not.toContain('min-w-0');
    expect(playgroundTabStripSource).not.toContain('CanvasWorkbenchTabsReadModel');
  });

  it('keeps Stage 1 text-only tab semantics out of plugin icon placement', () => {
    const tabsSource = readAppSource('views/canvas/canvasWorkbenchTabs.ts');
    const tabStripSource = readAppSource('views/canvas/CanvasWorkbenchTabStrip.tsx');
    const cypressSpec = readFileSync(
      path.join(APP_ROOT, '../../cypress/e2e/canvas/canvas-workbench-tabs.cy.ts'),
      'utf8'
    );

    expect(tabsSource).toContain('type CanvasWorkbenchTabReadModel');
    expect(tabsSource).toContain('label: string');
    expect(tabsSource).not.toContain('icon:');
    expect(tabStripSource).toContain('tabsState: CanvasWorkbenchTabsReadModel');
    expect(tabStripSource).toContain('tab.label');
    expect(tabStripSource).not.toContain("from 'lucide-react'");
    expect(tabStripSource).not.toContain('tab.icon');
    expect(tabStripSource).not.toContain('const Icon');
    expect(tabStripSource).not.toContain('<Icon');
    expect(cypressSpec).toContain('assertCanvasWorkbenchTabsAreTextOnly');
    expect(cypressSpec).toContain("querySelector('svg')");
  });

  it('hard-cuts the retired ViewContribution.nav field from active web sources', () => {
    const activeSources = [
      readAppSource('plugins/contracts/PluginManifest.ts'),
      readAppSource('plugins/dbt/dbtContributions.ts'),
      readAppSource('plugins/monitoring/monitoringContributions.ts'),
      readAppSource('plugins/cost/costContributions.ts'),
      readAppSource('plugins/registry.ts'),
      readAppSource('shell/shellNavigationModel.ts'),
    ];

    for (const source of activeSources) {
      expect(source).not.toContain("ViewContribution['nav']");
      expect(source).not.toContain('ViewContribution["nav"]');
      expect(source).not.toMatch(/\bnav\s*[:?]/);
    }
  });

  it('does not use alias-based bootstrap compatibility for Canvas workbench tabs', () => {
    const activeSources = [
      readAppSource('plugins/contracts/PluginManifest.ts'),
      readAppSource('plugins/dbt/dbtContributions.ts'),
      readAppSource('plugins/monitoring/monitoringContributions.ts'),
      readAppSource('views/canvas/CanvasWorkbenchTabPanel.tsx'),
      readAppSource('views/CodeView.tsx'),
      readAppSource('views/LineageView.tsx'),
      readAppSource('views/DiffView.tsx'),
      readAppSource('views/ArtifactsView.tsx'),
      readAppSource('views/runs/CanvasRunsTabView.tsx'),
    ].join('\n');

    expect(activeSources).not.toContain('routeBootstrapPublicationIds');
    expect(activeSources).not.toContain('RouteBootstrapPublicationScope');
    expect(activeSources).not.toContain('routeBootstrapPublicationScope');
    expect(activeSources).not.toContain('CODE_ROUTE_ID');
    expect(activeSources).not.toContain('LINEAGE_ROUTE_ID');
    expect(activeSources).not.toContain('DIFF_ROUTE_ID');
    expect(activeSources).not.toContain('ARTIFACTS_ROUTE_ID');
    expect(activeSources).toContain('CANVAS_WORKBENCH_ROUTE_ID');
  });
});
