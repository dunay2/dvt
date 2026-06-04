/** Owned concern: guard Canvas workbench tab architecture, documentation, and visual-posture semantics. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

describe('Canvas workbench tabs architecture', () => {
  it('documents semantic API, stories, canonical analysis, and owned-concern modules', () => {
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
    const legacyRetirementGuide = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-legacy-retirement-component.md'
      ),
      'utf8'
    );
    const legacyRetirementStories = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-legacy-retirement-user-stories.md'
      ),
      'utf8'
    );
    const tabsRemediationPlan = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-fowler-remediation-plan-20260504.md'
      ),
      'utf8'
    );
    const stage1Plan = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/planning/proposals/mandatory/frontend-and-ux/canvas-workbench-stage-1-chrome-simplification-implementation-plan-20260506.md'
      ),
      'utf8'
    );
    const cypressSpec = readFileSync(
      path.join(APP_ROOT, '../../cypress/e2e/canvas/canvas-workbench-tabs.cy.ts'),
      'utf8'
    );
    const legacyRetirementCanon = `${legacyRetirementGuide}\n${legacyRetirementStories}`;

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
      'CanvasWorkbenchTabScope',
      'isCanvasWorkbenchTabAvailableForContext',
      'workspace',
      'semantic icon',
      'US-CANVAS-WORKBENCH-001',
      'US-CANVAS-WORKBENCH-007',
      'canvas-workbench-tab-strip-component.md',
      'canvas-workbench-command-query-catalog.md',
      'canvas-workbench-tabs-user-stories.md',
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
      'semantic icon',
      'US-CANVAS-WORKBENCH-010',
      'US-CANVAS-WORKBENCH-013',
    ]) {
      expect(tabStripComponentGuide).toContain(requiredTabStripGuideSection);
    }

    for (const requiredLegacyRetirementGuideSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Legacy Retirement Diagram',
      '```mermaid',
      'createCanvasGraphWorkbenchTab',
      'CanvasShell',
      'useCanvasController',
      'GraphCanvas.tsx',
      'US-CANVAS-LEGACY-001',
    ]) {
      expect(legacyRetirementGuide).toContain(requiredLegacyRetirementGuideSection);
    }

    for (const requiredLegacyRetirementStory of [
      'US-CANVAS-LEGACY-001',
      'US-CANVAS-LEGACY-002',
      'US-CANVAS-LEGACY-003',
      'US-CANVAS-LEGACY-004',
      '## Scenario Matrix',
    ]) {
      expect(legacyRetirementStories).toContain(requiredLegacyRetirementStory);
    }

    for (const requiredTabsPlanSignal of [
      'canvasWorkbenchTabs.architecture.test.ts',
      'CanvasWorkbenchTabsReadModel',
      'ListCanvasWorkbenchTabs',
      'SelectCanvasWorkbenchTab',
      'Code And Documentation Drift',
    ]) {
      expect(tabsRemediationPlan).toContain(requiredTabsPlanSignal);
    }

    for (const requiredStage1PlanSignal of [
      'shell-context-relocation',
      'CanvasWorkbenchTabStrip',
      'canvas-workbench-tabs.cy.ts',
      'workspace-context-read-only-main-screen',
    ]) {
      expect(stage1Plan).toContain(requiredStage1PlanSignal);
    }

    for (const requiredLegacyRetirementSignal of [
      'Canvas Legacy Retirement Component',
      'GraphCanvas.tsx',
      'US-CANVAS-LEGACY-001',
      '## Scenario Matrix',
    ]) {
      expect(legacyRetirementCanon).toContain(requiredLegacyRetirementSignal);
    }

    for (const requiredCypressProof of [
      'assertCanvasWorkbenchTabsAreHeaderScoped',
      'assertCanvasWorkbenchTabsUseControlledIcons',
      'left-navigation-rail',
      'app-shell-outlet',
      "querySelectorAll('svg')",
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
    expect(tabStripSource).not.toMatch(/tab\.icon(?!Name)/);
    expect(tabStripSource).toContain('renderCanvasWorkbenchTabIcon');
    expect(tabStripSource).not.toContain('truncate');
    expect(tabStripSource).not.toContain('min-w-0');
    expect(playgroundTabStripSource).not.toContain('CanvasWorkbenchTabsReadModel');
  });

  it('keeps tab icons Canvas-owned instead of leaking plugin icon placement', () => {
    const tabsSource = readAppSource('views/canvas/canvasWorkbenchTabs.ts');
    const tabStripSource = readAppSource('views/canvas/CanvasWorkbenchTabStrip.tsx');
    const cypressSpec = readFileSync(
      path.join(APP_ROOT, '../../cypress/e2e/canvas/canvas-workbench-tabs.cy.ts'),
      'utf8'
    );

    expect(tabsSource).toContain('type CanvasWorkbenchTabReadModel');
    expect(tabsSource).toContain('label: string');
    expect(tabsSource).toContain('iconName: CanvasWorkbenchTabIconName');
    expect(tabsSource).toContain('function resolveCanvasWorkbenchTabIconName(');
    expect(tabStripSource).toContain('tabsState: CanvasWorkbenchTabsReadModel');
    expect(tabStripSource).toContain('tab.label');
    expect(tabStripSource).toContain("from 'lucide-react'");
    expect(tabStripSource).not.toMatch(/tab\.icon(?!Name)/);
    expect(tabStripSource).toContain('renderCanvasWorkbenchTabIcon');
    expect(cypressSpec).toContain('assertCanvasWorkbenchTabsUseControlledIcons');
    expect(cypressSpec).toContain("querySelectorAll('svg')");
  });

  it('keeps Canvas workbench tabs as flat graph-workspace chrome instead of route-frame pills', () => {
    const tabStripSource = readAppSource('views/canvas/CanvasWorkbenchTabStrip.tsx');

    expect(tabStripSource).not.toContain('routeWorkbenchTabListClassName');
    expect(tabStripSource).not.toContain('routeWorkbenchTabTriggerClassName');
    expect(tabStripSource).not.toContain('rounded-lg border-[color:var(--border-default)]');
    expect(tabStripSource).not.toContain('data-[state=active]:shadow-sm');
    expect(tabStripSource).toContain('data-[state=active]:border-[color:var(--focus-ring)]');
    expect(tabStripSource).toContain('rounded-none');
  });

  it('keeps host canvas tabs visually secondary to the flat graph-workspace chrome', () => {
    const hostTabStripSource = readAppSource('views/canvas/CanvasPlaygroundTabStrip.templates.tsx');

    expect(hostTabStripSource).not.toContain('routeWorkbenchTabListClassName');
    expect(hostTabStripSource).not.toContain('routeWorkbenchTabTriggerClassName');
    expect(hostTabStripSource).not.toContain('rounded-md px-3 py-2');
    expect(hostTabStripSource).toContain('data-[state=active]:border-[color:var(--focus-ring)]');
    expect(hostTabStripSource).toContain('rounded-none');
  });

  it('keeps F-12 Graph retirement semantic instead of reintroducing GraphCanvas naming', () => {
    const tabsSource = readAppSource('views/canvas/canvasWorkbenchTabs.ts');
    const tabsTestSource = readAppSource('views/canvas/canvasWorkbenchTabs.test.ts');
    const routeSource = readAppSource('views/Canvas.tsx');
    const routePostureArchitectureSource = readAppSource(
      'views/canvas/canvasRoutePosturePriority.architecture.test.ts'
    );
    const shellGuide = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-shell-component.md'
      ),
      'utf8'
    );
    const routeGuide = readFileSync(
      path.join(
        APP_ROOT,
        '../../../../docs/architecture/components/web/graph/canvas-route-composition-component.md'
      ),
      'utf8'
    );

    expect(tabsSource).toContain('function createCanvasGraphWorkbenchTab(');
    expect(tabsSource).toContain('const graphTab = createCanvasGraphWorkbenchTab(copy);');
    expect(tabsSource).not.toContain('createGraphCanvasWorkbenchTab');
    expect(tabsTestSource).toContain('createCanvasGraphWorkbenchTab');
    expect(tabsTestSource).not.toContain('createGraphCanvasWorkbenchTab');
    expect(routeSource).toContain('buildCanvasShellProps');
    expect(routeSource).toContain("activeWorkbenchTab?.scope === 'workspace'");
    expect(routeSource).toContain('shouldReplaceCenterSurfaceWithWorkbenchTab');
    expect(routeSource).toContain('<CanvasShell {...shellProps} layout={layout} />');
    expect(routePostureArchitectureSource).toContain(
      "repoFileExists('apps/web/src/app/components/GraphCanvas.tsx')"
    );
    expect(shellGuide).toContain('Canvas.tsx');
    expect(shellGuide).toContain('CanvasShell');
    expect(routeGuide).toContain('Canvas.tsx');
    expect(routeGuide).toContain('buildCanvasShellProps');
    expect(shellGuide).not.toContain('GraphCanvas component owns');
    expect(routeGuide).not.toContain('GraphCanvas component owns');
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
