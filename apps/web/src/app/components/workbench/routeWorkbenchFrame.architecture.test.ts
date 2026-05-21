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
    const fowlerAnalysis = readRepoDoc(
      'buzon/20260521-codex-fowler-route-workbench-frame-analysis-and-remediation.md'
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

    expect(cypressProof).toContain('visitWithE2eWorkspaceSession');
    expect(cypressProof).toContain('route-workbench-primary-surface');
    expect(cypressProof).toContain('route-workbench-left-panel');
    expect(cypressProof).toContain('select 7 as slot_verified');

    for (const requiredAnalysisSection of [
      '## Mature-System Comparison',
      '## Improved Patterns',
      '## Antipatterns Detected',
      '## Component Grouping',
      '## Teachings For Future Work',
      '## Repetitions',
      '## Opportunities',
      '## Code And Documentation Drift',
      '## Applied Patterns',
      '## ADR Decision',
    ]) {
      expect(fowlerAnalysis).toContain(requiredAnalysisSection);
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
