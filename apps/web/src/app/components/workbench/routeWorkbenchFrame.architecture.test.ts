/** Owned concern: guard RouteWorkbenchFrame semantic API, docs, and Fowler traceability. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../../../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoDoc(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

describe('RouteWorkbenchFrame architecture', () => {
  it('documents and enforces the semantic workbench slot contract', () => {
    const source = readAppSource('components/workbench/RouteWorkbenchFrame.tsx');
    const codeView = readAppSource('views/CodeView.tsx');
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/route-workbench-frame-component.md'
    );
    const userStories = readRepoDoc(
      'docs/architecture/components/web/route-workbench-frame-user-stories.md'
    );
    const implementationPlan = readRepoDoc(
      'docs/planning/proposals/mandatory/frontend-and-ux/f15-route-workbench-frame-semantic-slots-plan-20260521.md'
    );
    const cypressProof = readRepoDoc('apps/web/cypress/e2e/shell/route-workbench-slots.cy.ts');

    expect(source.trimStart().startsWith('/** Owned concern:')).toBe(true);
    expect(source).toContain('export type RouteWorkbenchFrameSlots');
    expect(source).not.toContain('readonly children');
    expect(source).not.toContain('LegacyChildren');
    expect(source).toContain('route-workbench-left-panel');
    expect(source).toContain('route-workbench-primary-surface');
    expect(source).toContain('route-workbench-right-panel');
    expect(source).toContain('route-workbench-bottom-drawer');

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Component Diagram',
      '```mermaid',
      'RouteWorkbenchFrameSlots',
      'leftPanel',
      'primarySurface',
      'rightPanel',
      'bottomDrawer',
      'CodeView',
      'first adopter',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }

    expect(codeView).toContain('slots={{');
    expect(codeView).toContain('leftPanel: (');
    expect(codeView).toContain('primarySurface: (');
    expect(codeView).toContain('FileTreePanel');
    expect(codeView).toContain('Code workbench local Monaco buffer');

    for (const requiredStory of [
      'US-ROUTE-WORKBENCH-FRAME-001',
      'US-ROUTE-WORKBENCH-FRAME-002',
      'US-ROUTE-WORKBENCH-FRAME-003',
      'US-ROUTE-WORKBENCH-FRAME-004',
      '## Scenario Matrix',
      '## Acceptance Coverage',
      'route-workbench-slots.cy.ts',
    ]) {
      expect(userStories).toContain(requiredStory);
    }

    for (const requiredCypressSignal of [
      'visitWithE2eWorkspaceSession',
      'route-workbench-primary-surface',
      'route-workbench-left-panel',
      'stg_orders.sql',
      'Synchronized|Sincronizado',
      'monaco-code-editor',
    ]) {
      expect(cypressProof).toContain(requiredCypressSignal);
    }

    for (const requiredPlanSignal of [
      'featureId: F15-ROUTE-WORKBENCH-FRAME-SEMANTIC-SLOTS-20260521',
      '## Fowler Opportunity Matrix',
      'fowlerSignals:',
      'Documentation drift',
      'routeWorkbenchFrame.architecture.test.ts',
    ]) {
      expect(implementationPlan).toContain(requiredPlanSignal);
    }
  });

  it('keeps direct route workbench consumers on semantic slots', () => {
    const slotConsumerPaths = [
      'views/AdminView.tsx',
      'views/ArtifactsView.tsx',
      'views/CodeView.tsx',
      'views/CostView.tsx',
      'views/DiffView.tsx',
      'views/LineageView.tsx',
      'views/PluginsView.tsx',
      'views/diff/DiffStateViews.tsx',
      'views/lineage/LineageStateViews.tsx',
    ];

    for (const relativePath of slotConsumerPaths) {
      const source = readAppSource(relativePath);

      expect(source, relativePath).toContain('<RouteWorkbenchFrame');
      expect(source, relativePath).toContain('slots={{');
      expect(source, relativePath).toContain('primarySurface:');
    }
  });
});
